/**
 * Maestros > Multitabla: mantenedor de todos los catálogos y parámetros del sistema.
 * Qué se puede hacer en cada tabla lo decide su estado_tabla (convención del proyecto):
 *   1 solo lectura · 2 CRUD del valor · 3 CRUD del valor y valor aux · 4 solo modificar el valor
 *   5 solo modificar el valor aux · 6 modificar valor y valor aux, sin agregar ni desactivar
 * Los catálogos 6 los usa la lógica del sistema (estados, tipos): sus CÓDIGOS no cambian,
 * pero sí el texto que ve el usuario, el color y la explicación.
 */
const { Op, fn, col } = require('sequelize');
const { Multitabla } = require('../models');
const { MktdTXException } = require('../exceptions');
const { exito, itemBase } = require('../utils/respuesta');
const { validarPermiso } = require('./seguridadService');
const parametros = require('../utils/parametros');
const MT = require('../config/tablas');

const REGLAS = {
  1: { agregar: false, valor: false, aux: false, estado: false, nombre: 'Solo lectura' },
  2: { agregar: true, valor: true, aux: false, estado: true, nombre: 'Agregar y modificar el valor' },
  3: { agregar: true, valor: true, aux: true, estado: true, nombre: 'Agregar y modificar valor y valor aux' },
  4: { agregar: false, valor: true, aux: false, estado: false, nombre: 'Solo modificar el valor' },
  5: { agregar: false, valor: false, aux: true, estado: false, nombre: 'Solo modificar el valor aux' },
  6: { agregar: false, valor: true, aux: true, estado: false, nombre: 'Catálogo del sistema: textos y colores' },
};
const COLORES = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
const regla = (estadoTabla) => REGLAS[Number(estadoTabla)] || REGLAS[1];
const limpio = (v) => (v === null || v === undefined ? '' : String(v).trim());

/** GET /multitabla/tablas */
async function tablas() {
  const filas = await Multitabla.findAll({
    attributes: [
      'codigoTabla', 'nombreTabla', 'estadoTabla',
      [fn('COUNT', col('id_multitabla')), 'total'],
      [fn('SUM', col('flkactivo')), 'activos'],
      [fn('COUNT', col('codigo_padre')), 'conPadre'],
    ],
    group: ['codigoTabla', 'nombreTabla', 'estadoTabla'],
    order: [['codigoTabla', 'ASC']],
    raw: true,
  });
  return exito({
    listados: filas.map((t) =>
      itemBase({
        codigoTabla: t.codigoTabla,
        nombreTabla: t.nombreTabla,
        estadoTabla: t.estadoTabla,
        regla: regla(t.estadoTabla),
        total: Number(t.total),
        activos: Number(t.activos),
        tablaPadre: MT.PADRES[t.codigoTabla] || null,
      })
    ),
  });
}

/** GET /multitabla/admin/:codigoTabla?codigoPadre= (incluye inactivos) */
async function listarAdmin(codigoTabla, codigoPadre) {
  const lista = await Multitabla.findAll({
    where: { codigoTabla, ...(codigoPadre ? { codigoPadre } : {}) },
    order: [['orden', 'ASC'], ['valor', 'ASC']],
  });
  return exito({
    listados: lista.map((m) =>
      itemBase({
        idMultitabla: m.idMultitabla, codigoTabla: m.codigoTabla, nombreTabla: m.nombreTabla, codigo: m.codigo, orden: m.orden,
        valor: m.valor, valorAux: m.valorAux, valorAux2: m.valorAux2, codigoPadre: m.codigoPadre, estadoTabla: m.estadoTabla, flkactivo: m.flkactivo,
      })
    ),
  });
}

/**
 * GET /multitabla/catalogos?tablas=019,020 — catálogos activos para el front (combos, textos y colores de estados).
 * Sin `tablas` devuelve los catálogos del sistema (estado_tabla 6), los parámetros generales (031) y los sectores CIIU (033).
 */
async function catalogos(tablasTexto) {
  const pedidas = tablasTexto ? String(tablasTexto).split(',').map((t) => t.trim()).filter((t) => /^\d{3}$/.test(t)) : [];
  const where = { flkactivo: true, ...(pedidas.length ? { codigoTabla: { [Op.in]: pedidas } } : { [Op.or]: [{ estadoTabla: '6' }, { codigoTabla: { [Op.in]: [MT.PARAMETRO_GENERAL, MT.SECTOR_ECONOMICO] } }] }) };
  const filas = await Multitabla.findAll({ where, order: [['codigoTabla', 'ASC'], ['orden', 'ASC']] });
  const mapa = {};
  filas.forEach((m) => {
    (mapa[m.codigoTabla] = mapa[m.codigoTabla] || []).push({ codigo: m.codigo, valor: m.valor, valorAux: m.valorAux, valorAux2: m.valorAux2, orden: m.orden });
  });
  return exito({ catalogos: mapa });
}

async function datosTabla(codigoTabla) {
  const ejemplo = await Multitabla.findOne({ where: { codigoTabla } });
  if (!ejemplo) throw new MktdTXException(`No existe la tabla ${codigoTabla}`);
  return ejemplo;
}

