const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

//-- Bitácora de cada invocación a un servicio externo (INEI REST / SUNAT SOAP)
module.exports = (sequelize) =>
  sequelize.define(
    'LogIntegracion',
    {
      idLogIntegracion: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, field: 'idLogIntegracion' },
      servicio: { type: DataTypes.STRING(20), allowNull: false },
      operacion: { type: DataTypes.STRING(60), allowNull: false },
      protocolo: { type: DataTypes.STRING(10), allowNull: false },
      url: { type: DataTypes.STRING(300) },
      parametro: { type: DataTypes.STRING(100) },
      estadoHttp: { type: DataTypes.INTEGER, field: 'estado_http' },
      intentos: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
      exito: { type: DataTypes.BOOLEAN, allowNull: false },
      tiempoMs: { type: DataTypes.INTEGER, field: 'tiempo_ms' },
      mensaje: { type: DataTypes.STRING(500) },
      ...camposAuditoria(),
    },
    { tableName: 'log_integracion' }
  );
