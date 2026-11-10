/**
 * Equivalente a ILoginService + IResetTokenService (recuperar contraseña)
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { getLogger } = require('../utils/logger');
const emailService = require('../utils/emailService');
const usuarioRepository = require('../repositories/usuarioRepository');
const resetTokenRepository = require('../repositories/resetTokenRepository');
const { BCRYPT_ROUNDS } = require('./usuarioService');

const LOGGER = getLogger('LoginService');
const MINUTOS_EXPIRACION_TOKEN = config.seguridad.resetTokenMinutos; //-- .env RESET_TOKEN_MINUTOS

/** Genera el token de restablecimiento y envía el correo. Devuelve 1 si ok, 0 si no */
async function enviarCorreo(correo) {
  const us = await usuarioRepository.buscarPorCorreo(correo);
  if (!us) {
    LOGGER.info(`Restablecer contraseña: no hay usuario activo con el correo ${correo}`);
    return 0;
  }
  const token = crypto.randomUUID();
  try {
    await resetTokenRepository.guardar({
      token,
      idUsuario: us.idUsuario,
      expiracion: new Date(Date.now() + MINUTOS_EXPIRACION_TOKEN * 60000),
      usuarioCrea: us.usuario,
      flkactivo: true, //-- reset_token.flkactivo es NOT NULL
    });
  } catch (dbError) {
    //-- el detalle real de MySQL (columna desconocida, NOT NULL...) viene en dbError.parent
    LOGGER.error(`No se pudo guardar el token de ${us.usuario}: ${(dbError.parent || dbError).message}`);
    throw dbError;
  }
  const resetUrl = `${config.front.resetPasswordUrl}?id=${token}`;
  await emailService.sendEmail({
    from: config.mail.from,
    to: us.correo,
    subject: 'RESTABLECER CONTRASEÑA - MEDIAPP',
    template: 'email.template.html',
    model: { user: us.usuario, resetUrl },
  });
  LOGGER.info(`Token de restablecimiento generado para el usuario ${us.usuario}`);
  return 1;
}

/** Verifica si el token existe y no ha expirado. Devuelve 1 si es válido */
async function verificarToken(token) {
  if (!token) return 0;
  const rt = await resetTokenRepository.findByToken(token);
  if (!rt) return 0;
  return new Date() <= new Date(rt.expiracion) ? 1 : 0;
}

/** Cambia la clave usando el token y lo elimina. Devuelve 1 si ok */
async function restablecerClave(token, clave) {
  const rt = await resetTokenRepository.findByToken(token);
  if (!rt || new Date() > new Date(rt.expiracion)) return 0;

  const claveHash = await bcrypt.hash(String(clave), BCRYPT_ROUNDS);
  await usuarioRepository.cambiarClave(claveHash, rt.idUsuario);
  await resetTokenRepository.eliminar(rt);
  return 1;
}

module.exports = { enviarCorreo, verificarToken, restablecerClave };
