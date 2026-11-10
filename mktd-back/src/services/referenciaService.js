/**
 * Datos de referencia que usan los servicios de MarketData (salen de la multitabla):
 *   - UBIGEO: valida que exista y devuelve su nivel y nombres (departamento / provincia / distrito)
 *   - Sectores económicos CIIU (033): nombre de cada sección
 * Se guardan 5 minutos en memoria para no consultar la base en cada análisis.
 */
const { MktdTXException } = require('../exceptions');
const catalogoRepository = require('../repositories/catalogoRepository');
const MT = require('../config/tablas');

const CACHE_MS = 5 * 60 * 1000;
let sectores = null;
let sectoresHasta = 0;

const NIVEL_POR_LARGO = { 2: 'DEPARTAMENTO', 4: 'PROVINCIA', 6: 'DISTRITO' };
const TABLA_POR_LARGO = { 2: MT.DEPARTAMENTO, 4: MT.PROVINCIA, 6: MT.DISTRITO };

/** "150101" -> { ubigeo, nivel: 'DISTRITO', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', nombreZona: 'LIMA, LIMA, LIMA' } */
async function resolverUbigeo(ubigeo) {
  const u = String(ubigeo || '').trim();
  if (!/^(\d{2}|\d{4}|\d{6})$/.test(u)) throw new MktdTXException('Seleccione un departamento, provincia o distrito válido (UBIGEO de 2, 4 o 6 dígitos)');
  const [dep, prov, dist] = await Promise.all([
    catalogoRepository.multitablaPorTablaCodigo(MT.DEPARTAMENTO, u.slice(0, 2)),
    u.length >= 4 ? catalogoRepository.multitablaPorTablaCodigo(MT.PROVINCIA, u.slice(0, 4)) : null,
    u.length === 6 ? catalogoRepository.multitablaPorTablaCodigo(MT.DISTRITO, u) : null,
  ]);
  const actual = { 2: dep, 4: prov, 6: dist }[u.length];
  if (!actual) throw new MktdTXException(`El UBIGEO ${u} no existe en la multitabla (${TABLA_POR_LARGO[u.length]})`);
  const zona = {
    ubigeo: u,
    nivel: NIVEL_POR_LARGO[u.length],
    departamento: dep ? dep.valor : null,
    provincia: prov ? prov.valor : null,
    distrito: dist ? dist.valor : null,
  };
  zona.nombreZona = [zona.distrito, zona.provincia, zona.departamento].filter(Boolean).join(', ');
  return zona;
}

/** { A: { nombre, nombreOficial, color }, ... } */
async function mapaSectores() {
  if (sectores && Date.now() < sectoresHasta) return sectores;
  const filas = await catalogoRepository.multitablaPorCodigo(MT.SECTOR_ECONOMICO);
  sectores = {};
  filas.forEach((f) => { sectores[f.codigo] = { nombre: f.valor, nombreOficial: f.valorAux, color: f.valorAux2 }; });
  sectoresHasta = Date.now() + CACHE_MS;
  return sectores;
}

async function nombreSector(codigo) {
  if (!codigo) return null;
  const m = await mapaSectores();
  return m[codigo] ? m[codigo].nombre : codigo;
}

/** Valida que el rubro de interés exista en el catálogo 033 (null = sin rubro) */
async function validarSector(codigo) {
  if (codigo === null || codigo === undefined || codigo === '') return null;
  const c = String(codigo).trim().toUpperCase();
  const m = await mapaSectores();
  if (!m[c]) throw new MktdTXException(`El rubro ${c} no existe en el catálogo de sectores económicos`);
  return c;
}

function limpiarCache() {
  sectores = null;
}

module.exports = { resolverUbigeo, mapaSectores, nombreSector, validarSector, limpiarCache };
