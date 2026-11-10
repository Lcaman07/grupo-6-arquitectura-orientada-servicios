const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'AccesoRol',
    {
      idAccesoRol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idAcceso_Rol' },
      idAcceso: { type: DataTypes.INTEGER, allowNull: false, field: 'idAcceso' },
      idRol: { type: DataTypes.INTEGER, allowNull: false, field: 'idRol' },
      ...camposAuditoria(),
    },
    { tableName: 'acceso_rol' }
  );
