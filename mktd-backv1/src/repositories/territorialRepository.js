/**
 * Caché del Servicio Territorial (indicador_territorial)
 */
const { IndicadorTerritorial } = require('../models');

module.exports = {
  porUbigeo: (ubigeo) => IndicadorTerritorial.findOne({ where: { ubigeo } }),

  /** Inserta o actualiza la fila del ubigeo (una sola fila por ubigeo) */
  guardar: async (datos) => {
    const actual = await IndicadorTerritorial.findOne({ where: { ubigeo: datos.ubigeo } });
    if (actual) return actual.update(datos);
    return IndicadorTerritorial.create(datos);
  },

  limpiar: () => IndicadorTerritorial.destroy({ where: {} }),
};
