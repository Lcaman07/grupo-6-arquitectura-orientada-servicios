/**
 * Caché del Servicio Empresarial (contribuyente, resumen_empresarial y sus sectores)
 */
const { Op } = require('sequelize');
const { sequelize, Contribuyente, ResumenEmpresarial, ResumenEmpresarialSector } = require('../models');

module.exports = {
  contribuyentePorRuc: (ruc) => Contribuyente.findOne({ where: { ruc } }),

  guardarContribuyente: async (datos, options = {}) => {
    const actual = await Contribuyente.findOne({ where: { ruc: datos.ruc }, ...options });
    if (actual) return actual.update(datos, options);
    return Contribuyente.create(datos, options);
  },

  /** Contribuyentes guardados de una zona (ubigeo de 2, 4 o 6 dígitos) */
  contribuyentesDeZona: (ubigeo, limite) =>
    Contribuyente.findAll({ where: { ubigeo: { [Op.like]: `${ubigeo}%` } }, order: [['fechaConsulta', 'DESC']], limit: limite }),

  resumenPorUbigeo: (ubigeo) =>
    ResumenEmpresarial.findOne({ where: { ubigeo }, include: [{ model: ResumenEmpresarialSector, as: 'sectores' }] }),

  /** Reemplaza el resumen del ubigeo y sus sectores en una transacción */
  guardarResumen: (datos, sectores) =>
    sequelize.transaction(async (transaction) => {
      let resumen = await ResumenEmpresarial.findOne({ where: { ubigeo: datos.ubigeo }, transaction });
      if (resumen) {
        await resumen.update(datos, { transaction });
        await ResumenEmpresarialSector.destroy({ where: { idResumenEmpresarial: resumen.idResumenEmpresarial }, transaction });
      } else {
        resumen = await ResumenEmpresarial.create(datos, { transaction });
      }
      await ResumenEmpresarialSector.bulkCreate(
        sectores.map((s) => ({ ...s, idResumenEmpresarial: resumen.idResumenEmpresarial })),
        { transaction }
      );
      return resumen;
    }),

  limpiar: async () => {
    await ResumenEmpresarialSector.destroy({ where: {} });
    await ResumenEmpresarial.destroy({ where: {} });
    await Contribuyente.destroy({ where: {} });
  },
};
