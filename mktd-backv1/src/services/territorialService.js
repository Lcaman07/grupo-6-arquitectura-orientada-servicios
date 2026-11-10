/**
 * SERVICIO TERRITORIAL (servicio de entidad) — información poblacional del INEI
 * ----------------------------------------------------------------------------
 * Contrato (Cap. 2.2.1):
 *   Entrada : UBIGEO de departamento, provincia o distrito
 *   Proceso : validar parámetros -> caché MySQL vigente? -> invocar INEI (adaptador REST) -> transformar -> guardar
 *   Salida  : JSON con ubicación, población e indicadores
 * Si el INEI no responde y hay un dato guardado (aunque esté vencido) se usa ese dato y se avisa (CACHE_VENCIDA).
 */
const ineiAdapter = require('../integracion/ineiRestAdapter');
const { ErrorIntegracion } = require('../integracion/invocador');
const territorialRepository = require('../repositories/territorialRepository');
const referenciaService = require('./referenciaService');
const parametros = require('../utils/parametros');
const { exito } = require('../utils/respuesta');

const num = (v) => (v === null || v === undefined ? null : Number(v));

function aDto(fila, zona) {
  return {
    ubigeo: fila.ubigeo,
    nivel: zona.nivel,
    nombreZona: zona.nombreZona,
    departamento: zona.departamento,
    provincia: zona.provincia,
    distrito: zona.distrito,
    poblacionTotal: num(fila.poblacionTotal),
    poblacionUrbana: num(fila.poblacionUrbana),
    poblacionRural: num(fila.poblacionRural),
    poblacionHombres: num(fila.poblacionHombres),
    poblacionMujeres: num(fila.poblacionMujeres),
    hogares: num(fila.hogares),
    superficieKm2: num(fila.superficieKm2),
    densidadHabKm2: num(fila.densidadHabKm2),
    edadPromedio: num(fila.edadPromedio),
    tasaPobreza: num(fila.tasaPobreza),
    pea: num(fila.pea),
    porcentajeUrbano: fila.poblacionTotal ? Math.round((fila.poblacionUrbana / fila.poblacionTotal) * 10000) / 100 : null,
    anioReferencia: fila.anioReferencia,
    fuente: fila.fuente,
    fechaConsulta: fila.fechaConsulta,
    vigenteHasta: fila.vigenteHasta,
  };
}

/**
 * @returns {Promise<{origen:string, datos:object, intentos:number, aviso?:string}>}
 */
async function consultar(ubigeo, { forzar = false } = {}) {
  const zona = await referenciaService.resolverUbigeo(ubigeo);
  const cache = await territorialRepository.porUbigeo(zona.ubigeo);
  if (cache && !forzar && new Date(cache.vigenteHasta) > new Date()) {
    return { origen: 'CACHE', datos: aDto(cache, zona), intentos: 0 };
  }
  try {
    const r = await ineiAdapter.consultarIndicadores(zona.ubigeo);
    const ahora = new Date();
    const fila = await territorialRepository.guardar({
      ...r.datos,
      ubigeo: zona.ubigeo,
      nivel: zona.nivel,
      departamento: zona.departamento,
      provincia: zona.provincia,
      distrito: zona.distrito,
      fechaConsulta: ahora,
      vigenteHasta: new Date(ahora.getTime() + parametros.entero('CACHE_VIGENCIA_HORAS') * 3600000),
    });
    return { origen: 'INEI', datos: aDto(fila, zona), intentos: r.intentos };
  } catch (e) {
    if (e instanceof ErrorIntegracion && cache && !e.noEncontrado) {
      return { origen: 'CACHE_VENCIDA', datos: aDto(cache, zona), intentos: e.intentos, aviso: `INEI no respondió (${e.message}); se usa el dato guardado el ${new Date(cache.fechaConsulta).toLocaleString('es-PE')}` };
    }
    throw e;
  }
}

/** GET /api/v1/territorial/indicadores/:ubigeo (consumo directo del servicio, sin orquestar) */
async function indicadores(ubigeo, forzar) {
  if (forzar) await require('./seguridadService').validarPermiso('ANALISIS_FORZAR', 'consultar sin caché');
  const inicio = Date.now();
  const r = await consultar(ubigeo, { forzar });
  return exito({ origen: r.origen, aviso: r.aviso || null, intentos: r.intentos, tiempoMs: Date.now() - inicio, territorial: r.datos });
}

module.exports = { consultar, indicadores };
