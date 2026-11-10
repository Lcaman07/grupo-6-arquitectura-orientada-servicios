/**
 * Convierte y valida el body según el DTO (equivalente a @Valid + BindingResult)
 * Si hay errores lanza MktdSOAException con el detalle por campo, igual que los controllers de Java.
 */
const DTOS = require('./dtos');
const C = require('../config/constantes');
const { obtenerMensaje, obtenerMensajeValidacion } = require('../config/messages');
const { MktdSOAException } = require('../exceptions');
const { toInt, toBool, esVacio } = require('../utils/utilitarios');

function convertir(valor, tipo) {
  if (typeof tipo === 'object' && tipo.list) {
    return Array.isArray(valor) ? valor.map((item) => convertirObjeto(item || {}, tipo.list)) : null;
  }
  switch (tipo) {
    case 'int': return toInt(valor);
    case 'bool': return toBool(valor);
    case 'decimal': return valor === undefined || valor === null || valor === '' || Number.isNaN(Number(valor)) ? null : Number(valor);
    case 'string': return valor === undefined || valor === null ? null : String(valor);
    default: return valor;
  }
}

function convertirObjeto(body, campos) {
  const out = {};
  Object.entries(campos).forEach(([campo, tipo]) => { out[campo] = convertir(body[campo], tipo); });
  return out;
}

/** Evalúa una regla. Devuelve true si es válida */
function cumple(regla, valor) {
  if (regla === 'NotBlank') return !esVacio(valor);
  if (regla === 'NotNull') return valor !== null && valor !== undefined;
  if (regla.Pattern) return valor === null || regla.Pattern.test(valor);
  //-- @Min sobre un String numérico compara el valor numérico (igual que Hibernate Validator)
  if (regla.Min !== undefined) return valor === null || !/^-?\d+$/.test(valor) || Number(valor) >= regla.Min;
  return true;
}

const nombreRegla = (regla) => (typeof regla === 'string' ? regla : Object.keys(regla)[0]);
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Valida un objeto contra un DTO. Devuelve { datos, errores }
 */
function validarDto(nombreDto, body) {
  const dto = DTOS[nombreDto];
  if (!dto) throw new Error(`DTO no definido: ${nombreDto}`);
  const datos = convertirObjeto(body || {}, dto.campos);
  const resource = lowerFirst(nombreDto);
  const errores = [];

  Object.entries(dto.reglas).forEach(([campo, reglas]) => {
    for (const regla of reglas) {
      if (!cumple(regla, datos[campo])) {
        const code = nombreRegla(regla);
        errores.push({
          resource,
          field: campo,
          code,
          message: obtenerMensajeValidacion(`${code}.${resource}.${campo}`),
        });
      }
    }
  });
  return { datos, errores };
}

/** Middleware de Express: reemplaza req.body por el DTO ya convertido */
const validar = (nombreDto) => (req, res, next) => {
  console.log(`Validando DTO ${nombreDto} para ${req.method} ${req.originalUrl}`);
  const { datos, errores } = validarDto(nombreDto, req.body);
  if (errores.length > 0) {
    return next(new MktdSOAException(obtenerMensaje(C.MENSAJE_GENERICO_SOAEXCEPTION, [nombreDto]), errores));
  }
  req.body = datos;
  return next();
};

module.exports = { validar, validarDto };
