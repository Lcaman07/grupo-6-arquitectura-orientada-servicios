/**
 * Equivalente a UsuarioService / UsuarioServiceImpl.java
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const C = require('../config/constantes');
const { obtenerMensaje } = require('../config/messages');
const { MktdTXException } = require('../exceptions');
const { esVacio } = require('../utils/utilitarios');
const { exito, itemBase } = require('../utils/respuesta');
const { getLogger } = require('../utils/logger');
const usuarioRepository = require('../repositories/usuarioRepository');
const parametros = require('../utils/parametros');
const { usuarioActual } = require('../utils/contexto');
const { validarPermiso } = require('./seguridadService');

//-- Formato del número según el tipo de documento (multitabla 004, se compara con su valor: DNI, CE, PAS).
//-- Los usuarios del sistema son personas: no se acepta RUC ni "sin documento".
const FORMATO_DOCUMENTO = {
  DNI: { regex: /^\d{8}$/, texto: 'El DNI debe tener 8 dígitos' },
  CE: { regex: /^[A-Z0-9]{8,12}$/, texto: 'El carnet de extranjería debe tener entre 8 y 12 letras o números' },
  PAS: { regex: /^[A-Z0-9]{6,12}$/, texto: 'El pasaporte debe tener entre 6 y 12 letras o números' },
};
const TIPOS_FOTO = /^image\/(jpeg|png|webp)$/;

/** Contraseña: mínimo 8 caracteres con letras y números */
function validarClave(clave) {
  const c = String(clave || '');
  if (c.length < 8 || c.length > 72 || !/[A-Za-z]/.test(c) || !/\d/.test(c)) {
    throw new MktdTXException('La contraseña debe tener de 8 a 72 caracteres, con letras y números');
  }
}

/** Tipo y número de documento de una persona (DNI, CE o pasaporte) */
async function validarDocumento(idTipoDocumento, numero) {
  const tipo = idTipoDocumento ? await usuarioRepository.tipoDocumento(idTipoDocumento) : null;
  const formato = tipo ? FORMATO_DOCUMENTO[String(tipo.valor).toUpperCase()] : null;
  if (!formato) throw new MktdTXException('Seleccione el tipo de documento (DNI, carnet de extranjería o pasaporte)');
  const numeroDocumento = String(numero || '').trim().toUpperCase();
  if (!formato.regex.test(numeroDocumento)) throw new MktdTXException(formato.texto);
  return { tipo, numeroDocumento };
}

/** Nombre corto para el menú: primer nombre + primer apellido */
const nombreCorto = (nombres, apellidos) =>
  [String(nombres || '').trim().split(/\s+/)[0], String(apellidos || '').trim().split(/\s+/)[0]].filter(Boolean).join(' ');

const LOGGER = getLogger('UsuarioService');
const BCRYPT_ROUNDS = config.seguridad.bcryptRounds; //-- .env BCRYPT_ROUNDS (10 = costo por defecto de BCryptPasswordEncoder de Spring)

/** Genera el JWT de sesión */
function generarToken(subject, tiempoMinuto) {
  return jwt.sign({}, config.jwt.secret, {
    algorithm: 'HS256',
    issuer: config.jwt.issuer, //-- empresa
    subject, //-- usuario
    audience: config.jwt.audience, //-- audiencia (web, mobile)
    expiresIn: tiempoMinuto * 60, //-- segundos
    jwtid: crypto.randomUUID(), //-- id propio jwt
  });
}

const errorIngreso = (mensaje) => ({ codigoRespuesta: C.CODIGO_RESPUESTA_GENERAL_ERROR, mensajeRespuesta: mensaje });

