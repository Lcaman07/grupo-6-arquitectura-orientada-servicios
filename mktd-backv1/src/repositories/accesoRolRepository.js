/**
 * Equivalente a AccesoRolRepository.java
 */
const { QueryTypes } = require('sequelize');
const { sequelize, AccesoRol, Acceso, Rol, Menu } = require('../models');

module.exports = {
  /** Accesos de un rol con su acceso, rol y menú, ordenados por menú y acceso */
  findByRol: (idRol) =>
    AccesoRol.findAll({
      where: { idRol },
      include: [
        { model: Acceso, as: 'acceso', required: true, include: [{ model: Menu, as: 'menu', required: false }] },
        { model: Rol, as: 'rol', required: true },
      ],
      order: [
        [{ model: Acceso, as: 'acceso' }, { model: Menu, as: 'menu' }, 'orden', 'ASC'],
        [{ model: Acceso, as: 'acceso' }, 'orden', 'ASC'],
      ],
    }),

  /** Elimina todos los accesos de un rol */
  deleteByRol: (idRol, options = {}) => AccesoRol.destroy({ where: { idRol }, ...options }),

  create: (data, options) => AccesoRol.create(data, options),

  /** true si el usuario (por su rol) tiene el acceso con ese path (acción tipo 'A', ej. AJUSTE_APROBAR) */
  tienePermiso: async (usuario, path) => {
    const [fila] = await sequelize.query(
      `SELECT 1 AS ok FROM usuario u
         JOIN rol r ON r.idRol = u.idRol AND r.flkactivo = 1
         JOIN acceso_rol ar ON ar.idRol = r.idRol
         JOIN acceso a ON a.idAcceso = ar.idAcceso AND a.flkactivo = 1
        WHERE u.usuario = :usuario AND u.flkactivo = 1 AND a.path = :path LIMIT 1`,
      { replacements: { usuario, path }, type: QueryTypes.SELECT }
    );
    return Boolean(fila);
  },
};
