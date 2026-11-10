const { DataTypes } = require('sequelize');
const { camposAuditoria } = require('./auditoria');

module.exports = (sequelize) =>
  sequelize.define(
    'Usuario',
    {
      idUsuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, field: 'idUsuario' },
      idRol: { type: DataTypes.INTEGER, allowNull: false, field: 'idRol' },
      nombres: { type: DataTypes.STRING(150), allowNull: false },
      apellidos: { type: DataTypes.STRING(150), allowNull: false },
      usuario: { type: DataTypes.STRING(60), allowNull: false },
      contrasena: { type: DataTypes.STRING(60), allowNull: false },
      telefono: { type: DataTypes.STRING(15), allowNull: true },
      correo: { type: DataTypes.STRING(150), allowNull: false },
      idTipoDocumento: { type: DataTypes.INTEGER, allowNull: true, field: 'idTipoDocumento' }, //-- multitabla 004
      dni: { type: DataTypes.STRING(15), allowNull: true }, //-- número del documento (DNI, CE o pasaporte)
      foto: { type: DataTypes.BLOB('long'), allowNull: true },
      flkactivo: { type: DataTypes.BOOLEAN, allowNull: false },
      ...camposAuditoria(),
    },
    {
      tableName: 'usuario',
      //-- La foto (longblob) no se trae por defecto para no cargar MBs en cada consulta
      defaultScope: { attributes: { exclude: ['foto'] } },
      scopes: { conFoto: {} },
    }
  );
