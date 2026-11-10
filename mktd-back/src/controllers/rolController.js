/**
 * Equivalente a RolController.java
 */
const rolService = require('../services/rolService');
const { toInt, toBool } = require('../utils/utilitarios');

module.exports = {
  registro: async (req, res) => res.json(await rolService.rolRegistro(req.body)),
  listados: async (req, res) => res.json(await rolService.rolListado()),
  inicializacion: async (req, res) => res.json(await rolService.rolInicializacion()),
  modificar: async (req, res) => res.json(await rolService.rolModificar(req.body)),
  mostrar: async (req, res) => res.json(await rolService.rolMostrar(toInt(req.params.idrol))),
  cambiarEstado: async (req, res) =>
    res.json(await rolService.rolCambiarEstado(toInt(req.params.idrol), toBool(req.params.estado))),
  modificarEstado: async (req, res) => res.json(await rolService.modificarEstado(req.body)),
};
