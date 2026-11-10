const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'ResetToken',
    {
      idResetToken: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: 'idResetToken' },
      idUsuario: { type: DataTypes.INTEGER, allowNull: false, field: 'idUsuario' },
      token: { type: DataTypes.STRING(300), allowNull: false, unique: true },
      expiracion: { type: DataTypes.DATE, allowNull: false },
      //-- la base lo pide NOT NULL; db/12_reset_token_aprobaciones.sql lo agrega con DEFAULT 1 si falta
      flkactivo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'flkactivo' },
      ...camposAuditoria(),
    },
    { tableName: 'reset_token' }
  );
