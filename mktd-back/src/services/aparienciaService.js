/**
 * Apariencia del sistema (Seguridad > Apariencia): colores de la barra superior, menú lateral, pie,
 * fondo y tarjetas, y el fondo del login. Se guardan en la multitabla 032 (valor = #RRGGBB).
 *  - GET  /apariencia/publica   (sin token: el login la necesita antes de ingresar)
 *  - POST /apariencia/guardar   { valores: { COLOR_NAV: '#101010', ... } }   permiso APARIENCIA_EDITAR
 *  - POST /apariencia/fondoLogin (multipart file) | /apariencia/quitarFondo
 */
const { MktdTXException } = require('../exceptions');
const { exito } = require('../utils/respuesta');
const MT = require('../config/tablas');
const parametros = require('../utils/parametros');
const archivos = require('../utils/archivos');
const catalogoRepository = require('../repositories/catalogoRepository');
const { validarPermiso } = require('./seguridadService');

const COLOR = /^#[0-9a-fA-F]{6}$/;
const IMAGEN = 'LOGIN_FONDO_IMAGEN';
//-- los de fábrica (si alguien borra un valor o pide "restaurar")
const ORIGINAL = {
  COLOR_PRINCIPAL: '#e31b23', COLOR_FONDO: '#3f403d', COLOR_TARJETA: '#2b2c29', COLOR_NAV: '#0f0f0f',
  COLOR_ASIDE: '#141414', COLOR_MENU_TEXTO: '#ffffff', COLOR_MENU_ACTIVO: '#e31b23', COLOR_FOOTER: '#2b2c29',
  LOGIN_FONDO_COLOR: '#121212', LOGIN_TARJETA_COLOR: '#121212',
};

let cache = null; //-- se pide en cada página: se guarda en memoria hasta que alguien la cambie

async function leer() {
  if (cache) return cache;
  const filas = await catalogoRepository.multitablaPorCodigo(MT.APARIENCIA);
  const valores = { ...ORIGINAL, [IMAGEN]: '' };
  const detalle = [];
  filas.forEach((f) => {
    const v = f.valor === null || f.valor === undefined ? '' : String(f.valor);
    if (f.codigo === IMAGEN) valores[IMAGEN] = v;
    else if (COLOR.test(v)) valores[f.codigo] = v.toLowerCase();
    detalle.push({ codigo: f.codigo, nombre: f.valorAux2 || f.codigo, tipo: f.valorAux || 'color', orden: f.orden });
  });
  cache = { valores, detalle, version: Date.now() };
  return cache;
}

/** GET /apariencia/publica */
async function publica() {
  const { valores, detalle, version } = await leer();
  return exito({ valores, detalle, original: ORIGINAL, version: String(version) });
}

async function guardarValor(codigo, valor) {
  const fila = await catalogoRepository.multitablaPorTablaCodigo(MT.APARIENCIA, codigo);
  if (!fila) throw new MktdTXException(`No existe ${codigo} en la multitabla 032 (ejecute el script 11_apariencia_maestros.sql)`);
  fila.valor = valor;
  await fila.save();
}

/** POST /apariencia/guardar { valores } */
async function guardar(request) {
  await validarPermiso('APARIENCIA_EDITAR', 'cambiar la apariencia del sistema');
  const valores = request && request.valores && typeof request.valores === 'object' ? request.valores : {};
  const codigos = Object.keys(valores).filter((c) => c !== IMAGEN);
  if (!codigos.length) throw new MktdTXException('No hay colores que guardar');
  for (const c of codigos) {
    if (!ORIGINAL[c]) throw new MktdTXException(`Color desconocido: ${c}`);
    if (!COLOR.test(String(valores[c]))) throw new MktdTXException(`Color inválido en ${c}: use el formato #RRGGBB`);
  }
  for (const c of codigos) await guardarValor(c, String(valores[c]).toLowerCase());
  cache = null;
  return exito({ mensajeRespuesta: 'Apariencia guardada: se verá en todas las pantallas al recargarlas' });
}

/** POST /apariencia/fondoLogin (multipart file) */
async function fondoLogin(file) {
  await validarPermiso('APARIENCIA_EDITAR', 'cambiar el fondo del login');
  const anterior = (await leer()).valores[IMAGEN];
  const ruta = await archivos.guardarImagen('apariencia', 'login', file, 1500);
  await guardarValor(IMAGEN, ruta);
  await archivos.borrar(anterior);
  cache = null;
  return exito({ imagen: ruta, mensajeRespuesta: 'Fondo del login actualizado' });
}

/** POST /apariencia/quitarFondo: vuelve a la imagen original del login */
async function quitarFondo() {
  await validarPermiso('APARIENCIA_EDITAR', 'cambiar el fondo del login');
  const anterior = (await leer()).valores[IMAGEN];
  await guardarValor(IMAGEN, '');
  await archivos.borrar(anterior);
  cache = null;
  return exito({ mensajeRespuesta: 'El login vuelve a su imagen original' });
}

/** Al editar la tabla 032 desde Maestros > Multitabla */
function limpiarCache() { cache = null; }

module.exports = { publica, guardar, fondoLogin, quitarFondo, limpiarCache, ORIGINAL };
