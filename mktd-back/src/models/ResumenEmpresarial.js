const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

//-- Caché del Servicio Empresarial por zona (SUNAT): concentración de empresas en un UBIGEO
module.exports = (sequelize) =>
  sequelize.define(
    'ResumenEmpresarial',
    {
      idResumenEmpresarial: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idResumenEmpresarial' },
      ubigeo: { type: DataTypes.STRING(6), allowNull: false, unique: true },
      totalEmpresas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_empresas' },
      empresasActivas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'empresas_activas' },
      empresasHabidas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'empresas_habidas' },
      empresasBaja: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'empresas_baja' },
      fuente: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'SUNAT' },
      fechaConsulta: { type: DataTypes.DATE, allowNull: false, field: 'fecha_consulta' },
      vigenteHasta: { type: DataTypes.DATE, allowNull: false, field: 'vigente_hasta' },
      ...camposAuditoria(),
    },
    { tableName: 'resumen_empresarial' }
  );
