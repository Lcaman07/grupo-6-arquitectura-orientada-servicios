/**
 * Histórico del Servicio Orquestador (analisis_zona, analisis_zona_sector)
 */
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, AnalisisZona, AnalisisZonaSector } = require('../models');

module.exports = {
  /** Guarda el análisis y su detalle por sector en una transacción local (no hay SAGA: INEI y SUNAT solo se leyeron) */
  crear: (analisis, sectores) =>
    sequelize.transaction(async (transaction) => {
      const fila = await AnalisisZona.create(analisis, { transaction });
      if (sectores.length) {
        await AnalisisZonaSector.bulkCreate(sectores.map((s) => ({ ...s, idAnalisisZona: fila.idAnalisisZona })), { transaction });
      }
      return fila;
    }),

  porId: (id) => AnalisisZona.findByPk(id, { include: [{ model: AnalisisZonaSector, as: 'sectores' }] }),

  porIds: (ids) =>
    AnalisisZona.findAll({
      where: { idAnalisisZona: { [Op.in]: ids } },
      include: [{ model: AnalisisZonaSector, as: 'sectores' }],
    }),

  listar: ({ texto, nivel, estado, nivelAtractivo, desde, hasta, limite = 1000 }) =>
    AnalisisZona.findAll({
      where: {
        ...(texto ? { [Op.or]: [{ nombreZona: { [Op.like]: `%${texto}%` } }, { ubigeo: { [Op.like]: `${texto}%` } }] } : {}),
        ...(nivel ? { nivel } : {}),
        ...(estado ? { estado } : {}),
        ...(nivelAtractivo ? { nivelAtractivo } : {}),
        ...(desde || hasta
          ? { fechaCrea: { ...(desde ? { [Op.gte]: new Date(`${desde}T00:00:00`) } : {}), ...(hasta ? { [Op.lte]: new Date(`${hasta}T23:59:59`) } : {}) } }
          : {}),
      },
      order: [['idAnalisisZona', 'DESC']],
      limit: limite,
    }),

  /** Último análisis de cada ubigeo (para el ranking de zonas) */
  ultimosPorUbigeo: (limite = 10) =>
    AnalisisZona.findAll({
      where: {
        idAnalisisZona: { [Op.in]: literal('(SELECT MAX(a2.idAnalisisZona) FROM analisis_zona a2 WHERE a2.indice_atractivo IS NOT NULL GROUP BY a2.ubigeo)') },
      },
      order: [['indiceAtractivo', 'DESC']],
      limit: limite,
    }),

  totales: () =>
    AnalisisZona.findOne({
      attributes: [
        [fn('COUNT', col('idAnalisisZona')), 'analisis'],
        [fn('COUNT', fn('DISTINCT', col('ubigeo'))), 'zonas'],
        [fn('AVG', col('indice_atractivo')), 'indicePromedio'],
        [fn('AVG', col('tiempo_total_ms')), 'tiempoPromedio'],
        [fn('SUM', literal("CASE WHEN estado = 'COMPLETO' THEN 1 ELSE 0 END")), 'completos'],
        [fn('SUM', literal("CASE WHEN origen_territorial = 'CACHE' AND origen_empresarial = 'CACHE' THEN 1 ELSE 0 END")), 'desdeCache'],
      ],
      raw: true,
    }),

  /** Análisis por día (últimos n días) */
  porDia: (dias = 14) =>
    AnalisisZona.findAll({
      attributes: [[fn('DATE', col('fecha_crea')), 'dia'], [fn('COUNT', col('idAnalisisZona')), 'cantidad']],
      where: { fechaCrea: { [Op.gte]: new Date(Date.now() - dias * 86400000) } },
      group: [fn('DATE', col('fecha_crea'))],
      order: [[fn('DATE', col('fecha_crea')), 'ASC']],
      raw: true,
    }),

  porNivelAtractivo: () =>
    AnalisisZona.findAll({
      attributes: ['nivelAtractivo', [fn('COUNT', col('idAnalisisZona')), 'cantidad']],
      where: { nivelAtractivo: { [Op.ne]: null } },
      group: ['nivelAtractivo'],
      raw: true,
    }),
};