/** Login: valida usuario/clave y devuelve el JWT */
async function usuarioIngreso(request = {}) {
  LOGGER.info('Entro a UsuarioService#usuarioIngreso(request)');
  const { usuario, clave } = request;

  //-- Validaciones REQUEST
  if (esVacio(usuario)) return errorIngreso(obtenerMensaje(C.MENSAJE_USUARIO_INGRESO_USUARIO));
  if (esVacio(clave)) return errorIngreso(obtenerMensaje(C.MENSAJE_USUARIO_INGRESO_CLAVE));

  const tiempoMinuto = config.jwt.tiempoSesionMin;
  const noAutorizado = () => errorIngreso(obtenerMensaje(C.MENSAJE_USUARIO_INGRESO_BD, [usuario]));

  //-- Validar clave contra el hash bcrypt de la BD
  const usu = await usuarioRepository.findByUsuarioActivo(usuario);
  if (!usu) return noAutorizado();
  const claveValida = await bcrypt.compare(String(clave), usu.contrasena);
  if (!claveValida) return noAutorizado();

  //-- Validar que exista con su rol
  const usuarioInterno = await usuarioRepository.findByUserCodeAndUGpClaveWeb(usuario);
  if (!usuarioInterno) return noAutorizado();

  const response = {
    codigoRespuesta: C.CODIGO_RESPUESTA_GENERAL_EXITO,
    mensajeRespuesta: obtenerMensaje(C.MENSAJE_RESPUESTA_GENERAL_EXITO),
    jwtToken: generarToken(usuario, tiempoMinuto),
    codigoUsuario: usuarioInterno.usuario,
    nombreUsuario: `${usuarioInterno.nombres} ${usuarioInterno.apellidos}`.trim(),
    rol: usuarioInterno.rol.idRol,
    nombreRol: usuarioInterno.rol.nombre, //-- se muestra bajo el nombre en el menú lateral
    tiempoMinuto,
    //-- para el menú lateral: foto (se pide aparte con /usuarios/foto/:id) y nombre corto
    idUsuario: usuarioInterno.idUsuario,
    nombreCorto: nombreCorto(usuarioInterno.nombres, usuarioInterno.apellidos),
    ...(await usuarioRepository.infoFoto(usuarioInterno.idUsuario)),
  };
  LOGGER.info('Salio a UsuarioService#usuarioIngreso(request)');
  return response;
}

/** Renueva el token del usuario en sesión */
async function usuarioRefreshToken(currentClaims) {
  LOGGER.info('Entro a UsuarioService#usuarioRefreshToken(currentClaims)');
  const tiempoMinuto = config.jwt.tiempoSesionMin;
  return exito({
    jwtToken: generarToken(currentClaims.sub, tiempoMinuto),
    codigoUsuario: null,
    nombreUsuario: null,
    rol: null,
    tiempoMinuto,
  });
}

/** Listado de usuarios */
async function usuarioInicializacion() {
  const lista = await usuarioRepository.listado();
  const listados = lista.map((i) => ({
    ...itemBase({
      idUsuario: i.idUsuario,
      idRol: i.idRol,
      nombres: i.nombres,
      apellidos: i.apellidos,
      usuario: i.usuario,
      contrasena: null,
      telefono: i.telefono,
      correo: i.correo,
      dni: i.dni,
      flkactivo: Boolean(i.flkactivo),
      foto: null,
    }),
    idTipoDocumento: i.idTipoDocumento,
    tipoDocumento: i.tipoDocumento || null,
    rol: i.rol || null,
    tieneFoto: Number(i.tieneFoto) === 1,
    fotoVersion: i.fotoVersion || null,
  }));
  return exito({ listados });
}

