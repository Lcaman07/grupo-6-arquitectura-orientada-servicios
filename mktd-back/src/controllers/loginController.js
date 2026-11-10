/**
 * Recuperación de contraseña (equivalente a LoginController.java)
 * Responde un número: 1 = ok, 0 = no se pudo (igual que en Java)
 */
const loginService = require('../services/loginService');
const { validarDto } = require('../validators/validar');
const { getLogger } = require('../utils/logger');

const LOGGER = getLogger('LoginController');

module.exports = {
  /** POST /login/enviarCorreo  { correo } */
  enviarCorreo: async (req, res) => {
    try {
      res.status(200).json(await loginService.enviarCorreo(req.body.correo));
    } catch (e) {
      LOGGER.error(`enviarCorreo: ${e.parent?.sqlMessage || e.message}\n${e.stack}`);
      res.status(500).json(0);
    }
  },

  /** GET /login/restablecer/verificar/:token */
  verificar: async (req, res) => {
    try {
      res.status(200).json(await loginService.verificarToken(req.params.token));
    } catch (e) {
      LOGGER.error(`verificar: ${e.stack}`);
      res.status(500).json(0);
    }
  },

  /** POST /login/restablecer  { token, clave } */
  restablecer: async (req, res) => {
    //-- En Java @Valid sin BindingResult respondía 400 si faltaban datos
    const { datos, errores } = validarDto('TokenRequestDTO', req.body);
    if (errores.length > 0) return res.status(400).json(0);
    try {
      return res.status(200).json(await loginService.restablecerClave(datos.token, datos.clave));
    } catch (e) {
      LOGGER.error(`restablecer: ${e.stack}`);
      return res.status(500).json(0);
    }
  },
};
