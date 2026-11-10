/**
 * SERVICIO EMPRESARIAL (servicio de entidad) — información pública de la SUNAT
 * ----------------------------------------------------------------------------
 * Contrato (Cap. 2.2.2):
 *   Entrada : RUC, o criterios de zona (UBIGEO)
 *   Proceso : validar -> caché MySQL vigente? -> invocar SUNAT (adaptador SOAP/XML) -> transformar -> guardar
 *   Salida  : JSON con estado, condición y actividad económica (RUC) o concentración de empresas por sector (zona)
 */
const sunatAdapter = require('../integracion/sunatSoapAdapter');
const { ErrorIntegracion } = require('../integracion/invocador');
const empresarialRepository = require('../repositories/empresarialRepository');
const referenciaService = require('./referenciaService');
const parametros = require('../utils/parametros');
const ruc = require('../utils/ruc');
const { MktdTXException } = require('../exceptions');
const { exito } = require('../utils/respuesta');
const { getLogger } = require('../utils/logger');

const LOGGER = getLogger('empresarial');
const vence = (ahora) => new Date(ahora.getTime() + parametros.entero('CACHE_VIGENCIA_HORAS') * 3600000);
const vigente = (fila) => fila && new Date(fila.vigenteHasta) > new Date();

async function contribuyenteDto(c) {
  return {
    ruc: c.ruc,
    razonSocial: c.razonSocial,
    tipoContribuyente: c.tipoContribuyente,
    nombreComercial: c.nombreComercial,
    estado: c.estado,
    condicion: c.condicion,
    ciiu: c.ciiu,
    actividadEconomica: c.actividadEconomica,
    seccionCiiu: c.seccionCiiu,
    sector: await referenciaService.nombreSector(c.seccionCiiu),
    ubigeo: c.ubigeo,
    direccion: c.direccion,
    fechaInscripcion: c.fechaInscripcion,
    fechaConsulta: c.fechaConsulta,
    vigenteHasta: c.vigenteHasta,
  };
}

/** Datos del contribuyente para guardar en la tabla contribuyente */
const filaContribuyente = (d, ahora) => ({
  ruc: d.ruc,
  razonSocial: d.razonSocial || '(sin razón social)',
  tipoContribuyente: d.tipoContribuyente,
  nombreComercial: d.nombreComercial,
  estado: d.estado,
  condicion: d.condicion,
  ciiu: d.ciiu,
  actividadEconomica: d.actividadEconomica ? String(d.actividadEconomica).slice(0, 250) : null,
  seccionCiiu: d.seccionCiiu,
  ubigeo: d.ubigeo,
  direccion: d.direccion ? String(d.direccion).slice(0, 250) : null,
  fechaInscripcion: d.fechaInscripcion,
  fuente: 'SUNAT',
  fechaConsulta: ahora,
  vigenteHasta: vence(ahora),
});

/** Consulta por RUC */
async function consultarRuc(numero, { forzar = false } = {}) {
  const r = String(numero || '').trim();
  const motivo = ruc.motivoInvalido(r);
  if (motivo) throw new MktdTXException(motivo);
  const cache = await empresarialRepository.contribuyentePorRuc(r);
  if (vigente(cache) && !forzar) return { origen: 'CACHE', datos: await contribuyenteDto(cache), intentos: 0 };
  try {
    const resp = await sunatAdapter.consultarRuc(r);
    const fila = await empresarialRepository.guardarContribuyente(filaContribuyente(resp.datos, new Date()));
    return { origen: 'SUNAT', datos: await contribuyenteDto(fila), intentos: resp.intentos };
  } catch (e) {
    if (e instanceof ErrorIntegracion && cache && !e.noEncontrado) {
      return { origen: 'CACHE_VENCIDA', datos: await contribuyenteDto(cache), intentos: e.intentos, aviso: `SUNAT no respondió (${e.message}); se usa el dato guardado` };
    }
    throw e;
  }
}

