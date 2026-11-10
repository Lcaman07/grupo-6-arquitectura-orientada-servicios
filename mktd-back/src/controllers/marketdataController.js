/**
 * Controladores REST de MarketData (capa de exposición / control)
 * Solo convierten parámetros HTTP y delegan en la capa de servicios; devuelven JSON.
 *   Servicio Territorial  : GET  /api/v1/territorial/indicadores/:ubigeo
 *   Servicio Empresarial  : GET  /api/v1/empresarial/ruc/:ruc · GET /api/v1/empresarial/zona/:ubigeo
 *   Servicio Orquestador  : POST /api/v1/analisis/zona
 *   Consultas guardadas   : /api/v1/analisis/listados · mostrar/:id · comparar · dashboard
 *   Integración           : /api/v1/integracion/bitacora · estado · simulacion · limpiarCache
 */
const territorialService = require('../services/territorialService');
const empresarialService = require('../services/empresarialService');
const orquestadorService = require('../services/orquestadorService');
const analisisService = require('../services/analisisService');
const integracionService = require('../services/integracionService');
const { toInt } = require('../utils/utilitarios');

const forzar = (req) => String(req.query.forzar || '').toLowerCase() === 'true';

module.exports = {
  territorialIndicadores: async (req, res) => res.json(await territorialService.indicadores(req.params.ubigeo, forzar(req))),

  empresarialRuc: async (req, res) => res.json(await empresarialService.ruc(req.params.ruc, forzar(req))),
  empresarialZona: async (req, res) => res.json(await empresarialService.zona(req.params.ubigeo, forzar(req))),

  analizarZona: async (req, res) => res.json(await orquestadorService.analizarZona(req.body)),
  analisisListados: async (req, res) => res.json(await analisisService.listar(req.query)),
  analisisMostrar: async (req, res) => res.json(await analisisService.mostrar(toInt(req.params.id))),
  analisisComparar: async (req, res) => res.json(await analisisService.comparar(req.query.ids)),
  dashboard: async (req, res) => res.json(await analisisService.dashboard()),

  bitacora: async (req, res) => res.json(await integracionService.bitacora(req.query)),
  estadoIntegracion: async (req, res) => res.json(await integracionService.estado()),
  simulacion: async (req, res) => res.json(await integracionService.simular(req.body)),
  limpiarCache: async (req, res) => res.json(await integracionService.limpiarCache()),
};