/** Registrar (si no trae idUsuario existente) o actualizar usuario */
async function usuarioRegistro(request) {
  const { tipo, numeroDocumento } = await validarDocumento(request.idTipoDocumento, request.dni);
  request.dni = numeroDocumento;

  const datos = {
    idTipoDocumento: tipo.idMultitabla,
    idRol: request.idRol,
    nombres: request.nombres,
    apellidos: request.apellidos,
    telefono: request.telefono,
    correo: request.correo,
    dni: request.dni,
    usuario: request.usuario,
    flkactivo: request.flkactivo,
  };

  let usuario = request.idUsuario ? await usuarioRepository.findById(request.idUsuario) : null;

  if (usuario) {
    //-- Actualizar: datos y rol. La contraseña y la foto las cambia cada usuario en "Mi perfil"
    //-- (si la olvidó: "¿Olvidaste tu contraseña?" en el login)
    usuario.set(datos);
    usuario = await usuarioRepository.save(usuario);
  } else {
    const existe = await usuarioRepository.findByUsuario(request.usuario);
    if (existe) {
      throw new MktdTXException(`El usuario ${request.usuario} ya existe en la base de datos`);
    }
    validarClave(request.contrasenia); //-- clave inicial; el usuario la cambia en Mi perfil
    usuario = await usuarioRepository.create({
      ...datos,
      contrasena: await bcrypt.hash(String(request.contrasenia), BCRYPT_ROUNDS),
    });
  }

  return exito({ id: String(usuario.idUsuario) });
}

/**
 * Guardar foto del usuario. El navegador la achica antes de subirla (FOTO_USUARIO_PX, ~20 KB);
 * aquí solo se acepta imagen y hasta FOTO_USUARIO_MAX_KB para no llenar la base de datos.
 * Uno mismo puede cambiar su foto; la de otro usuario requiere la pantalla de Usuarios.
 */
async function guardarFoto(idUsuario, file) {
  const yo = await usuarioRepository.findByUsuario(usuarioActual());
  if (!yo || yo.idUsuario !== idUsuario) {
    await validarPermiso('/pages/seguridad/usuario.html', 'cambiar la foto de otro usuario');
  }
  if (!file || !TIPOS_FOTO.test(file.mimetype)) throw new MktdTXException('La foto debe ser una imagen JPG, PNG o WEBP');
  const maxKb = parametros.entero('FOTO_USUARIO_MAX_KB');
  if (file.size > maxKb * 1024) throw new MktdTXException(`La foto pesa ${Math.round(file.size / 1024)} KB; el máximo es ${maxKb} KB`);
  if (!(await usuarioRepository.findById(idUsuario))) throw new MktdTXException('No existe el usuario');
  await usuarioRepository.guardarFoto(idUsuario, file.buffer);
  const info = await usuarioRepository.infoFoto(idUsuario);
  return exito({ id: String(idUsuario), ...info, mensajeRespuesta: 'Foto actualizada' });
}

/** POST /usuarios/miFoto: el usuario en sesión cambia su propia foto */
async function guardarMiFoto(file) {
  const yo = await usuarioRepository.findByUsuario(usuarioActual());
  if (!yo) throw new MktdTXException('No se encontró el usuario en sesión');
  return guardarFoto(yo.idUsuario, file);
}

/** GET /usuarios/foto/:idUsuario -> { tipo, buffer } o null */
async function obtenerFoto(idUsuario) {
  const u = await usuarioRepository.foto(idUsuario);
  if (!u || !u.foto || !u.foto.length) return null;
  const b = u.foto;
  const tipo = b[0] === 0x89 ? 'image/png' : b[0] === 0x52 ? 'image/webp' : 'image/jpeg';
  return { tipo, buffer: b };
}

/** Mostrar un usuario */
async function usuarioMostrar(idUsuario) {
  const usuario = await usuarioRepository.findById(idUsuario);
  if (!usuario) throw new MktdTXException(`No existe el usuario con id ${idUsuario}`);
  return exito({
    idUsuario: usuario.idUsuario,
    idRol: usuario.idRol,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    usuario: usuario.usuario,
    contrasena: null, //-- nunca se envía el hash de la contraseña al navegador
    telefono: usuario.telefono,
    correo: usuario.correo,
    idTipoDocumento: usuario.idTipoDocumento,
    dni: usuario.dni,
    flkactivo: usuario.flkactivo,
    foto: null,
    ...(await usuarioRepository.infoFoto(usuario.idUsuario)),
  });
}

