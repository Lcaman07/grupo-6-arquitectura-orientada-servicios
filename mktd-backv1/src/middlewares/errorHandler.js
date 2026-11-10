/**
 * Manejo centralizado de errores (equivalente a PsiControllerAdvice.java)
 *
 * - MktdSOAException (validación), MktdDBException, MktdTXException -> HTTP 200 con codigoRespuesta "99"
 *   (en Java se dejó 200 "para no complicar al front-end")
 * - Archivo muy grande -> 200 con "99"
 * - Cualquier otro error -> HTTP 500 con codigoRespuesta "99"
 */
const multer = require('multer');
const C = require('../config/constantes');
const { obtenerMensaje } = require('../config/messages');
const { MktdSOAException, MktdDBException, MktdTXException } = require('../exceptions');
const { error } = require('../utils/respuesta');
const { getLogger } = require('../utils/logger');

const LOGGER = getLogger('ControllerAdvice');

/** Envuelve controladores async para que sus errores lleguen aquí */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof MktdSOAException) {
    return res.status(200).json(error(err.msjError, err.errors || []));
  }
  if (err instanceof MktdDBException || err instanceof MktdTXException) {
    return res.status(200).json(error(err.msjError));
  }
  //-- INEI / SUNAT no respondieron (y no había caché): error controlado indicando qué servicio falló
  if (err.name === 'ErrorIntegracion') {
    return res.status(200).json(error(`${err.servicio}: ${err.message}${err.intentos > 1 ? ` (tras ${err.intentos} intentos)` : ''}`));
  }
  if (err instanceof multer.MulterError) {
    return res.status(200).json(error(`Error al subir el archivo: ${err.message}`));
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(error('El body no es un JSON válido'));
  }
  if (err.name && err.name.startsWith('Sequelize')) {
    LOGGER.error(`Error de base de datos en ${req.method} ${req.originalUrl}: ${err.parent?.sqlMessage || err.message}\n${err.stack}`);
    return res.status(500).json(error(obtenerMensaje(C.MENSAJE_GENERICO_ADMIN, [err.parent?.sqlMessage || err.message])));
  }

  LOGGER.error(`Error no controlado en ${req.method} ${req.originalUrl}: ${err.stack || err}`);
  return res.status(500).json(error(obtenerMensaje(C.MENSAJE_GENERICO_ADMIN, [err.message])));
}

/** 404 para rutas que no existen */
const notFound = (req, res) => res.status(404).json(error(`No existe la ruta ${req.method} ${req.originalUrl}`));

module.exports = { errorHandler, asyncHandler, notFound };
