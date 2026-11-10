/**
 * Logger (equivalente a logback-spring.xml)
 * - Consola
 * - Archivo diario en LOG_DIR/<LOG_FILE_PREFIX>-YYYY-MM-DD.log, se guardan LOG_RETENTION_DAYS días (.env)
 */
const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('../config');

const formato = winston.format.printf(
  ({ timestamp, level, message, label }) => `${timestamp} ${level.toUpperCase().padEnd(5)} ${label || 'app'} - ${message}`
);

const baseLogger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), formato),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      dirname: config.logging.dir,
      filename: `${config.logging.archivo}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: `${config.logging.diasRetencion}d`,
    }),
  ],
});

/** Crea un logger con etiqueta (como LoggerFactory.getLogger(clase)) */
const getLogger = (label) => baseLogger.child({ label });

module.exports = { logger: baseLogger, getLogger };
