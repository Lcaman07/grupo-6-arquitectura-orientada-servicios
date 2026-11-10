const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'ResumenEmpresarialSector',
    {
      idResumenEmpresarialSector: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idResumenEmpresarialSector' },
      idResumenEmpresarial: { type: DataTypes.INTEGER, allowNull: false, field: 'idResumenEmpresarial' },
      seccionCiiu: { type: DataTypes.CHAR(1), allowNull: false, field: 'seccion_ciiu' },
      cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      activas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ...camposAuditoria(),
    },
    { tableName: 'resumen_empresarial_sector' }
  );
