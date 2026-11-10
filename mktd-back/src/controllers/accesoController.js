/**
 * Equivalente a AccesoController.java
 */
const accesoService = require('../services/accesoService');
const { toInt } = require('../utils/utilitarios');

module.exports = {
  accesos: async (req, res) => res.json(await accesoService.accesos()),
  registro: async (req, res) => res.json(await accesoService.accesoRegistro(req.body)),
  listados: async (req, res) => res.json(await accesoService.accesoInicializacion()),
  mostrar: async (req, res) => res.json(await accesoService.accesoMostrar(toInt(req.params.idAcceso))),
  modificarEstado: async (req, res) => res.json(await accesoService.modificarEstado(req.body)),
};