async function resumenDto(resumen, muestraFilas) {
  const mapa = await referenciaService.mapaSectores();
  const total = Number(resumen.empresasActivas) || 0;
  const sectores = (resumen.sectores || [])
    .map((s) => ({
      seccionCiiu: s.seccionCiiu,
      sector: mapa[s.seccionCiiu] ? mapa[s.seccionCiiu].nombre : s.seccionCiiu,
      color: mapa[s.seccionCiiu] ? mapa[s.seccionCiiu].color : null,
      cantidad: Number(s.cantidad),
      activas: Number(s.activas),
      porcentaje: total ? Math.round((Number(s.activas) / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.activas - a.activas);
  return {
    ubigeo: resumen.ubigeo,
    totalEmpresas: Number(resumen.totalEmpresas),
    empresasActivas: Number(resumen.empresasActivas),
    empresasHabidas: Number(resumen.empresasHabidas),
    empresasBaja: Number(resumen.empresasBaja),
    sectores,
    muestra: await Promise.all(muestraFilas.map(contribuyenteDto)),
    fuente: resumen.fuente,
    fechaConsulta: resumen.fechaConsulta,
    vigenteHasta: resumen.vigenteHasta,
  };
}

/** Concentración y rubro de las empresas de una zona */
async function consultarZona(ubigeo, { forzar = false } = {}) {
  const zona = await referenciaService.resolverUbigeo(ubigeo);
  const tamMuestra = Math.max(0, Math.min(50, parametros.entero('MUESTRA_EMPRESAS')));
  const cache = await empresarialRepository.resumenPorUbigeo(zona.ubigeo);
  if (vigente(cache) && !forzar) {
    const muestra = await empresarialRepository.contribuyentesDeZona(zona.ubigeo, tamMuestra);
    return { origen: 'CACHE', datos: await resumenDto(cache, muestra), intentos: 0 };
  }
  try {
    const resp = await sunatAdapter.resumenPorUbigeo(zona.ubigeo, tamMuestra);
    const ahora = new Date();
    const d = resp.datos;
    await empresarialRepository.guardarResumen(
      {
        ubigeo: zona.ubigeo, totalEmpresas: d.totalEmpresas, empresasActivas: d.empresasActivas, empresasHabidas: d.empresasHabidas,
        empresasBaja: d.empresasBaja, fuente: 'SUNAT', fechaConsulta: ahora, vigenteHasta: vence(ahora),
      },
      d.sectores
    );
    //-- la muestra queda guardada como contribuyentes (sirve luego para Consulta RUC sin volver a llamar a la SUNAT)
    const muestra = [];
    for (const c of d.muestra) {
      try {
        muestra.push(await empresarialRepository.guardarContribuyente(filaContribuyente(c, ahora)));
      } catch (e) {
        LOGGER.warn(`No se guardó el contribuyente ${c.ruc}: ${e.message}`);
      }
    }
    const guardado = await empresarialRepository.resumenPorUbigeo(zona.ubigeo);
    return { origen: 'SUNAT', datos: await resumenDto(guardado, muestra), intentos: resp.intentos };
  } catch (e) {
    if (e instanceof ErrorIntegracion && cache && !e.noEncontrado) {
      const muestra = await empresarialRepository.contribuyentesDeZona(zona.ubigeo, tamMuestra);
      return { origen: 'CACHE_VENCIDA', datos: await resumenDto(cache, muestra), intentos: e.intentos, aviso: `SUNAT no respondió (${e.message}); se usa el dato guardado el ${new Date(cache.fechaConsulta).toLocaleString('es-PE')}` };
    }
    throw e;
  }
}

async function validarForzar(forzar) {
  if (forzar) await require('./seguridadService').validarPermiso('ANALISIS_FORZAR', 'consultar sin caché');
}

/** GET /api/v1/empresarial/ruc/:ruc */
async function ruc_(numero, forzar) {
  await validarForzar(forzar);
  const inicio = Date.now();
  const r = await consultarRuc(numero, { forzar });
  return exito({ origen: r.origen, aviso: r.aviso || null, intentos: r.intentos, tiempoMs: Date.now() - inicio, contribuyente: r.datos });
}

/** GET /api/v1/empresarial/zona/:ubigeo */
async function zona_(ubigeo, forzar) {
  await validarForzar(forzar);
  const inicio = Date.now();
  const r = await consultarZona(ubigeo, { forzar });
  return exito({ origen: r.origen, aviso: r.aviso || null, intentos: r.intentos, tiempoMs: Date.now() - inicio, empresarial: r.datos });
}

module.exports = { consultarRuc, consultarZona, ruc: ruc_, zona: zona_ };
