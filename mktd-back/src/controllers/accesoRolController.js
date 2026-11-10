/**
 * Equivalente a AccesoRolController.java
 */
const accesoRolService = require('../services/accesoRolService');
const { toInt } = require('../utils/utilitarios');

module.exports = {
  listaPorRol: async (req, res) => res.json(await accesoRolService.accesosPorRol(toInt(req.params.idRol))),
  registro: async (req, res) => res.json(await accesoRolService.registro(req.body)),
  modificar: async (req, res) => res.json(await accesoRolService.modificar(req.body)),
};
