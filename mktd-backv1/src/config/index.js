/**
 * Configuracion por perfil (equivalente a application-{dev,tst,prd}.properties)
 * ----------------------------------------------------------------------------
 * - El perfil se elige con la variable APP_PROFILE (dev | tst | prd). Por defecto: dev
 * - Se carga el archivo .env.<perfil> y luego .env (si existe) para valores comunes
 * - Ejemplo: npm run start:dev  |  npm run start:prd
 */
const path = require('path');
const dotenv = require('dotenv');

const profile = process.env.APP_PROFILE || 'dev';
const root = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(root, `.env.${profile}`), quiet: true });
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const env = (key, def) => (process.env[key] !== undefined && process.env[key] !== '' ? process.env[key] : def);
//-- obligatorio: sin valor en el .env el servidor no arranca (para claves y contraseñas: nunca en el código)
const requerido = (key) => {
  const v = env(key, undefined);
  if (v === undefined) throw new Error(`Falta la variable ${key} en el archivo .env.${profile} o .env`);
  return v;
};
const bool = (key, def) => String(env(key, def)).toLowerCase() === 'true';
const int = (key, def) => parseInt(env(key, def), 10);

module.exports = {
  profile,

  //-- WEB
  server: {
    port: int('SERVER_PORT', 8081),
    host: env('SERVER_HOST', 'localhost'), //-- solo para el mensaje de inicio
    contextPath: env('CONTEXT_PATH', '/marketdata-api'),
    jsonLimitMB: int('JSON_LIMIT_MB', 2),
    compresion: bool('HTTP_COMPRESSION', 'true'), //-- gzip de las respuestas (menos datos por la red)
  },

  //-- Logging
  logging: {
    level: env('LOG_LEVEL', 'info'),
    dir: env('LOG_DIR', path.join(root, 'logs')),
    archivo: env('LOG_FILE_PREFIX', 'qms_debug'),
    diasRetencion: int('LOG_RETENTION_DAYS', 14),
  },

  //-- Cross-Domain (CORS)
  cors: {
    origins: env('CORS_ORIGINS', '*'),
    headers: env('CORS_HEADERS', '*'),
    methods: env('CORS_METHODS', 'OPTIONS,HEAD,GET,PUT,POST,DELETE,PATCH'),
    exposedHeaders: env('CORS_EXPOSED_HEADERS', 'Content-Disposition'),
  },

  //-- limite de archivos (spring.servlet.multipart.max-file-size)
  upload: {
    maxFileSizeMB: int('UPLOAD_MAX_FILE_SIZE_MB', 5),
    dir: env('UPLOAD_DIR', path.join(root, 'uploads')), //-- fotos de usuario y fondo del login
  },

  //-- Persistencia (persistence.db.*)
  db: {
    dialect: env('DB_DIALECT', 'mysql'),
    host: env('DB_HOST', 'localhost'),
    port: int('DB_PORT', 3306),
    name: env('DB_NAME', 'marketdata_db'),
    username: requerido('DB_USERNAME'),
    password: env('DB_PASSWORD', ''),
    timezone: env('DB_TIMEZONE', '-05:00'),
    showSql: bool('DB_SHOW_SQL', 'false'),
    //-- En hosting compartido (Hostinger) MySQL limita las conexiones por usuario: usar pocas (5) y soltarlas rápido
    pool: {
      max: int('DB_POOL_MAX', 5),
      min: int('DB_POOL_MIN', 0),
      idle: int('DB_POOL_IDLE_MS', 10000),
      acquire: int('DB_POOL_ACQUIRE_MS', 30000),
      evict: int('DB_POOL_EVICT_MS', 10000),
    },
    connectTimeoutMs: int('DB_CONNECT_TIMEOUT_MS', 10000),
    reintentos: int('DB_RETRY_MAX', 3), //-- si la conexión se corta, la consulta se reintenta
  },

  //-- Integración SOA con las fuentes externas (capa de servicios / adaptadores)
  //--   INEI : REST/JSON  ·  SUNAT: SOAP/XML
  //--   Por defecto apuntan a los servicios simulados que trae este mismo back (MOCKS_HABILITADOS=true).
  //--   Para usar otra fuente solo se cambia la URL (el contrato lo normaliza el adaptador).
  integracion: {
    ineiUrl: env('INEI_URL', `http://localhost:${int('SERVER_PORT', 8081)}${env('CONTEXT_PATH', '/marketdata-api')}/mock/inei/api/v1`),
    sunatUrl: env('SUNAT_URL', `http://localhost:${int('SERVER_PORT', 8081)}${env('CONTEXT_PATH', '/marketdata-api')}/mock/sunat/ws/ConsultaRuc`),
    mocksHabilitados: bool('MOCKS_HABILITADOS', 'true'),
  },

  //-- Seguridad / JWT
  jwt: {
    secret: requerido('JWT_SECRET'),
    issuer: env('JWT_ISSUER', 'marketdata-api'),
    audience: env('JWT_AUDIENCE', 'web'),
    tiempoSesionMin: int('JWT_TIEMPO_SESION_MIN', 20),
  },

  //-- Seguridad de contraseñas
  seguridad: {
    bcryptRounds: int('BCRYPT_ROUNDS', 10),
    resetTokenMinutos: int('RESET_TOKEN_MINUTOS', 10),
  },

  //-- Correo (spring.mail.*)
  mail: {
    enabled: bool('MAIL_ENABLED', 'false'),
    host: env('MAIL_HOST', 'smtp.gmail.com'),
    port: int('MAIL_PORT', 587),
    username: env('MAIL_USERNAME', ''),
    password: env('MAIL_PASSWORD', ''),
    from: env('MAIL_FROM', env('MAIL_USERNAME', '')),
  },

  //-- URL del front para restablecer la contraseña
  front: {
    url: env('FRONT_URL', 'http://localhost/gwu-front'),
    resetPasswordUrl: env('FRONT_RESET_URL', `${env('FRONT_URL', 'http://localhost/gwu-front')}/pages/recuperar/restablecer-contrasena.html`),
  },
}; 
