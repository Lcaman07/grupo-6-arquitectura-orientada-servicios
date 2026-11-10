/**
 * Registro de modelos y relaciones (capa Model del patrón Controller-Service-Model)
 */
const sequelize = require('../config/database');

//-- Seguridad y catálogos
const Menu = require('./Menu')(sequelize);
const Rol = require('./Rol')(sequelize);
const Acceso = require('./Acceso')(sequelize);
const AccesoRol = require('./AccesoRol')(sequelize);
const Usuario = require('./Usuario')(sequelize);
const ResetToken = require('./ResetToken')(sequelize);
const Multitabla = require('./Multitabla')(sequelize);

//-- MarketData: caché de los servicios externos, análisis y bitácora
const IndicadorTerritorial = require('./IndicadorTerritorial')(sequelize);
const Contribuyente = require('./Contribuyente')(sequelize);
const ResumenEmpresarial = require('./ResumenEmpresarial')(sequelize);
const ResumenEmpresarialSector = require('./ResumenEmpresarialSector')(sequelize);
const AnalisisZona = require('./AnalisisZona')(sequelize);
const AnalisisZonaSector = require('./AnalisisZonaSector')(sequelize);
const LogIntegracion = require('./LogIntegracion')(sequelize);

//-- usuario_crea / usuario_modif automáticos en todas las tablas
require('./hooksAuditoria')(sequelize);

//-- Menu 1..N Acceso
Menu.hasMany(Acceso, { foreignKey: 'idMenu', as: 'accesos' });
Acceso.belongsTo(Menu, { foreignKey: 'idMenu', as: 'menu' });

//-- Rol 1..N AccesoRol N..1 Acceso
Rol.hasMany(AccesoRol, { foreignKey: 'idRol', as: 'accesoRols' });
AccesoRol.belongsTo(Rol, { foreignKey: 'idRol', as: 'rol' });
Acceso.hasMany(AccesoRol, { foreignKey: 'idAcceso', as: 'accesoRols' });
AccesoRol.belongsTo(Acceso, { foreignKey: 'idAcceso', as: 'acceso' });

//-- Rol 1..N Usuario
Rol.hasMany(Usuario, { foreignKey: 'idRol', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'idRol', as: 'rol' });

//-- Usuario 1..N ResetToken
Usuario.hasMany(ResetToken, { foreignKey: 'idUsuario', as: 'resetTokens' });
ResetToken.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });

//-- Resumen empresarial 1..N sectores
ResumenEmpresarial.hasMany(ResumenEmpresarialSector, { foreignKey: 'idResumenEmpresarial', as: 'sectores', onDelete: 'CASCADE' });
ResumenEmpresarialSector.belongsTo(ResumenEmpresarial, { foreignKey: 'idResumenEmpresarial', as: 'resumen' });

//-- Análisis de zona 1..N sectores
AnalisisZona.hasMany(AnalisisZonaSector, { foreignKey: 'idAnalisisZona', as: 'sectores', onDelete: 'CASCADE' });
AnalisisZonaSector.belongsTo(AnalisisZona, { foreignKey: 'idAnalisisZona', as: 'analisis' });

module.exports = {
  sequelize, Menu, Rol, Acceso, AccesoRol, Usuario, ResetToken, Multitabla,
  IndicadorTerritorial, Contribuyente, ResumenEmpresarial, ResumenEmpresarialSector,
  AnalisisZona, AnalisisZonaSector, LogIntegracion,
};
