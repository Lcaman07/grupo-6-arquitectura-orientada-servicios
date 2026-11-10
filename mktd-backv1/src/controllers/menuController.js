/**
 * Equivalente a MenuController.java
 */
const menuService = require('../services/menuService');
const { toInt } = require('../utils/utilitarios');

module.exports = {
  listados: async (req, res) => res.json(await menuService.menuInicializacion()),
  activos: async (req, res) => res.json(await menuService.menuByActivoInicializacion()),
  registro: async (req, res) => res.json(await menuService.menuRegistro(req.body)),
  mostrar: async (req, res) => res.json(await menuService.menuMostrar(toInt(req.params.idMenu))),
  modificarEstado: async (req, res) => res.json(await menuService.modificarEstado(req.body)),
};
