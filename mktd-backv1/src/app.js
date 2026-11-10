/**
 * Configuración de Express: middlewares, servicios externos simulados (INEI / SUNAT) y API REST de MarketData
 */
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const routes = require('./routes');
const jwtFilter = require('./middlewares/jwtFilter');
const contexto = require('./utils/contexto');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { getLogger } = require('./utils/logger');

const LOGGER = getLogger('http');

function corsOptions() {
  const lista = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);
  const origins = lista(config.cors.origins);
  const headers = lista(config.cors.headers);
  return {
    origin: origins.includes('*') ? true : origins, //-- true = refleja el origin (permite credenciales)
    credentials: true,
    methods: lista(config.cors.methods),
    exposedHeaders: lista(config.cors.exposedHeaders), //-- el front lee el nombre del archivo descargado (Content-Disposition)
    allowedHeaders: headers.includes('*') ? undefined : headers, //-- undefined = acepta los que pida el navegador
  };
}

function crearApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors(corsOptions()));
  if (config.server.compresion) app.use(compression());
  app.use(express.json({ limit: `${config.server.jsonLimitMB}mb` }));

  //-- log de cada petición
  app.use((req, res, next) => {
    const inicio = Date.now();
    res.on('finish', () => LOGGER.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - inicio}ms`));
    next();
  });

  //-- archivos adjuntos (fotos de WhatsApp, fallas...). Antes del filtro JWT para que <img src> funcione
  //-- caché larga: cada archivo nuevo tiene otro nombre (imagen del producto, fondo del login, adjuntos)
  app.use(`${config.server.contextPath}/archivos`, express.static(config.upload.dir, { index: false, maxAge: '30d', immutable: true }));
  app.use(`${config.server.contextPath}/archivos`, (req, res) => res.status(404).end()); //-- imagen borrada o inexistente

  //-- health check (equivalente básico a actuator/health)
  app.get(`${config.server.contextPath}/actuator/health`, (req, res) => res.json({ status: 'UP' }));

  //-- Servicios EXTERNOS simulados (fines académicos). Se consumen por HTTP como uno real:
  //--   INEI  REST/JSON : {contexto}/mock/inei/api/v1/ubigeo/{ubigeo}/indicadores
  //--   SUNAT SOAP/XML  : {contexto}/mock/sunat/ws/ConsultaRuc  (?wsdl)
  //-- Van antes del filtro JWT porque son "otro sistema". Se apagan con MOCKS_HABILITADOS=false.
  if (config.integracion.mocksHabilitados) {
    app.use(`${config.server.contextPath}/mock/inei/api/v1`, require('./integracion/mocks/ineiMock'));
    app.use(`${config.server.contextPath}/mock/sunat/ws/ConsultaRuc`, require('./integracion/mocks/sunatMock').router);
  }

  //-- API: primero el filtro JWT, luego el contexto (usuario para auditoría) y las rutas
  app.use(config.server.contextPath, jwtFilter, contexto.middleware, routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = crearApp;
