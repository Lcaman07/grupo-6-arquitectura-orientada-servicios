/**
 * Columnas de auditoría que tienen TODAS las tablas de marketdata_db
 * (usuario_crea, fecha_crea, usuario_modif, fecha_modif)
 *
 * Uso en un modelo:   ...camposAuditoria()
 * Los valores los llenan los hooks de models/hooksAuditoria.js
 */
const { DataTypes } = require('sequelize');

const camposAuditoria = ({ conModif = true } = {}) => ({
  usuarioCrea: { type: DataTypes.STRING(50), allowNull: false, field: 'usuario_crea' },
  fechaCrea: { type: DataTypes.DATE, allowNull: true, field: 'fecha_crea' }, //-- DEFAULT CURRENT_TIMESTAMP en la BD
  ...(conModif
    ? {
        usuarioModif: { type: DataTypes.STRING(50), allowNull: true, field: 'usuario_modif' },
        fechaModif: { type: DataTypes.DATE, allowNull: true, field: 'fecha_modif' },
      }
    : {}),
});

module.exports = { camposAuditoria };
