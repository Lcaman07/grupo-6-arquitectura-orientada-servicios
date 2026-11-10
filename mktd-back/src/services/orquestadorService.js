/**
 * SERVICIO ORQUESTADOR — "Análisis de zona" (Cap. 2.2.4 y 2.4)
 * ----------------------------------------------------------------------------
 * Flujo BPMN:
 *   Inicio (dashboard) -> validar zona -> GATEWAY PARALELO
 *        ├─ Servicio Territorial  (INEI  · REST/JSON)
 *        └─ Servicio Empresarial  (SUNAT · SOAP/XML)
 *   -> GATEWAY DE CONVERGENCIA (espera ambos con Promise.allSettled)
 *   -> consolidar (índices) -> persistir en MySQL -> Fin: un único JSON para el dashboard
 *
 * Orquestación (no coreografía): el dashboard hace UNA llamada y aquí se decide qué invocar.
 * Manejo de fallas: si un servicio falla el resultado es PARCIAL e indica cuál falló; si fallan los dos, FALLIDO.
 * No se requiere SAGA: INEI y SUNAT solo se LEEN; la única escritura es local (MySQL) y si falla solo se informa.
 */
const territorialService = require('./territorialService');
const empresarialService = require('./empresarialService');
const referenciaService = require('./referenciaService');
const { validarPermiso } = require('./seguridadService');
const analisisRepository = require('../repositories/analisisRepository');
const parametros = require('../utils/parametros');
const indice = require('../utils/indiceAtractivo');
const { exito } = require('../utils/respuesta');
const { getLogger } = require('../utils/logger');

const LOGGER = getLogger('orquestador');

/** Ejecuta una rama y mide su tiempo; nunca lanza (el error queda en el resultado) */
async function rama(nombre, fn) {
  const inicio = Date.now();
  try {
    const r = await fn();
    return { ok: true, ...r, tiempoMs: Date.now() - inicio };
  } catch (e) {
    LOGGER.warn(`Rama ${nombre} falló: ${e.message}`);
    return {
      ok: false,
      origen: 'ERROR',
      datos: null,
      intentos: e.intentos || 1,
      error: e.servicio ? `${e.servicio}: ${e.message}` : e.msjError || e.message,
      tiempoMs: Date.now() - inicio,
    };
  }
}

/**
 * POST /api/v1/analisis/zona  { ubigeo, seccionInteres?, forzar? }
 */
