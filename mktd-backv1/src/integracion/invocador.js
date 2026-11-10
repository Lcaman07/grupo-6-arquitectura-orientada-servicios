/**
 * Invocador de servicios externos (parte del servicio de UTILIDAD / capa de mediación)
 * ----------------------------------------------------------------------------
 * Toda llamada a INEI o SUNAT pasa por aquí:
 *   - timeout por intento (parámetro TIMEOUT_EXTERNO_MS)
 *   - reintentos limitados con espera progresiva (REINTENTOS_MAX, REINTENTO_ESPERA_MS x 2^n)
 *     solo ante errores TRANSITORIOS: sin conexión, timeout, HTTP 408/429/5xx
 *     (un 4xx o un SOAP Fault "Client" no se reintenta: repetirlo daría lo mismo)
 *   - registra cada invocación en log_integracion (bitácora para las pruebas del Cap. 2.5.4)
 * Las consultas son de LECTURA: repetirlas no genera ninguna operación de negocio (idempotentes).
 */
const parametros = require('../utils/parametros');
const { getLogger } = require('../utils/logger');
const logRepository = require('../repositories/logIntegracionRepository');

const LOGGER = getLogger('integracion');

class ErrorIntegracion extends Error {
  /**
   * @param {string} servicio INEI | SUNAT
   * @param {string} mensaje
   * @param {{estadoHttp?:number, transitorio?:boolean, intentos?:number, noEncontrado?:boolean}} detalle
   */
  constructor(servicio, mensaje, { estadoHttp = null, transitorio = true, intentos = 1, noEncontrado = false } = {}) {
    super(mensaje);
    this.name = 'ErrorIntegracion';
    this.servicio = servicio;
    this.estadoHttp = estadoHttp;
    this.transitorio = transitorio;
    this.intentos = intentos;
    this.noEncontrado = noEncontrado;
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const httpTransitorio = (s) => s === 408 || s === 429 || s >= 500;

/**
 * @param {object} op
 * @param {string} op.servicio   INEI | SUNAT
 * @param {string} op.operacion  ej. getResumenPorUbigeo
 * @param {string} op.protocolo  REST | SOAP
 * @param {string} op.url
 * @param {string} op.parametro  ubigeo / ruc (para la bitácora)
 * @param {RequestInit} op.peticion  method, headers, body de fetch
 * @param {(status:number, texto:string) => ({ok:boolean, transitorio?:boolean, mensaje?:string, noEncontrado?:boolean})} [op.evaluar]
 *        decide si la respuesta es válida (por defecto: 2xx). Permite tratar un SOAP Fault "Client" como no transitorio.
 * @returns {Promise<{texto:string, estadoHttp:number, intentos:number, tiempoMs:number}>}
 */
async function invocar(op) {
  const maxIntentos = Math.max(1, Math.min(6, parametros.entero('REINTENTOS_MAX')));
  const esperaBase = Math.max(0, parametros.entero('REINTENTO_ESPERA_MS'));
  const timeout = Math.max(500, parametros.entero('TIMEOUT_EXTERNO_MS'));
  const evaluar = op.evaluar || ((status) => ({ ok: status >= 200 && status < 300, transitorio: httpTransitorio(status) }));

  const inicio = Date.now();
  let intento = 0;
  let ultimoError = null;
  let estadoHttp = null;

  while (intento < maxIntentos) {
    intento += 1;
    try {
      const res = await fetch(op.url, { ...op.peticion, signal: AbortSignal.timeout(timeout) });
      estadoHttp = res.status;
      const texto = await res.text();
      const r = evaluar(res.status, texto);
      if (r.ok) {
        const tiempoMs = Date.now() - inicio;
        registrar(op, { estadoHttp, intentos: intento, exito: true, tiempoMs, mensaje: intento > 1 ? `OK después de ${intento} intentos` : 'OK' });
        return { texto, estadoHttp, intentos: intento, tiempoMs };
      }
      const transitorio = r.transitorio !== undefined ? r.transitorio : httpTransitorio(res.status);
      ultimoError = new ErrorIntegracion(op.servicio, r.mensaje || `HTTP ${res.status}`, {
        estadoHttp, transitorio, intentos: intento, noEncontrado: Boolean(r.noEncontrado),
      });
    } catch (e) {
      const porTiempo = e.name === 'TimeoutError' || e.name === 'AbortError';
      ultimoError = new ErrorIntegracion(
        op.servicio,
        porTiempo ? `Sin respuesta en ${timeout} ms (timeout)` : `No se pudo conectar: ${e.cause?.code || e.message}`,
        { estadoHttp: null, transitorio: true, intentos: intento }
      );
    }
    if (!ultimoError.transitorio || intento >= maxIntentos) break;
    const espera = esperaBase * 2 ** (intento - 1);
    LOGGER.warn(`${op.servicio} ${op.operacion}(${op.parametro}) intento ${intento} falló: ${ultimoError.message}. Reintento en ${espera} ms`);
    await esperar(espera);
  }

  ultimoError.intentos = intento;
  const tiempoMs = Date.now() - inicio;
  registrar(op, { estadoHttp, intentos: intento, exito: false, tiempoMs, mensaje: ultimoError.message });
  LOGGER.error(`${op.servicio} ${op.operacion}(${op.parametro}) falló tras ${intento} intento(s): ${ultimoError.message}`);
  throw ultimoError;
}

/** La bitácora no debe tumbar la consulta: si falla solo se escribe en el log */
function registrar(op, r) {
  logRepository
    .crear({
      servicio: op.servicio,
      operacion: op.operacion,
      protocolo: op.protocolo,
      url: String(op.url).slice(0, 300),
      parametro: op.parametro ? String(op.parametro).slice(0, 100) : null,
      estadoHttp: r.estadoHttp,
      intentos: r.intentos,
      exito: r.exito,
      tiempoMs: r.tiempoMs,
      mensaje: r.mensaje ? String(r.mensaje).slice(0, 500) : null,
    })
    .catch((e) => LOGGER.error(`No se pudo guardar la bitácora: ${e.message}`));
}

module.exports = { invocar, ErrorIntegracion };
