/**
 * RestFull de Maestros: multitabla (catálogos y parámetros) y apariencia del sistema
 */
const catalogoService = require('../services/catalogoService');
const multitablaService = require('../services/multitablaService');
const aparienciaService = require('../services/aparienciaService');

const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

module.exports = {
  //-- Multitabla
  multitabla: async (req, res) => res.json(await catalogoService.multitabla(req.params.codigoTabla, texto(req.query.codigoPadre))),
  multitablaTablas: async (req, res) => res.json(await multitablaService.tablas()),
  multitablaAdmin: async (req, res) => res.json(await multitablaService.listarAdmin(req.params.codigoTabla, texto(req.query.codigoPadre))),
  multitablaCatalogos: async (req, res) => res.json(await multitablaService.catalogos(texto(req.query.tablas))),
  multitablaGuardar: async (req, res) => res.json(await multitablaService.guardar(req.body)),
  multitablaEstado: async (req, res) => res.json(await multitablaService.cambiarEstado(req.body)),

  //-- Apariencia (la pública no pide token: la usa el login)
  aparienciaPublica: async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json(await aparienciaService.publica());
  },
  aparienciaGuardar: async (req, res) => res.json(await aparienciaService.guardar(req.body)),
  aparienciaFondoLogin: async (req, res) => res.json(await aparienciaService.fondoLogin(req.file)),
  aparienciaQuitarFondo: async (req, res) => res.json(await aparienciaService.quitarFondo()),
};
