/**
 * Utilitarios de Fechas y Horas (equivalente a DateUtil.java)
 * Formatos soportados: dd, MM, MMMM, yyyy, HH, mm, ss  (ej. 'dd/MM/yyyy HH:mm:ss')
 */
const FORMATO_DIA_DDMMYYYY = 'dd/MM/yyyy';
const FORMATO_DIA_DDMMYYYY_HHMMSS = 'dd/MM/yyyy HH:mm:ss';
const FORMATO_DIA_DDMMYYYY_T_HHMMSS = "yyyy-MM-dd'T'HH:mm:ss";
const FORMATO_DIA_YYYYMMDD = 'yyyyMMdd';
const FORMATO_DIA_YYYY = 'yyyy';
const FORMATO_DIA_MMMM = 'MMMM';
const FORMATO_DIA_DDMMYYYYHHMMSS = 'ddMMyyyyHHmmss';
const FORMATO_DIA_YYYYDDMM = 'yyyyddMM';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n, l = 2) => String(n).padStart(l, '0');
const TOKENS = /MMMM|yyyy|dd|MM|HH|mm|ss|'([^']*)'/g;

/** Date -> String con formato */
function dateToString(date, format) {
  if (!date) return null;
  const d = new Date(date);
  return format.replace(TOKENS, (tok, literal) => {
    if (literal !== undefined) return literal;
    switch (tok) {
      case 'MMMM': return MESES[d.getMonth()];
      case 'yyyy': return String(d.getFullYear());
      case 'dd': return pad(d.getDate());
      case 'MM': return pad(d.getMonth() + 1);
      case 'HH': return pad(d.getHours());
      case 'mm': return pad(d.getMinutes());
      case 'ss': return pad(d.getSeconds());
      default: return tok;
    }
  });
}

/** String -> Date con formato. Devuelve null si no coincide */
function stringToDate(text, format) {
  if (text === null || text === undefined) return null;
  const parts = { yyyy: 1970, MM: 1, dd: 1, HH: 0, mm: 0, ss: 0 };
  const order = [];
  let regex = '';
  let last = 0;
  format.replace(TOKENS, (tok, literal, offset) => {
    regex += format.slice(last, offset).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    if (literal !== undefined) regex += literal.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    else { regex += tok === 'yyyy' ? '(\\d{4})' : '(\\d{2})'; order.push(tok); }
    last = offset + tok.length;
    return tok;
  });
  regex += format.slice(last).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const m = new RegExp(`^${regex}$`).exec(String(text));
  if (!m) return null;
  order.forEach((tok, i) => { parts[tok] = parseInt(m[i + 1], 10); });
  return new Date(parts.yyyy, parts.MM - 1, parts.dd, parts.HH, parts.mm, parts.ss);
}

/** Cambiar el formato de una fecha en texto */
const getDateWithFormat = (date, inputFormat, outputFormat) => dateToString(stringToDate(date, inputFormat), outputFormat);

/** Número de días entre dos fechas */
const getNumberOfDays = (ini, fin) => Math.trunc((new Date(fin) - new Date(ini)) / 86400000);

/** Número de días redondeado entre dos fechas */
const getNumberOfDaysWithoutTime = (ini, fin) => Math.round((new Date(fin) - new Date(ini)) / 86400000);

/** Edad de una persona a partir de su fecha de nacimiento en texto */
function getAgePerson(date, format) {
  const nac = stringToDate(date, format);
  if (!nac) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad -= 1;
  return edad;
}

/** Restar meses */
function getMinusMonths(date, countMonth) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - countMonth);
  return d;
}

/** Restar días */
function getMinusDays(date, countDay) {
  const d = new Date(date);
  d.setDate(d.getDate() - countDay);
  return d;
}

/** Fecha sin hora */
function dateWithoutTime(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

module.exports = {
  FORMATO_DIA_DDMMYYYY,
  FORMATO_DIA_DDMMYYYY_HHMMSS,
  FORMATO_DIA_DDMMYYYY_T_HHMMSS,
  FORMATO_DIA_YYYYMMDD,
  FORMATO_DIA_YYYY,
  FORMATO_DIA_MMMM,
  FORMATO_DIA_DDMMYYYYHHMMSS,
  FORMATO_DIA_YYYYDDMM,
  dateToString,
  stringToDate,
  getDateWithFormat,
  getNumberOfDays,
  getNumberOfDaysWithoutTime,
  getAgePerson,
  getMinusMonths,
  getMinusDays,
  dateWithoutTime,
};
