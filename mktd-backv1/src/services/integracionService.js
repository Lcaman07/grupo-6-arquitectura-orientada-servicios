/**
 * Integración SOA: bitácora de llamadas, estado de INEI / SUNAT, simulación de fallas y limpieza de caché
 */
const config = require('../config');
const ineiAdapter = require('../integracion/ineiRestAdapter');
const sunatAdapter = require('../integracion/sunatSoapAdapter');
const simulacion = require('../integracion/mocks/simulacion');
const logIntegracionRepository = require('../repositories/logIntegracionRepository');
const territorialRepository = require('../repositories/territorialRepository');
const empresarialRepository = require('../repositories/empresarialRepository');
const { validarPermiso } = require('./seguridadService');
const { MktdTXException } = require('../exceptions');
const { exito, itemBase } = require('../utils/respuesta');
const parametros = require('../utils/parametros');

const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const fecha = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);

/** GET /api/v1/integracion/bitacora?servicio=&exito=&desde=&hasta= */
async function bitacora(q) {
  const exitoFiltro = q.exito === 'true' ? true : q.exito === 'false' ? false : null;
  const [lista, resumen] = await Promise.all([
    logIntegracionRepository.listar({ servicio: texto(q.servicio), exito: exitoFiltro, desde: fecha(q.desde), hasta: fecha(q.hasta) }),
    logIntegracionRepository.resumen(fecha(q.desde) ? new Date(`${fecha(q.desde)}T00:00:00`) : null),
  ]);
  return exito({
    listados: lista.map((l) =>
      itemBase({
        idLogIntegracion: Number(l.idLogIntegracion), fecha: l.fechaCrea, usuario: l.usuarioCrea, servicio: l.servicio,
        operacion: l.operacion, protocolo: l.protocolo, url: l.url, parametro: l.parametro, estadoHttp: l.estadoHttp,
        intentos: l.intentos, exito: Boolean(l.exito), tiempoMs: l.tiempoMs, mensaje: l.mensaje,
      })
    ),
    resumen: resumen.map((s) => ({
      servicio: s.servicio,
      llamadas: Number(s.llamadas),
      exitosas: Number(s.exitosas),
      porcentajeExito: Number(s.llamadas) ? Math.round((Number(s.exitosas) / Number(s.llamadas)) * 1000) / 10 : null,
      tiempoPromedioMs: s.tiempoPromedio ? Math.round(Number(s.tiempoPromedio)) : null,
      tiempoMaximoMs: s.tiempoMaximo ? Number(s.tiempoMaximo) : null,
      recuperadas: Number(s.recuperadas || 0),
    })),
  });
}

/** GET /api/v1/integracion/estado — ping a las dos fuentes + configuración de reintentos y caché */
async function estado() {
  const [inei, sunat] = await Promise.all([ineiAdapter.salud(), sunatAdapter.salud()]);
  return exito({
    servicios: [inei, sunat],
    mocksHabilitados: config.integracion.mocksHabilitados,
    simulacion: config.integracion.mocksHabilitados ? simulacion.obtener() : null,
    modos: simulacion.MODOS,
    configuracion: {
      reintentosMax: parametros.entero('REINTENTOS_MAX'),
      reintentoEsperaMs: parametros.entero('REINTENTO_ESPERA_MS'),
      timeoutMs: parametros.entero('TIMEOUT_EXTERNO_MS'),
      cacheVigenciaHoras: parametros.entero('CACHE_VIGENCIA_HORAS'),
    },
  });
}

/** POST /api/v1/integracion/simulacion { servicio: INEI|SUNAT, modo: NORMAL|LENTO|INTERMITENTE|CAIDO } */
async function simular(request) {
  await validarPermiso('INTEGRACION_SIMULAR', 'simular fallas de INEI / SUNAT');
  if (!config.integracion.mocksHabilitados) throw new MktdTXException('La simulación solo funciona con los servicios simulados (MOCKS_HABILITADOS=true)');
  const servicio = String(request.servicio || '').toUpperCase();
  const modo = String(request.modo || '').toUpperCase();
  if (!['INEI', 'SUNAT'].includes(servicio)) throw new MktdTXException('Servicio inválido (INEI o SUNAT)');
  if (!simulacion.MODOS.includes(modo)) throw new MktdTXException(`Modo inválido (${simulacion.MODOS.join(', ')})`);
  return exito({ simulacion: simulacion.cambiar(servicio, modo), mensajeRespuesta: `${servicio} ahora responde en modo ${modo}` });
}

/** POST /api/v1/integracion/limpiarCache — la próxima consulta irá sí o sí a INEI / SUNAT */
async function limpiarCache() {
  await validarPermiso('CACHE_LIMPIAR', 'limpiar la caché de INEI / SUNAT');
  await territorialRepository.limpiar();
  await empresarialRepository.limpiar();
  return exito({ mensajeRespuesta: 'Caché de INEI y SUNAT eliminada. El historial de análisis se conserva.' });
}

module.exports = { bitacora, estado, simular, limpiarCache };
