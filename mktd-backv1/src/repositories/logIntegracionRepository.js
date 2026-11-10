/**
 * Bitácora de integración (log_integracion)
 */
const { Op, fn, col, literal } = require('sequelize');
const { LogIntegracion } = require('../models');

module.exports = {
  crear: (data) => LogIntegracion.create(data),

  /** filtros: servicio, exito (true/false), desde, hasta (yyyy-mm-dd) */
  listar: ({ servicio, exito, desde, hasta, limite = 500 }) =>
    LogIntegracion.findAll({
      where: {
        ...(servicio ? { servicio } : {}),
        ...(exito === null || exito === undefined ? {} : { exito }),
        ...(desde || hasta
          ? { fechaCrea: { ...(desde ? { [Op.gte]: new Date(`${desde}T00:00:00`) } : {}), ...(hasta ? { [Op.lte]: new Date(`${hasta}T23:59:59`) } : {}) } }
          : {}),
      },
      order: [['idLogIntegracion', 'DESC']],
      limit: limite,
    }),

  /** Indicadores por servicio: llamadas, % éxito, tiempo promedio, llamadas recuperadas con reintento */
  resumen: (desde) =>
    LogIntegracion.findAll({
      attributes: [
        'servicio',
        [fn('COUNT', col('idLogIntegracion')), 'llamadas'],
        [fn('SUM', col('exito')), 'exitosas'],
        [fn('AVG', col('tiempo_ms')), 'tiempoPromedio'],
        [fn('MAX', col('tiempo_ms')), 'tiempoMaximo'],
        [fn('SUM', literal('CASE WHEN intentos > 1 AND exito = 1 THEN 1 ELSE 0 END')), 'recuperadas'],
      ],
      where: desde ? { fechaCrea: { [Op.gte]: desde } } : {},
      group: ['servicio'],
      raw: true,
    }),
};
