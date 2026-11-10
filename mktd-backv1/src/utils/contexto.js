/**
 * Contexto por petición (equivalente a SecurityContextHolder de Spring)
 * ----------------------------------------------------------------------------
 * Guarda el usuario del token durante toda la petición, para que los hooks de
 * auditoría (models/hooksAuditoria.js) llenen usuario_crea / usuario_modif sin
 * tener que pasarlo de service en service.
 */
const { AsyncLocalStorage } = require('async_hooks');
const C = require('../config/constantes');

const storage = new AsyncLocalStorage();

/** Middleware: se ejecuta después de jwtFilter (req.usuario = claims.sub) */
function middleware(req, res, next) {
  storage.run({ usuario: req.usuario || null }, () => next());
}

/** Usuario en sesión o "sistema" si la petición no tiene token (login, recuperar clave) */
function usuarioActual() {
  const store = storage.getStore();
  return (store && store.usuario) || C.USUARIO_SISTEMA;
}

/** Ejecuta una función como un usuario (útil en pruebas o procesos internos) */
function ejecutarComo(usuario, fn) {
  return storage.run({ usuario }, fn);
}

module.exports = { middleware, usuarioActual, ejecutarComo };
