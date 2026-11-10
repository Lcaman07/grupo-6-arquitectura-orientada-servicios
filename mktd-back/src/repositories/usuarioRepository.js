/**
 * Equivalente a UsuarioRepository.java + ILoginRepository.java
 */
const { literal } = require('sequelize');
const { Usuario, Rol, Multitabla } = require('../models');

module.exports = {
  findAll: () => Usuario.findAll(),

  /** Listado para la pantalla Usuarios: tipo de documento y si tiene foto, sin traer el blob (una sola consulta) */
  listado: () =>
    Usuario.findAll({
      attributes: {
        include: [
          [literal('(SELECT m.valor FROM multitabla m WHERE m.id_multitabla = `Usuario`.`idTipoDocumento`)'), 'tipoDocumento'],
          [literal('`Usuario`.`foto` IS NOT NULL'), 'tieneFoto'],
          [literal('LEFT(MD5(`Usuario`.`foto`), 10)'), 'fotoVersion'],
          [literal('(SELECT r.nombre FROM rol r WHERE r.idRol = `Usuario`.`idRol`)'), 'rol'],
        ],
      },
      order: [['idUsuario', 'ASC']],
      raw: true,
    }),

  /** Usuario activo por nombre de usuario */
  findByUsuarioActivo: (usuario) => Usuario.findOne({ where: { flkactivo: true, usuario } }),

  /** Usuario activo con su rol */
  findByUserCodeAndUGpClaveWeb: (usuario) =>
    Usuario.findOne({
      where: { flkactivo: true, usuario },
      include: [{ model: Rol, as: 'rol', required: true }],
    }),

  findById: (idUsuario) => Usuario.findByPk(idUsuario),
  findByUsuarioConRol: (usuario) => Usuario.findOne({ where: { usuario }, include: [{ model: Rol, as: 'rol', required: false }] }),
  findByUsuario: (usuario) => Usuario.findOne({ where: { usuario } }),

  /** Si tiene foto y una versión corta (cambia cuando cambia la foto) sin traer el blob */
  infoFoto: async (idUsuario) => {
    const u = await Usuario.findByPk(idUsuario, {
      attributes: ['idUsuario', [literal('foto IS NOT NULL'), 'tieneFoto'], [literal('LEFT(MD5(foto), 10)'), 'fotoVersion']],
      raw: true,
    });
    return u ? { tieneFoto: Number(u.tieneFoto) === 1, fotoVersion: u.fotoVersion } : { tieneFoto: false, fotoVersion: null };
  },
  /** Solo la foto (el defaultScope la excluye de las demás consultas) */
  foto: (idUsuario) => Usuario.scope('conFoto').findByPk(idUsuario, { attributes: ['idUsuario', 'foto'] }),
  tipoDocumento: (id) => Multitabla.findOne({ where: { idMultitabla: id, codigoTabla: '004' } }),

  /** Guarda la foto (en Java se llamaba changeState) */
  guardarFoto: (idUsuario, foto) => Usuario.update({ foto }, { where: { idUsuario } }),

  //-- ILoginRepository
  verificarNombreUsuario: (correo) => Usuario.findOne({ where: { usuario: correo } }),
  buscarPorCorreo: (correo) => Usuario.findOne({ where: { correo } }),
  cambiarClave: (clave, idUsuario) => Usuario.update({ contrasena: clave }, { where: { idUsuario } }),

  save: (usuario) => usuario.save(),
  create: (data) => Usuario.create(data),
};
