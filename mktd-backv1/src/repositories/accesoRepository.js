/**
 * Equivalente a AccesoRepository.java
 */
const { Acceso, Menu } = require('../models');

const orden = [
  [{ model: Menu, as: 'menu' }, 'orden', 'ASC'],
  ['orden', 'ASC'],
];

module.exports = {
  /** Accesos activos con menú activo, ordenados por menú y acceso */
  findAllAccesos: () =>
    Acceso.findAll({
      where: { flkactivo: true },
      include: [{ model: Menu, as: 'menu', required: true, where: { flkactivo: true } }],
      order: orden,
    }),

  /** Todos los accesos (activos o no) con menú activo */
  findByAllAcceso: () =>
    Acceso.findAll({
      include: [{ model: Menu, as: 'menu', required: true, where: { flkactivo: true } }],
      order: orden,
    }),

  findById: (idAcceso, options = {}) =>
    Acceso.findByPk(idAcceso, { include: [{ model: Menu, as: 'menu' }], ...options }),

  findByNombre: (nombre) => Acceso.findOne({ where: { nombre } }),

  save: (acceso, options) => acceso.save(options),
  create: (data, options) => Acceso.create(data, options),
};
