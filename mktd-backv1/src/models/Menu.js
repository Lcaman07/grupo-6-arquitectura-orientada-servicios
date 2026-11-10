const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'Menu',
    {
      idMenu: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idMenu' },
      nombre: { type: DataTypes.STRING(45), allowNull: false },
      descripcion: { type: DataTypes.STRING(45), allowNull: true },
      orden: { type: DataTypes.INTEGER, allowNull: false },
      flkactivo: { type: DataTypes.BOOLEAN, allowNull: false },
      ...camposAuditoria(),
    },
    { tableName: 'menu' }
  );
