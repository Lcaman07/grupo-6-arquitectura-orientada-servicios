/**
 * Punto de entrada del back de MarketData
 */
const config = require('./config');
const crearApp = require('./app');
const { sequelize } = require('./models');
const { getLogger } = require('./utils/logger');

const LOGGER = getLogger('server');

async function iniciar() {
  try {
    await sequelize.authenticate();
    LOGGER.info(`Conectado a la base de datos ${config.db.name} en ${config.db.host}:${config.db.port}`);
    const parametros = await require('./utils/parametros').cargar();
    LOGGER.info(`Parámetros generales cargados: ${Object.keys(parametros).length}`);
  } catch (e) {
    LOGGER.error(`No se pudo conectar a la base de datos: ${e.message}`);
    process.exit(1);
  }

  const app = crearApp();
  const server = app.listen(config.server.port, () => {
    LOGGER.info(`MarketData API [perfil ${config.profile}] escuchando en http://${config.server.host}:${config.server.port}${config.server.contextPath}`);
    LOGGER.info(`INEI  (REST) -> ${config.integracion.ineiUrl}`);
    LOGGER.info(`SUNAT (SOAP) -> ${config.integracion.sunatUrl}${config.integracion.mocksHabilitados ? '  [servicios simulados activos]' : ''}`);
  });


  const cerrar = async () => {
    LOGGER.info('Cerrando servidor...');
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

iniciar();
