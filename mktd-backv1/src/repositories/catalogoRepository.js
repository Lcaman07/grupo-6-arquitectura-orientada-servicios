/**
 * Consultas a la multitabla (ubigeo, sectores CIIU, estados, parámetros, apariencia)
 */
const { Multitabla } = require('../models');

module.exports = {
  /** Lista de una multitabla (activos, por orden). codigoPadre filtra hijos: provincias de un departamento, distritos de una provincia */
  multitablaPorCodigo: (codigoTabla, codigoPadre) =>
    Multitabla.findAll({
      where: { codigoTabla, flkactivo: true, ...(codigoPadre ? { codigoPadre } : {}) },
      order: [['orden', 'ASC'], ['valor', 'ASC']],
    }),

  /** Valor de multitabla por tabla + código (ej. '003','150101' = distrito LIMA) */
  multitablaPorTablaCodigo: (codigoTabla, codigo) => Multitabla.findOne({ where: { codigoTabla, codigo } }),

  multitablaPorId: (id, options = {}) => Multitabla.findByPk(id, options),

  /** Códigos activos de un catálogo (para validar lo que llega del front) */
  codigosActivos: async (codigoTabla) =>
    (await Multitabla.findAll({ attributes: ['codigo'], where: { codigoTabla, flkactivo: true } })).map((m) => m.codigo),
};
