/**
 * Equivalente a MenuRepository.java
 */
const { Op } = require('sequelize');
const { Menu } = require('../models');

module.exports = {
  findAll: () => Menu.findAll(),
  findByMenuActivo: () => Menu.findAll({ where: { flkactivo: true } }),
  findById: (idMenu) => Menu.findByPk(idMenu),
  /** Menú con el mismo nombre o el mismo orden */
  findByNombreOrOrden: (nombre, orden) => Menu.findOne({ where: { [Op.or]: [{ nombre }, { orden }] } }),
  save: (menu) => menu.save(),
  create: (data) => Menu.create(data),
};
