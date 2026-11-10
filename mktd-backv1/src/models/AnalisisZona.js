const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

//-- Resultado del Servicio Orquestador "Análisis de zona" (histórico)
module.exports = (sequelize) =>
  sequelize.define(
    'AnalisisZona',
    {
      idAnalisisZona: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idAnalisisZona' },
      ubigeo: { type: DataTypes.STRING(6), allowNull: false },
      nivel: { type: DataTypes.STRING(12), allowNull: false },
      nombreZona: { type: DataTypes.STRING(250), allowNull: false, field: 'nombre_zona' },
      seccionInteres: { type: DataTypes.CHAR(1), field: 'seccion_interes' },
      poblacionTotal: { type: DataTypes.INTEGER, field: 'poblacion_total' },
      densidadHabKm2: { type: DataTypes.DECIMAL(12, 2), field: 'densidad_hab_km2' },
      tasaPobreza: { type: DataTypes.DECIMAL(5, 2), field: 'tasa_pobreza' },
      totalEmpresas: { type: DataTypes.INTEGER, field: 'total_empresas' },
      empresasActivas: { type: DataTypes.INTEGER, field: 'empresas_activas' },
      empresasRubro: { type: DataTypes.INTEGER, field: 'empresas_rubro' },
      empresasPorMil: { type: DataTypes.DECIMAL(10, 2), field: 'empresas_por_mil' },
      habitantesPorEmpresa: { type: DataTypes.DECIMAL(12, 2), field: 'habitantes_por_empresa' },
      sectorPredominante: { type: DataTypes.CHAR(1), field: 'sector_predominante' },
      indiceDemanda: { type: DataTypes.DECIMAL(5, 2), field: 'indice_demanda' },
      indiceCompetencia: { type: DataTypes.DECIMAL(5, 2), field: 'indice_competencia' },
      indicePoderAdquisitivo: { type: DataTypes.DECIMAL(5, 2), field: 'indice_poder_adquisitivo' },
      indiceAtractivo: { type: DataTypes.DECIMAL(5, 2), field: 'indice_atractivo' },
      nivelAtractivo: { type: DataTypes.STRING(10), field: 'nivel_atractivo' },
      estado: { type: DataTypes.STRING(10), allowNull: false },
      origenTerritorial: { type: DataTypes.STRING(15), field: 'origen_territorial' },
      origenEmpresarial: { type: DataTypes.STRING(15), field: 'origen_empresarial' },
      tiempoTerritorialMs: { type: DataTypes.INTEGER, field: 'tiempo_territorial_ms' },
      tiempoEmpresarialMs: { type: DataTypes.INTEGER, field: 'tiempo_empresarial_ms' },
      tiempoTotalMs: { type: DataTypes.INTEGER, field: 'tiempo_total_ms' },
      observacion: { type: DataTypes.STRING(500) },
      ...camposAuditoria(),
    },
    { tableName: 'analisis_zona' }
  );
