const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'Rol',
    {
      idRol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idRol' },
      nombre: { type: DataTypes.STRING(150), allowNull: true },
      flkactivo: { type: DataTypes.BOOLEAN, allowNull: false },
      ...camposAuditoria(),
    },
    { tableName: 'rol' }
  );
