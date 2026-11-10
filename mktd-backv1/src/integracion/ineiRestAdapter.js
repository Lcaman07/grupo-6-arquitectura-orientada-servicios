/**
 * Adaptador REST / JSON del INEI (servicio de UTILIDAD)
 * ----------------------------------------------------------------------------
 * Aísla el protocolo y el formato del INEI: el Servicio Territorial nunca ve la respuesta original.
 *   Entrada : ubigeo (2, 4 o 6 dígitos)
 *   Externo : GET {INEI_URL}/ubigeo/{ubigeo}/indicadores  ->  { codigoUbigeo, nivelTerritorial, indicadores: [{codigo, valor}] }
 *   Salida  : objeto interno normalizado (números, nombres de campo de MarketData)
 */
const config = require('../config');
const { invocar, ErrorIntegracion } = require('./invocador');

const SERVICIO = 'INEI';
const NIVELES = { DEP: 'DEPARTAMENTO', PROV: 'PROVINCIA', DIST: 'DISTRITO' };

//-- código del indicador del INEI -> campo interno
const MAPA_INDICADORES = {
  POB_TOT: 'poblacionTotal',
  POB_URB: 'poblacionUrbana',
  POB_RUR: 'poblacionRural',
  POB_HOM: 'poblacionHombres',
  POB_MUJ: 'poblacionMujeres',
  VIV_HOG: 'hogares',
  SUP_KM2: 'superficieKm2',
  EDAD_PROM: 'edadPromedio',
  POBREZA_PCT: 'tasaPobreza',
  PEA: 'pea',
};

const base = () => config.integracion.ineiUrl.replace(/\/+$/, '');

/** Transforma la respuesta JSON del INEI al contrato interno */
function normalizar(json, ubigeo) {
  if (!json || !Array.isArray(json.indicadores)) {
    throw new ErrorIntegracion(SERVICIO, 'Respuesta del INEI sin la lista de indicadores', { transitorio: false });
  }
  const datos = {
    ubigeo: String(json.codigoUbigeo || ubigeo),
    nivel: NIVELES[json.nivelTerritorial] || json.nivelTerritorial || null,
    anioReferencia: json.anioReferencia ? Number(json.anioReferencia) : null,
    fuente: String(json.fuente || 'INEI').slice(0, 80),
  };
  Object.values(MAPA_INDICADORES).forEach((campo) => { datos[campo] = null; });
  json.indicadores.forEach((i) => {
    const campo = MAPA_INDICADORES[i.codigo];
    if (!campo) return;
    const n = Number(String(i.valor).replace(/,/g, ''));
    datos[campo] = Number.isFinite(n) ? n : null;
  });
  //-- indicador derivado: densidad poblacional
  datos.densidadHabKm2 = datos.poblacionTotal && datos.superficieKm2
    ? Math.round((datos.poblacionTotal / datos.superficieKm2) * 100) / 100
    : null;
  return datos;
}

async function consultarIndicadores(ubigeo) {
  const url = `${base()}/ubigeo/${encodeURIComponent(ubigeo)}/indicadores`;
  const r = await invocar({
    servicio: SERVICIO,
    operacion: 'indicadoresPorUbigeo',
    protocolo: 'REST',
    url,
    parametro: ubigeo,
    peticion: { method: 'GET', headers: { Accept: 'application/json' } },
    evaluar: (status, texto) => {
      if (status >= 200 && status < 300) return { ok: true };
      let mensaje = `HTTP ${status}`;
      try { mensaje = JSON.parse(texto).message || mensaje; } catch (e) { /* respuesta sin JSON */ }
      return { ok: false, transitorio: status === 408 || status === 429 || status >= 500, noEncontrado: status === 404, mensaje };
    },
  });
  let json;
  try {
    json = JSON.parse(r.texto);
  } catch (e) {
    throw new ErrorIntegracion(SERVICIO, 'El INEI respondió algo que no es JSON', { transitorio: false });
  }
  return { datos: normalizar(json, ubigeo), intentos: r.intentos, tiempoMs: r.tiempoMs };
}

/** Ping rápido (sin reintentos ni bitácora) para el panel de estado */
async function salud() {
  const inicio = Date.now();
  try {
    const res = await fetch(`${base()}/salud`, { signal: AbortSignal.timeout(3000) });
    return { servicio: SERVICIO, protocolo: 'REST', url: base(), disponible: res.ok, estadoHttp: res.status, tiempoMs: Date.now() - inicio };
  } catch (e) {
    return { servicio: SERVICIO, protocolo: 'REST', url: base(), disponible: false, estadoHttp: null, tiempoMs: Date.now() - inicio, mensaje: e.cause?.code || e.message };
  }
}

module.exports = { consultarIndicadores, salud, normalizar };
