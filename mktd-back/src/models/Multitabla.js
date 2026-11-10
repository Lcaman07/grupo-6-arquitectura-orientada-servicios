const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

//-- Tabla de parámetros generales: listas del ERP (ubigeo, tipo documento, marcas, motivos...)
module.exports = (sequelize) =>
  sequelize.define(
    'Multitabla',
    {
      idMultitabla: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'id_multitabla' },
      codigoTabla: { type: DataTypes.CHAR(3), allowNull: false, field: 'codigo_tabla' },
      nombreTabla: { type: DataTypes.STRING(100), allowNull: false, field: 'nombre_tabla' },
      codigo: { type: DataTypes.STRING(100), field: 'codigo' },
      orden: { type: DataTypes.INTEGER, field: 'orden' },
      valor: { type: DataTypes.STRING(200), field: 'valor' },
      valorAux: { type: DataTypes.STRING(200), field: 'valor_aux' },
      valorAux2: { type: DataTypes.STRING(200), field: 'valor_aux2' },
      codigoPadre: { type: DataTypes.STRING(100), field: 'codigo_padre' },
      estadoTabla: { type: DataTypes.CHAR(1), allowNull: false, field: 'estado_tabla', defaultValue: '1' },
      flkactivo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...camposAuditoria(),
    },
    { tableName: 'multitabla' }
  );