async function analizarZona(request) {
  const inicio = Date.now();
  const traza = [];
  const paso = (nombre, detalle) => traza.push({ paso: nombre, detalle, ms: Date.now() - inicio });

  //-- 1. Validación de la solicitud
  const forzar = request.forzar === true;
  if (forzar) await validarPermiso('ANALISIS_FORZAR', 'consultar sin caché');
  const zona = await referenciaService.resolverUbigeo(request.ubigeo);
  const seccionInteres = await referenciaService.validarSector(request.seccionInteres);
  paso('Solicitud validada', `${zona.nivel} ${zona.nombreZona} (UBIGEO ${zona.ubigeo})${seccionInteres ? ` · rubro ${seccionInteres}` : ''}${forzar ? ' · sin caché' : ''}`);

  //-- 2. Gateway paralelo: Territorial y Empresarial no dependen uno del otro
  paso('Gateway paralelo', 'Se invocan Territorial (INEI) y Empresarial (SUNAT) al mismo tiempo');
  const [t, e] = await Promise.all([
    rama('Territorial', () => territorialService.consultar(zona.ubigeo, { forzar })),
    rama('Empresarial', () => empresarialService.consultarZona(zona.ubigeo, { forzar })),
  ]);
  paso('Servicio Territorial', t.ok ? `${t.origen} en ${t.tiempoMs} ms${t.intentos > 1 ? ` (${t.intentos} intentos)` : ''}` : `ERROR: ${t.error}`);
  paso('Servicio Empresarial', e.ok ? `${e.origen} en ${e.tiempoMs} ms${e.intentos > 1 ? ` (${e.intentos} intentos)` : ''}` : `ERROR: ${e.error}`);

  //-- 3. Gateway de convergencia: consolidar
  const estado = t.ok && e.ok ? 'COMPLETO' : t.ok || e.ok ? 'PARCIAL' : 'FALLIDO';
  const ind = indice.calcular(t.datos, e.datos, {
    seccionInteres,
    pesoDemanda: parametros.decimal('PESO_DEMANDA'),
    pesoCompetencia: parametros.decimal('PESO_COMPETENCIA'),
    pesoPoder: parametros.decimal('PESO_PODER_ADQUISITIVO'),
    referenciaPorMil: parametros.decimal('REFERENCIA_EMPRESAS_MIL'),
  });
  const pob = t.datos ? t.datos.poblacionTotal : null;
  if (e.datos) {
    e.datos.sectores.forEach((s) => { s.porMilHabitantes = pob ? Math.round((s.activas / pob) * 100000) / 100 : null; });
  }
  const avisos = [t.aviso, e.aviso, t.ok ? null : `Territorial: ${t.error}`, e.ok ? null : `Empresarial: ${e.error}`].filter(Boolean);
  if (estado !== 'COMPLETO') avisos.push('El índice de atractivo necesita las dos fuentes: no se calculó.');
  paso('Gateway de convergencia', `Estado ${estado}${ind.indiceAtractivo !== null ? ` · índice ${ind.indiceAtractivo} (${ind.nivelAtractivo})` : ''}`);

  const tiempoTotalMs = Date.now() - inicio;

  //-- 4. Persistencia local (si falla se informa; no se compensa nada en INEI ni SUNAT)
  let idAnalisisZona = null;
  let fecha = new Date();
  try {
    const fila = await analisisRepository.crear(
      {
        ubigeo: zona.ubigeo,
        nivel: zona.nivel,
        nombreZona: zona.nombreZona.slice(0, 250),
        seccionInteres,
        poblacionTotal: pob,
        densidadHabKm2: t.datos ? t.datos.densidadHabKm2 : null,
        tasaPobreza: t.datos ? t.datos.tasaPobreza : null,
        totalEmpresas: e.datos ? e.datos.totalEmpresas : null,
        empresasActivas: e.datos ? e.datos.empresasActivas : null,
        empresasRubro: ind.empresasRubro,
        empresasPorMil: ind.empresasPorMil,
        habitantesPorEmpresa: ind.habitantesPorEmpresa,
        sectorPredominante: ind.sectorPredominante,
        indiceDemanda: ind.indiceDemanda,
        indiceCompetencia: ind.indiceCompetencia,
        indicePoderAdquisitivo: ind.indicePoderAdquisitivo,
        indiceAtractivo: ind.indiceAtractivo,
        nivelAtractivo: ind.nivelAtractivo,
        estado,
        origenTerritorial: t.origen,
        origenEmpresarial: e.origen,
        tiempoTerritorialMs: t.tiempoMs,
        tiempoEmpresarialMs: e.tiempoMs,
        tiempoTotalMs,
        observacion: avisos.length ? avisos.join(' | ').slice(0, 500) : null,
      },
      e.datos
        ? e.datos.sectores.map((s) => ({ seccionCiiu: s.seccionCiiu, cantidad: s.activas, porcentaje: s.porcentaje, porMilHabitantes: s.porMilHabitantes }))
        : []
    );
    idAnalisisZona = fila.idAnalisisZona;
    fecha = fila.fechaCrea || fecha;
    paso('Persistencia MySQL', `Análisis N° ${idAnalisisZona} guardado (disponible para comparar sin volver a consultar)`);
  } catch (err) {
    LOGGER.error(`No se pudo guardar el análisis: ${err.message}`);
    avisos.push('No se pudo guardar el análisis en MySQL; el resultado igual se muestra.');
    paso('Persistencia MySQL', `ERROR: ${err.message}`);
  }
  paso('Fin', 'Respuesta JSON consolidada enviada al dashboard');

  return exito({
    analisis: {
      idAnalisisZona,
      fecha,
      zona,
      seccionInteres: seccionInteres ? { codigo: seccionInteres, nombre: await referenciaService.nombreSector(seccionInteres) } : null,
      estado,
      avisos,
      indicadores: { ...ind, sectorPredominanteNombre: await referenciaService.nombreSector(ind.sectorPredominante) },
      territorial: { origen: t.origen, tiempoMs: t.tiempoMs, intentos: t.intentos, aviso: t.aviso || null, error: t.error || null, datos: t.datos },
      empresarial: { origen: e.origen, tiempoMs: e.tiempoMs, intentos: e.intentos, aviso: e.aviso || null, error: e.error || null, datos: e.datos },
      tiempoTotalMs,
      trazabilidad: traza,
    },
  });
}

module.exports = { analizarZona };
