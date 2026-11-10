const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

//-- Caché del Servicio Territorial (INEI): una fila por UBIGEO
module.exports = (sequelize) =>
  sequelize.define(
    'IndicadorTerritorial',
    {
      idIndicadorTerritorial: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idIndicadorTerritorial' },
      ubigeo: { type: DataTypes.STRING(6), allowNull: false, unique: true },
      nivel: { type: DataTypes.STRING(12), allowNull: false },
      departamento: { type: DataTypes.STRING(100) },
      provincia: { type: DataTypes.STRING(100) },
      distrito: { type: DataTypes.STRING(100) },
      poblacionTotal: { type: DataTypes.INTEGER, field: 'poblacion_total' },
      poblacionUrbana: { type: DataTypes.INTEGER, field: 'poblacion_urbana' },
      poblacionRural: { type: DataTypes.INTEGER, field: 'poblacion_rural' },
      poblacionHombres: { type: DataTypes.INTEGER, field: 'poblacion_hombres' },
      poblacionMujeres: { type: DataTypes.INTEGER, field: 'poblacion_mujeres' },
      hogares: { type: DataTypes.INTEGER },
      superficieKm2: { type: DataTypes.DECIMAL(12, 2), field: 'superficie_km2' },
      densidadHabKm2: { type: DataTypes.DECIMAL(12, 2), field: 'densidad_hab_km2' },
      edadPromedio: { type: DataTypes.DECIMAL(5, 2), field: 'edad_promedio' },
      tasaPobreza: { type: DataTypes.DECIMAL(5, 2), field: 'tasa_pobreza' },
      pea: { type: DataTypes.INTEGER },
      anioReferencia: { type: DataTypes.SMALLINT, field: 'anio_referencia' },
      fuente: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'INEI' },
      fechaConsulta: { type: DataTypes.DATE, allowNull: false, field: 'fecha_consulta' },
      vigenteHasta: { type: DataTypes.DATE, allowNull: false, field: 'vigente_hasta' },
      ...camposAuditoria(),
    },
    { tableName: 'indicador_territorial' }
  );
