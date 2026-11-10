/**
 * Validación del RUC peruano (11 dígitos, prefijo 10/15/16/17/20 y dígito verificador módulo 11)
 */
const FACTORES = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function digitoVerificador(diez) {
  const suma = FACTORES.reduce((s, f, i) => s + f * Number(diez[i]), 0);
  const r = 11 - (suma % 11);
  return r === 10 ? 0 : r === 11 ? 1 : r;
}

/** Devuelve null si es válido o el motivo del error */
function motivoInvalido(ruc) {
  const r = String(ruc || '').trim();
  if (!/^\d{11}$/.test(r)) return 'El RUC debe tener 11 dígitos numéricos';
  if (!/^(10|15|16|17|20)/.test(r)) return 'El RUC debe empezar con 10, 15, 16, 17 o 20';
  if (digitoVerificador(r.slice(0, 10)) !== Number(r[10])) return 'El RUC no es válido (dígito verificador incorrecto)';
  return null;
}

module.exports = { digitoVerificador, motivoInvalido, esValido: (ruc) => motivoInvalido(ruc) === null };
