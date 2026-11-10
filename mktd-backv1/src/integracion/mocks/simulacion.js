/**
 * Modo de funcionamiento de los servicios simulados, para las pruebas de "Falla de fuente" (Cap. 2.5.4):
 *   NORMAL       responde siempre
 *   LENTO        tarda 2.5 s en responder (se ve en los tiempos de la bitácora)
 *   INTERMITENTE falla una llamada sí y otra no (HTTP 503): el reintento del adaptador la recupera
 *   CAIDO        responde siempre HTTP 503: se agotan los reintentos y el orquestador usa la caché o informa la falla
 * Se cambia desde Integración SOA > Bitácora (permiso INTEGRACION_SIMULAR). Vive en memoria: al reiniciar vuelve a NORMAL.
 */
const MODOS = ['NORMAL', 'LENTO', 'INTERMITENTE', 'CAIDO'];
const estado = { INEI: 'NORMAL', SUNAT: 'NORMAL' };
const contador = { INEI: 0, SUNAT: 0 };

const obtener = () => ({ ...estado });

function cambiar(servicio, modo) {
  if (!Object.prototype.hasOwnProperty.call(estado, servicio)) throw new Error(`Servicio desconocido: ${servicio}`);
  if (!MODOS.includes(modo)) throw new Error(`Modo desconocido: ${modo}`);
  estado[servicio] = modo;
  contador[servicio] = 0;
  return obtener();
}

/**
 * Middleware del mock: decide si la petición falla o se demora.
 * @param {string} servicio INEI | SUNAT
 * @param {function} responderFalla (res) => respuesta de error en el formato del servicio (JSON o SOAP Fault)
 */
const middleware = (servicio, responderFalla) => (req, res, next) => {
  const modo = estado[servicio];
  if (req.method === 'GET' && (req.path.endsWith('/salud') || 'wsdl' in req.query)) return next(); //-- el ping no se altera
  if (modo === 'CAIDO') return responderFalla(res, 'Servicio no disponible (simulado: CAIDO)');
  if (modo === 'INTERMITENTE') {
    contador[servicio] += 1;
    if (contador[servicio] % 2 === 1) return responderFalla(res, 'Servicio no disponible temporalmente (simulado: INTERMITENTE)');
  }
  if (modo === 'LENTO') return setTimeout(next, 2500);
  return next();
};

module.exports = { MODOS, obtener, cambiar, middleware };
