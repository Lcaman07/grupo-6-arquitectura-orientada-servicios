const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'AnalisisZonaSector',
    {
      idAnalisisZonaSector: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idAnalisisZonaSector' },
      idAnalisisZona: { type: DataTypes.INTEGER, allowNull: false, field: 'idAnalisisZona' },
      seccionCiiu: { type: DataTypes.CHAR(1), allowNull: false, field: 'seccion_ciiu' },
      cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      porcentaje: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      porMilHabitantes: { type: DataTypes.DECIMAL(10, 2), field: 'por_mil_habitantes' },
      ...camposAuditoria(),
    },
    { tableName: 'analisis_zona_sector' }
  );
