/**
 * Constantes generales (equivalente a Constantes.java)
 */
module.exports = Object.freeze({
  //-- Codigo Respuesta REST
  CODIGO_RESPUESTA_GENERAL_EXITO: '01',
  CODIGO_RESPUESTA_GENERAL_ERROR: '99',

  //-- Descripcion Respuestas REST (llaves de messages.js)
  MENSAJE_RESPUESTA_GENERAL_EXITO: 'mensajeRespuesta.general.exito',
  MENSAJE_RESPUESTA_GENERAL_ERR0R: 'mensajeRespuesta.general.error',
  MENSAJE_RESPUESTA_GENERAL_ARCHIVO_EXITO: 'mensajeRespuesta.general.archivo.exito',

  //-- Parametros Solicitud Generales (index)
  PARAM_TAMANIO_ARCHIVO_MAX_MB: 0,
  PARAM_TIEMPO_SESION_USU_MIN: 1,

  //-- Parametros Estado Generales
  PARAM_ESTADO_GENERAL_ACTIVO: '1',
  PARAM_ESTADO_GENERAL_INACTIVO: '2',

  //-- Parametros Roles Usuario
  PARAM_ROL_ADMINISTRADOR: '1',
  PARAM_ROL_USUARIO: '2',

  //-- Parametros Indicador General
  PARAM_INDICADOR_GENERAL_SI: '1',
  PARAM_INDICADOR_GENERAL_NO: '2',

  //-- Seguridad
  LOGIN_URL: '/api/v1/usuarios/ingresos',
  JWT_MILISEGUNDOS_UN_MINUTO: 60000,
  JWT_RESPONSE_HEADER_KEY: 'authorization',
  JWT_RESPONSE_HEADER_PREFIX: 'Bearer',
  JWT_URL_REFRESH_TOKEN: '/refreshToken',

  //-- URLs que no requieren token
  URLS_SIN_TOKEN: [
    '/api/v1/apariencia/publica', //-- colores y fondo: el login los necesita antes de ingresar
    '/api/v1/login/enviarCorreo',
    '/api/v1/login/restablecer/verificar',
    '/api/v1/login/restablecer',
  ],

  //-- Mensajes
  MENSAJE_GENERICO_SOAEXCEPTION: 'generico.soaException',
  MENSAJE_GENERICO_ADMIN: 'mensajeRespuesta.general.error.admin',
  MENSAJE_USUARIO_INGRESO_USUARIO: 'usuario.usuarioIngreso.validarUsuario.txException',
  MENSAJE_USUARIO_INGRESO_CLAVE: 'usuario.usuarioIngreso.validarClave.txException',
  MENSAJE_USUARIO_INGRESO_BD: 'usuario.usuarioIngreso.validarBaseDatos.txException',

  //-- Genericos
  USUARIO_ADMIN: 'admin',
  USUARIO_SISTEMA: 'sistema', //-- usuario_crea cuando la petición no tiene token (login, recuperar clave)
  TIMEZONE_DEFAULT: 'GMT-05:00',
  PROFILE_DEV: 'dev',
  PROFILE_TST: 'tst',
  PROFILE_PRD: 'prd',
  FLAG_SMS_EXITO: '1',
  FLAG_SMS_FALLA: '2',
  MENSAJE_ADMINISTRADOR: 'Comunicarse con el Administrador',
  ARCHIVO_EXT_PDF: '.pdf',
  ARCHIVO_EXT_DOCX: '.docx',
});
