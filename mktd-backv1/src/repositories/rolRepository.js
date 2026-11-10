/**
 * Equivalente a RolRepository.java
 */
const { Rol } = require('../models');

module.exports = {
  findAll: () => Rol.findAll(),
  findByRolActivo: () => Rol.findAll({ where: { flkactivo: true } }),
  findById: (idRol) => Rol.findByPk(idRol),
  changeState: (idRol, estado) => Rol.update({ flkactivo: estado }, { where: { idRol } }),
  /** Inserta o actualiza (como save() de JPA con id) */
  upsert: (data) => Rol.upsert(data),
  save: (rol) => rol.save(),
  create: (data) => Rol.create(data),
};
