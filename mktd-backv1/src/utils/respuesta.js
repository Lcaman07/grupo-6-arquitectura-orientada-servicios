/**
 * Helpers para armar las respuestas con el mismo formato que BaseResponseDTO:
 * { codigoRespuesta, mensajeRespuesta, objErrorResource }
 */
const C = require('../config/constantes');
const { obtenerMensaje } = require('../config/messages');

/** Respuesta exitosa: codigoRespuesta "01" y mensaje "OK" */
const exito = (data = {}) => ({
  codigoRespuesta: C.CODIGO_RESPUESTA_GENERAL_EXITO,
  mensajeRespuesta: obtenerMensaje(C.MENSAJE_RESPUESTA_GENERAL_EXITO),
  objErrorResource: null,
  ...data,
});

/** Respuesta con error: codigoRespuesta "99" */
const error = (mensaje, fieldErrors = null) => ({
  codigoRespuesta: C.CODIGO_RESPUESTA_GENERAL_ERROR,
  mensajeRespuesta: mensaje,
  objErrorResource: {
    code: C.CODIGO_RESPUESTA_GENERAL_ERROR,
    message: mensaje,
    fieldErrors,
  },
});

/**
 * Los items de algunas listas en Java heredan de BaseResponseDTO, por eso en el JSON
 * aparecen con codigoRespuesta/mensajeRespuesta/objErrorResource en null. Se mantiene igual.
 */
const itemBase = (data) => ({
  codigoRespuesta: null,
  mensajeRespuesta: null,
  objErrorResource: null,
  ...data,
});

module.exports = { exito, error, itemBase };
