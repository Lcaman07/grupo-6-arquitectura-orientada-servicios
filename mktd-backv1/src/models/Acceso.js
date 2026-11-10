const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'Acceso',
    {
      idAcceso: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idAcceso' },
      idMenu: { type: DataTypes.INTEGER, allowNull: false, field: 'idMenu' },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      path: { type: DataTypes.STRING(100), allowNull: false },
      tipo: { type: DataTypes.CHAR(1), allowNull: false, defaultValue: 'P' }, //-- P = pantalla, A = acción (botón)
      orden: { type: DataTypes.INTEGER, allowNull: false },
      flkactivo: { type: DataTypes.BOOLEAN, allowNull: false },
      ...camposAuditoria(),
    },
    { tableName: 'acceso' }
  );