/** GET /usuarios/miPerfil: datos del usuario en sesión (el correo y el usuario no se cambian aquí) */
async function miPerfil() {
  const yo = await usuarioRepository.findByUsuarioConRol(usuarioActual());
  if (!yo) throw new MktdTXException('No se encontró el usuario en sesión');
  return exito({
    idUsuario: yo.idUsuario,
    usuario: yo.usuario,
    nombres: yo.nombres,
    apellidos: yo.apellidos,
    telefono: yo.telefono,
    correo: yo.correo,
    idTipoDocumento: yo.idTipoDocumento,
    dni: yo.dni,
    rol: yo.rol ? yo.rol.nombre : null,
    ...(await usuarioRepository.infoFoto(yo.idUsuario)),
  });
}

/**
 * POST /usuarios/miPerfil { nombres, apellidos, telefono, idTipoDocumento, dni, claveActual, claveNueva }
 * La contraseña es opcional: solo se cambia si manda claveNueva, y pide la actual.
 */
async function guardarMiPerfil(request) {
  const yo = await usuarioRepository.findByUsuario(usuarioActual());
  if (!yo) throw new MktdTXException('No se encontró el usuario en sesión');
  const nombres = String(request.nombres || '').trim().replace(/\s+/g, ' ');
  const apellidos = String(request.apellidos || '').trim().replace(/\s+/g, ' ');
  if (!nombres || !apellidos) throw new MktdTXException('Ingrese sus nombres y apellidos');
  if (nombres.length > 100 || apellidos.length > 100) throw new MktdTXException('Nombres y apellidos: máximo 100 caracteres');
  const telefono = String(request.telefono || '').trim();
  if (!/^\d{9}$/.test(telefono)) throw new MktdTXException('El teléfono debe tener 9 dígitos');
  const { tipo, numeroDocumento } = await validarDocumento(request.idTipoDocumento, request.dni);

  const datos = { nombres, apellidos, telefono, idTipoDocumento: tipo.idMultitabla, dni: numeroDocumento };
  let cambioClave = false;
  if (request.claveNueva) {
    if (!request.claveActual) throw new MktdTXException('Ingrese su contraseña actual para cambiarla');
    const completo = await usuarioRepository.findByUsuarioActivo(yo.usuario);
    if (!completo || !(await bcrypt.compare(String(request.claveActual), completo.contrasena))) {
      throw new MktdTXException('La contraseña actual no es correcta');
    }
    validarClave(request.claveNueva);
    if (String(request.claveNueva) === String(request.claveActual)) throw new MktdTXException('La nueva contraseña debe ser distinta a la actual');
    datos.contrasena = await bcrypt.hash(String(request.claveNueva), BCRYPT_ROUNDS);
    cambioClave = true;
  }
  yo.set(datos);
  await usuarioRepository.save(yo);
  return exito({
    id: String(yo.idUsuario),
    nombreUsuario: `${nombres} ${apellidos}`,
    nombreCorto: nombreCorto(nombres, apellidos),
    mensajeRespuesta: cambioClave ? 'Datos y contraseña actualizados' : 'Datos actualizados',
  });
}

/** Activar / desactivar usuario */
async function modificarEstado(request) {
  const usuario = await usuarioRepository.findById(request.idUsuario);
  if (!usuario) throw new MktdTXException(`No existe el usuario con id ${request.idUsuario}`);
  usuario.flkactivo = request.flkactivo;
  await usuarioRepository.save(usuario);
  return exito({ id: String(usuario.idUsuario) });
}

module.exports = {
  usuarioIngreso,
  usuarioRefreshToken,
  usuarioInicializacion,
  usuarioRegistro,
  guardarFoto,
  guardarMiFoto,
  obtenerFoto,
  miPerfil,
  guardarMiPerfil,
  usuarioMostrar,
  modificarEstado,
  BCRYPT_ROUNDS,
};