/** POST /multitabla/guardar (sin idMultitabla = valor nuevo) */
async function guardar(request) {
  await validarPermiso('MULTITABLA_EDITAR', 'editar la multitabla');
  const codigoTabla = limpio(request.codigoTabla);
  const tabla = await datosTabla(codigoTabla);
  const r = regla(tabla.estadoTabla);
  const valor = limpio(request.valor);
  const valorAux = limpio(request.valorAux) || null;
  const valorAux2 = limpio(request.valorAux2) || null;
  const orden = request.orden === null || request.orden === undefined || request.orden === '' ? null : parseInt(request.orden, 10);
  if (orden !== null && (Number.isNaN(orden) || orden < 0)) throw new MktdTXException('El orden debe ser un número positivo');
  if (tabla.estadoTabla === '6' && valorAux && !COLORES.includes(valorAux)) {
    throw new MktdTXException(`El color debe ser uno de: ${COLORES.join(', ')}`);
  }
  if (valor.length > 200 || (valorAux || '').length > 200 || (valorAux2 || '').length > 200) throw new MktdTXException('Cada campo admite hasta 200 caracteres');

  let registro;
  if (!request.idMultitabla) {
    if (!r.agregar) throw new MktdTXException(`En "${tabla.nombreTabla}" no se agregan valores (${r.nombre})`);
    if (!valor) throw new MktdTXException('Ingrese el valor');
    let codigoPadre = null;
    const tablaPadre = MT.PADRES[codigoTabla];
    if (tablaPadre) {
      codigoPadre = limpio(request.codigoPadre);
      if (!codigoPadre || !(await Multitabla.findOne({ where: { codigoTabla: tablaPadre, codigo: codigoPadre } }))) {
        throw new MktdTXException('Seleccione a qué valor pertenece (tabla padre)');
      }
    }
    let codigo = limpio(request.codigo).toUpperCase();
    if (!codigo) {
      const codigos = await Multitabla.findAll({ attributes: ['codigo'], where: { codigoTabla } });
      codigo = String(codigos.reduce((m, c) => (/^\d+$/.test(c.codigo || '') ? Math.max(m, Number(c.codigo)) : m), 0) + 1);
    }
    if (!/^[A-Z0-9_ -]{1,100}$/.test(codigo)) throw new MktdTXException('El código admite letras, números, guion y guion bajo');
    if (await Multitabla.findOne({ where: { codigoTabla, codigo } })) throw new MktdTXException(`El código ${codigo} ya existe en ${tabla.nombreTabla}`);
    const maxOrden = (await Multitabla.max('orden', { where: { codigoTabla } })) || 0;
    registro = await Multitabla.create({
      codigoTabla, nombreTabla: tabla.nombreTabla, codigo, orden: orden ?? maxOrden + 1, valor,
      valorAux: r.aux ? valorAux : null, valorAux2: r.aux ? valorAux2 : null, codigoPadre, estadoTabla: tabla.estadoTabla, flkactivo: true,
    });
  } else {
    registro = await Multitabla.findByPk(request.idMultitabla);
    if (!registro || registro.codigoTabla !== codigoTabla) throw new MktdTXException('No existe el valor a modificar');
    if (!r.valor && !r.aux) throw new MktdTXException(`"${tabla.nombreTabla}" es de solo lectura`);
    if (r.valor) {
      //-- en parámetros un valor vacío es válido (ej. SEPARADOR_NUMERO); en el resto no
      if (!valor && codigoTabla !== MT.PARAMETRO_GENERAL) throw new MktdTXException('Ingrese el valor');
      registro.valor = valor;
      if (orden !== null) registro.orden = orden;
    }
    if (r.aux) { registro.valorAux = valorAux; registro.valorAux2 = valorAux2; }
    await registro.save();
  }
  if (codigoTabla === MT.PARAMETRO_GENERAL) await parametros.cargar();
  if (codigoTabla === MT.APARIENCIA) require('./aparienciaService').limpiarCache();
  if (codigoTabla === MT.SECTOR_ECONOMICO) require('./referenciaService').limpiarCache();
  return exito({ id: String(registro.idMultitabla), mensajeRespuesta: `${tabla.nombreTabla}: ${registro.codigo} guardado` });
}

/** POST /multitabla/estado */
async function cambiarEstado(request) {
  await validarPermiso('MULTITABLA_EDITAR', 'editar la multitabla');
  const registro = await Multitabla.findByPk(request.idMultitabla);
  if (!registro) throw new MktdTXException('No existe el valor');
  const r = regla(registro.estadoTabla);
  if (!r.estado) throw new MktdTXException(`En "${registro.nombreTabla}" no se desactivan valores (${r.nombre})`);
  registro.flkactivo = request.flkactivo === true;
  await registro.save();
  return exito({ mensajeRespuesta: `${registro.valor} ${registro.flkactivo ? 'activado' : 'desactivado'}` });
}

module.exports = { tablas, listarAdmin, catalogos, guardar, cambiarEstado, REGLAS };
