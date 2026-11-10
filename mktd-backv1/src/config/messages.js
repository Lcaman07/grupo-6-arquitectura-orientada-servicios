/**
 * Mensajes (equivalente a messages.properties y validationMessages.properties)
 * Si una llave no existe se devuelve la misma llave (como setUseCodeAsDefaultMessage(true))
 */
const messages = {
  //-- Mensajes generales
  'mensajeRespuesta.general.exito': 'OK',
  'mensajeRespuesta.general.error': 'Error: {0}',
  'generico.soaException': 'Error en atributos obligatorios del request {0}',
  'mensajeRespuesta.general.error.admin': 'Comunicarse con el Administrador: {0}',
  'mensajeRespuesta.general.archivo.exito': 'Se cargó correctamente el archivo',

  //-- Usuario
  'usuario.usuarioIngreso.validarUsuario.txException': 'El usuario es obligatorio',
  'usuario.usuarioIngreso.validarClave.txException': 'La clave es obligatoria',
  'usuario.usuarioIngreso.validarBaseDatos.txException': 'El usuario {0} NO está autorizado para ingresar al sistema',
};

const validationMessages = {
  //-- UsuarioIngresoRequestDTO
  'NotBlank.usuarioIngresoRequestDTO.usuario': 'El Usuario es un atributo obligatorio',
  'NotBlank.usuarioIngresoRequestDTO.clave': 'La Clave es un atributo obligatorio',
  //-- AnalisisZonaRequestDTO
  'NotBlank.analisisZonaRequestDTO.ubigeo': 'Seleccione la zona a analizar',
  'Pattern.analisisZonaRequestDTO.ubigeo': 'El UBIGEO debe tener 2, 4 o 6 dígitos',
};

function format(text, params) {
  if (!params) return text;
  return text.replace(/\{(\d+)\}/g, (m, i) => (params[i] !== undefined && params[i] !== null ? String(params[i]) : m));
}

/** Utilitarios.obtenerMensaje(messageSource, param, mensaje) */
function obtenerMensaje(key, params) {
  return format(messages[key] !== undefined ? messages[key] : key, params);
}

function obtenerMensajeValidacion(key, params) {
  return format(validationMessages[key] !== undefined ? validationMessages[key] : key, params);
}

module.exports = { obtenerMensaje, obtenerMensajeValidacion };
