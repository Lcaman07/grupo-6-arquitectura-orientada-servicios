/**
 * Servicio EXTERNO simulado del INEI — REST / JSON
 * ----------------------------------------------------------------------------
 *   GET  {INEI_URL}/salud
 *   GET  {INEI_URL}/ubigeo/{ubigeo}/indicadores      ubigeo de 2 (departamento), 4 (provincia) o 6 (distrito) dígitos
 *
 * El formato es a propósito DISTINTO al de MarketData (lista de indicadores con códigos y valores en texto):
 * el adaptador REST (integracion/ineiRestAdapter.js) lo transforma a la estructura interna.
 */
const express = require('express');
const datos = require('./datos');
const simulacion = require('./simulacion');

const router = express.Router();

const falla = (res, mensaje) => res.status(503).json({ status: 503, error: 'SERVICE_UNAVAILABLE', message: mensaje });
router.use(simulacion.middleware('INEI', falla));

router.get('/salud', (req, res) => res.json({ status: 'UP', servicio: 'INEI - Indicadores territoriales (simulado)', modo: simulacion.obtener().INEI }));

router.get('/ubigeo/:ubigeo/indicadores', (req, res) => {
  const { ubigeo } = req.params;
  if (!/^(\d{2}|\d{4}|\d{6})$/.test(ubigeo)) {
    return res.status(400).json({ status: 400, error: 'BAD_REQUEST', message: 'El ubigeo debe tener 2, 4 o 6 dígitos' });
  }
  const z = datos.indicadoresZona(ubigeo);
  if (!z) return res.status(404).json({ status: 404, error: 'NOT_FOUND', message: `No existe el ubigeo ${ubigeo}` });

  const txt = (n, dec = 0) => Number(n).toFixed(dec);
  return res.json({
    codigoUbigeo: z.ubigeo,
    nivelTerritorial: z.nivel,
    descripcion: [z.departamento, z.provincia, z.distrito].filter(Boolean).join(' / '),
    anioReferencia: datos.ANIO_CENSO,
    fuente: 'INEI - Censo 2017 (reparto distrital simulado)',
    numeroDistritos: z.distritos,
    indicadores: [
      { codigo: 'POB_TOT', descripcion: 'Población total', valor: txt(z.pob), unidad: 'hab' },
      { codigo: 'POB_URB', descripcion: 'Población urbana', valor: txt(z.urb), unidad: 'hab' },
      { codigo: 'POB_RUR', descripcion: 'Población rural', valor: txt(z.pob - z.urb), unidad: 'hab' },
      { codigo: 'POB_HOM', descripcion: 'Población masculina', valor: txt(z.hom), unidad: 'hab' },
      { codigo: 'POB_MUJ', descripcion: 'Población femenina', valor: txt(z.pob - z.hom), unidad: 'hab' },
      { codigo: 'VIV_HOG', descripcion: 'Hogares', valor: txt(z.hog), unidad: 'hogares' },
      { codigo: 'SUP_KM2', descripcion: 'Superficie', valor: txt(z.sup, 2), unidad: 'km2' },
      { codigo: 'EDAD_PROM', descripcion: 'Edad promedio', valor: txt(z.edad, 1), unidad: 'años' },
      { codigo: 'POBREZA_PCT', descripcion: 'Población en situación de pobreza', valor: txt(z.pobreza, 1), unidad: '%' },
      { codigo: 'PEA', descripcion: 'Población económicamente activa', valor: txt(z.pea), unidad: 'hab' },
    ],
  });
});

module.exports = router;
