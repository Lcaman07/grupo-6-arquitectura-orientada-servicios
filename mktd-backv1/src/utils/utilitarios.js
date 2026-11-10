/**
 * Utilitarios de métodos reutilizables (equivalente a Utilitarios.java)
 */
const { obtenerMensaje } = require('../config/messages');

/** Validar si la cadena de texto es vacía así tenga espacios o sea null */
const esVacio = (texto) => texto === undefined || texto === null || String(texto).trim() === '';

/** Validar si los dígitos son numéricos */
const esNumero = (texto) => /^(|[0-9]+)$/.test(String(texto));

/** Validar carnet de extranjería */
const esCEValido = (texto) => /^[N0-9-]*$/.test(String(texto));

/** Redondear hacia arriba (HALF_UP) con la cantidad de decimales indicada */
const obtenerRedondeado = (numero, cantidadDecimales) => {
  const f = 10 ** cantidadDecimales;
  return Math.round((Number(numero) + Number.EPSILON) * f) / f;
};

/** Ocultar texto dejando visibles los primeros "cantidad" caracteres */
const encriptarTexto = (texto, cantidad, caracter = '*') =>
  String(texto)
    .split('')
    .map((c, i) => (i + 1 <= cantidad ? c : caracter))
    .join('');

/** Captura el stacktrace de una excepción */
const obtenerStackTraceFromException = (err) => (err && err.stack) || String(err);

/** Convierte a entero (como hace Jackson con "5" -> 5). Devuelve null si no se puede */
const toInt = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

/** Convierte a boolean primitivo (en Java un boolean ausente vale false) */
const toBool = (v) => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';

module.exports = {
  obtenerMensaje,
  esVacio,
  esNumero,
  esCEValido,
  obtenerRedondeado,
  encriptarTexto,
  obtenerStackTraceFromException,
  toInt,
  toBool,
};
