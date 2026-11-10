/**
 * RestFull del USUARIO (equivalente a UsuarioController.java + LoginFilter.java)
 */
const usuarioService = require('../services/usuarioService');
const { MktdTXException } = require('../exceptions');
const { toInt } = require('../utils/utilitarios');

module.exports = {
  /** POST /usuarios/ingresos (login) */
  ingreso: async (req, res) => res.json(await usuarioService.usuarioIngreso(req.body)),

  /** GET /usuarios/refreshToken */
  refreshToken: async (req, res) => res.json(await usuarioService.usuarioRefreshToken(req.claims)),

  /** POST /usuarios/registros */
  registro: async (req, res) => res.json(await usuarioService.usuarioRegistro(req.body)),

  /** GET /usuarios/listados */
  listados: async (req, res) => res.json(await usuarioService.usuarioInicializacion()),

  /** GET /usuarios/mostrar/:idUsuario */
  mostrar: async (req, res) => res.json(await usuarioService.usuarioMostrar(toInt(req.params.idUsuario))),

  /** POST /usuarios/saveFoto (multipart: idUsuario, file) */
  guardarFoto: async (req, res) => {
    const idUsuario = toInt(req.body.idUsuario);
    if (!idUsuario) throw new MktdTXException('idUsuario es obligatorio');
    if (!req.file) throw new MktdTXException('file es obligatorio');
    res.json(await usuarioService.guardarFoto(idUsuario, req.file));
  },

  /** POST /usuarios/miFoto (multipart: file) — foto del usuario en sesión */
  guardarMiFoto: async (req, res) => res.json(await usuarioService.guardarMiFoto(req.file)),

  /** GET /usuarios/foto/:idUsuario — la imagen (el navegador la guarda en caché) */
  foto: async (req, res) => {
    const foto = await usuarioService.obtenerFoto(toInt(req.params.idUsuario));
    if (!foto) return res.status(404).json({ codigoRespuesta: '99', mensajeRespuesta: 'El usuario no tiene foto' });
    res.setHeader('Content-Type', foto.tipo);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.send(foto.buffer);
  },

  /** GET /usuarios/miPerfil */
  miPerfil: async (req, res) => res.json(await usuarioService.miPerfil()),

  /** POST /usuarios/miPerfil */
  guardarMiPerfil: async (req, res) => res.json(await usuarioService.guardarMiPerfil(req.body)),

  /** POST /usuarios/modificar */
  modificarEstado: async (req, res) => res.json(await usuarioService.modificarEstado(req.body)),
};
