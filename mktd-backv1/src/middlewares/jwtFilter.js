/**
 * Validación del token JWT (equivalente a JwtFilter.java + WebSecurityConfig.java)
 *
 * - El login (POST /api/v1/usuarios/ingresos) es público
 * - Las URLs de C.URLS_SIN_TOKEN son públicas
 * - El resto requiere el header "Authorization: Bearer <token>"
 * - Si el token es válido se guarda en req.claims (se usa en /refreshToken)
 *
 * Nota: igual que en Java, los errores de token responden HTTP 200 con codigoRespuesta "99"
 * para no romper el front-end actual.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const C = require('../config/constantes');
const { getLogger } = require('../utils/logger');

const LOGGER = getLogger('JwtFilter');

const errorToken = (res, message) =>
  res.status(200).json({
    codigoRespuesta: C.CODIGO_RESPUESTA_GENERAL_ERROR,
    mensajeRespuesta: message,
    objErrorResource: { code: C.CODIGO_RESPUESTA_GENERAL_ERROR, message },
  });

function jwtFilter(req, res, next) {
  const url = req.path;

  //-- Login público
  if (url === C.LOGIN_URL) return next();

  //-- URLs sin token
  if (C.URLS_SIN_TOKEN.some((u) => url.includes(u))) return next();

  const header = req.headers[C.JWT_RESPONSE_HEADER_KEY];
  if (!header || !header.startsWith(C.JWT_RESPONSE_HEADER_PREFIX)) {
    return errorToken(res, 'Token - Authorization header invalido');
  }

  const token = header.replace(C.JWT_RESPONSE_HEADER_PREFIX, '').trim();
  let claims;
  try {
    claims = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  } catch (e) {
    LOGGER.debug(`Token rechazado: ${e.message}`);
    return errorToken(res, 'Token - Expirado o Modificado');
  }

  if (!claims || !claims.sub) return errorToken(res, 'Token - Invalido');

  req.claims = claims;
  req.usuario = claims.sub;
  return next();
}

module.exports = jwtFilter;
