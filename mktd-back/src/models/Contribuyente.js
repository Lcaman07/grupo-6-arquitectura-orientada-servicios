const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

//-- Caché del Servicio Empresarial por RUC (SUNAT)
module.exports = (sequelize) =>
  sequelize.define(
    'Contribuyente',
    {
      idContribuyente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idContribuyente' },
      ruc: { type: DataTypes.CHAR(11), allowNull: false, unique: true },
      razonSocial: { type: DataTypes.STRING(200), allowNull: false, field: 'razon_social' },
      tipoContribuyente: { type: DataTypes.STRING(100), field: 'tipo_contribuyente' },
      nombreComercial: { type: DataTypes.STRING(200), field: 'nombre_comercial' },
      estado: { type: DataTypes.STRING(40) },
      condicion: { type: DataTypes.STRING(40) },
      ciiu: { type: DataTypes.STRING(6) },
      actividadEconomica: { type: DataTypes.STRING(250), field: 'actividad_economica' },
      seccionCiiu: { type: DataTypes.CHAR(1), field: 'seccion_ciiu' },
      ubigeo: { type: DataTypes.STRING(6) },
      direccion: { type: DataTypes.STRING(250) },
      fechaInscripcion: { type: DataTypes.DATEONLY, field: 'fecha_inscripcion' },
      fuente: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'SUNAT' },
      fechaConsulta: { type: DataTypes.DATE, allowNull: false, field: 'fecha_consulta' },
      vigenteHasta: { type: DataTypes.DATE, allowNull: false, field: 'vigente_hasta' },
      ...camposAuditoria(),
    },
    { tableName: 'contribuyente' }
  );
