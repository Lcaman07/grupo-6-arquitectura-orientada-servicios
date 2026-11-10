/**
 * Parámetros generales del negocio (multitabla 031 "Parametro General").
 * Se cargan en memoria al iniciar el servidor y se recargan cuando se editan
 * desde Maestros > Multitabla (y cada REFRESCO_MS por si alguien los cambió directo en la BD).
 * Lo técnico (puertos, BD, JWT, URLs de INEI / SUNAT...) va en el .env; esto es lo que decide el negocio.
 */
const TABLA_PARAMETROS = '031';
const REFRESCO_MS = 5 * 60 * 1000;

//-- valores por defecto: solo se usan si el parámetro aún no existe en la BD
const DEFECTO = {
  EMPRESA_NOMBRE: 'MarketData Perú S.A.C.',
  CACHE_VIGENCIA_HORAS: '168',
  REINTENTOS_MAX: '3',
  REINTENTO_ESPERA_MS: '400',
  TIMEOUT_EXTERNO_MS: '6000',
  PESO_DEMANDA: '40',
  PESO_COMPETENCIA: '35',
  PESO_PODER_ADQUISITIVO: '25',
  REFERENCIA_EMPRESAS_MIL: '45',
  MUESTRA_EMPRESAS: '15',
  FOTO_USUARIO_PX: '256',
  FOTO_USUARIO_MAX_KB: '150',
  LOGIN_IMAGEN_PX: '1920',
};

let cache = {};
let cargadoEn = 0;

async function cargar() {
  const { Multitabla } = require('../models');
  const filas = await Multitabla.findAll({ where: { codigoTabla: TABLA_PARAMETROS, flkactivo: true } });
  const nuevo = {};
  filas.forEach((f) => { nuevo[f.codigo] = f.valor === null || f.valor === undefined ? '' : String(f.valor); });
  cache = nuevo;
  cargadoEn = Date.now();
  return cache;
}

/** Recarga en segundo plano si pasó el tiempo de refresco (no bloquea la petición) */
function refrescarSiToca() {
  if (cargadoEn && Date.now() - cargadoEn > REFRESCO_MS) cargar().catch(() => {});
}

function texto(codigo) {
  refrescarSiToca();
  if (cache[codigo] !== undefined && cache[codigo] !== '') return cache[codigo];
  return DEFECTO[codigo] !== undefined ? DEFECTO[codigo] : '';
}
function entero(codigo) {
  const n = parseInt(texto(codigo), 10);
  return Number.isNaN(n) ? parseInt(DEFECTO[codigo], 10) : n;
}
function decimal(codigo) {
  const n = Number(texto(codigo));
  return Number.isNaN(n) ? Number(DEFECTO[codigo]) : n;
}
const siNo = (codigo) => String(texto(codigo)).trim().toUpperCase() === 'S';

module.exports = { TABLA_PARAMETROS, cargar, texto, entero, decimal, siNo, DEFECTO };
