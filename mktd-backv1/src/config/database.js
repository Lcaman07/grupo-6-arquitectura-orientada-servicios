/**
 * Conexión a base de datos (equivalente a JpaConfig.java + HikariCP)
 */
const { Sequelize } = require('sequelize');
const config = require('./index');
const { getLogger } = require('../utils/logger');

const log = getLogger('database');

const sequelize = new Sequelize(config.db.name, config.db.username, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  timezone: config.db.timezone,
  pool: config.db.pool,
  dialectOptions: { connectTimeout: config.db.connectTimeoutMs },
  //-- reintenta cuando MySQL corta la conexión (hosting compartido: wait_timeout corto, reinicios)
  retry: {
    max: config.db.reintentos,
    match: [/ETIMEDOUT/, /ECONNRESET/, /ECONNREFUSED/, /EPIPE/, /PROTOCOL_CONNECTION_LOST/, /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/, /SequelizeConnectionAcquireTimeoutError/, /Too many connections/],
  },
  logging: config.db.showSql ? (sql) => log.debug(sql) : false,
  define: {
    freezeTableName: true, //-- no pluralizar nombres de tablas
    timestamps: false, //-- las tablas no tienen createdAt/updatedAt
  },
});

module.exports = sequelize;
