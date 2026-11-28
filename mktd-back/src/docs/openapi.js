/**
 * Documentación OpenAPI 3.0 de la API de MarketData Perú (Swagger)
 *
 * - Swagger UI : {contexto}/swagger-ui      (ej. http://localhost:8081/marketdata-api/swagger-ui)
 * - JSON       : {contexto}/api-docs.json
 *
 * Convención de la API: casi todas las respuestas son HTTP 200 y el resultado va en el cuerpo:
 *   codigoRespuesta "01" = éxito · "99" = error controlado (mensaje en mensajeRespuesta).
 * Si agregas una ruta en src/routes/index.js, agrégala también aquí.
 */
const config = require('../config');

const CTX = config.server.contextPath;

//-- ===================== helpers =====================
const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const str = (description, example, extra = {}) => ({ type: 'string', description, example, ...extra });
const int = (description, example, extra = {}) => ({ type: 'integer', description, example, ...extra });
const num = (description, example) => ({ type: 'number', description, example });
const bool = (description, example) => ({ type: 'boolean', description, example });
const obj = (properties, required) => ({ type: 'object', properties, ...(required ? { required } : {}) });
const conBase = (properties) => ({ allOf: [ref('Respuesta'), obj(properties)] });

const pPath = (name, description, example, schema = { type: 'string' }) => ({ name, in: 'path', required: true, description, schema: { ...schema, example } });
const pQuery = (name, description, example, schema = { type: 'string' }) => ({ name, in: 'query', required: false, description, schema: { ...schema, example } });
const pForzar = pQuery('forzar', 'true = no usar la caché y consultar la fuente en línea (requiere el permiso ANALISIS_FORZAR)', false, { type: 'boolean' });

const json = (schema, example) => ({ 'application/json': { schema, ...(example !== undefined ? { example } : {}) } });
const ok = (schema, example, description = 'codigoRespuesta "01" = éxito · "99" = error controlado (ver mensajeRespuesta)') => ({
  200: { description, content: json(schema, example) },
});
const body = (schema, example, description) => ({ required: true, ...(description ? { description } : {}), content: json(schema, example) });
const archivo = (extra = {}) => ({
  required: true,
  content: { 'multipart/form-data': { schema: obj({ file: { type: 'string', format: 'binary', description: 'Imagen JPG o PNG' }, ...extra }, ['file']) } },
});
const PUBLICO = { security: [] };

const op = (tag, summary, description, extra = {}) => ({ tags: [tag], summary, ...(description ? { description } : {}), ...extra });

//-- ===================== ejemplos reales (respuestas del sistema) =====================
const EJ = {
  login: { codigoRespuesta: '01', mensajeRespuesta: 'OK', jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', codigoUsuario: 'admin', nombreUsuario: 'ADMINISTRADOR DEL SISTEMA', rol: 1, nombreRol: 'ADMINISTRADOR', tiempoMinuto: 20, idUsuario: 1, nombreCorto: 'ADMINISTRADOR DEL', tieneFoto: true, fotoVersion: 'a3d5a9c1f3' },
  id: { codigoRespuesta: '01', mensajeRespuesta: 'OK', objErrorResource: null, id: '3' },
  error: { codigoRespuesta: '99', mensajeRespuesta: 'Seleccione un departamento, provincia o distrito válido (UBIGEO de 2, 4 o 6 dígitos)', objErrorResource: { code: '99', message: 'Seleccione un departamento, provincia o distrito válido (UBIGEO de 2, 4 o 6 dígitos)', fieldErrors: null } },
  territorial: {
    codigoRespuesta: '01', mensajeRespuesta: 'OK', objErrorResource: null, origen: 'INEI', aviso: null, intentos: 1, tiempoMs: 83,
    territorial: {
      ubigeo: '150122', nivel: 'DISTRITO', nombreZona: 'MIRAFLORES, LIMA, LIMA', departamento: 'LIMA', provincia: 'LIMA', distrito: 'MIRAFLORES',
      poblacionTotal: 203175, poblacionUrbana: 203168, poblacionRural: 7, poblacionHombres: 95584, poblacionMujeres: 107591, hogares: 50655,
      superficieKm2: 23.43, densidadHabKm2: 8671.57, edadPromedio: 35.9, tasaPobreza: 7, pea: 100104, porcentajeUrbano: 100, anioReferencia: 2017,
      fuente: 'INEI - Censo 2017 (reparto distrital simulado)', fechaConsulta: '2026-11-28T05:36:19.124Z', vigenteHasta: '2026-12-05T05:36:19.124Z',
    },
  },
  ruc: {
    codigoRespuesta: '01', mensajeRespuesta: 'OK', objErrorResource: null, origen: 'SUNAT', aviso: null, intentos: 1, tiempoMs: 28,
    contribuyente: {
      ruc: '20147117761', razonSocial: 'HOTEL LAS LOMAS S.A.C.', tipoContribuyente: 'SOCIEDAD ANONIMA CERRADA', nombreComercial: null, estado: 'ACTIVO', condicion: 'HABIDO',
      ciiu: '5610', actividadEconomica: 'ACTIVIDADES DE RESTAURANTES Y DE SERVICIO MOVIL DE COMIDAS', seccionCiiu: 'I', sector: 'Restaurantes y hoteles', ubigeo: '150131',
      direccion: 'MZA. JOSE GALVEZ NRO. 1532', fechaInscripcion: '2022-07-18', fechaConsulta: '2026-11-28T05:36:19.176Z', vigenteHasta: '2026-12-05T05:36:19.176Z',
    },
  },
  zona: {
    codigoRespuesta: '01', mensajeRespuesta: 'OK', objErrorResource: null, origen: 'SUNAT', aviso: null, intentos: 1, tiempoMs: 163,
    empresarial: {
      ubigeo: '150122', totalEmpresas: 16483, empresasActivas: 14063, empresasHabidas: 15016, empresasBaja: 1815,
      sectores: [{ seccionCiiu: 'G', sector: 'Comercio', color: '#2f81f7', cantidad: 6012, activas: 5129, porcentaje: 36.47 }],
      muestra: [{ ruc: '20100824419', razonSocial: 'AGROINDUSTRIAS MOCHE S.A.', estado: 'ACTIVO', condicion: 'HABIDO', ciiu: '0141', seccionCiiu: 'A', sector: 'Agro y pesca' }],
      fuente: 'SUNAT', fechaConsulta: '2026-11-28T05:36:19.000Z', vigenteHasta: '2026-12-05T05:36:19.000Z',
    },
  },
  analisis: {
    codigoRespuesta: '01', mensajeRespuesta: 'OK', objErrorResource: null,
    analisis: {
      idAnalisisZona: 19, fecha: '2026-11-16T03:38:24.000Z', zona: { ubigeo: '150122', nivel: 'DISTRITO', nombreZona: 'MIRAFLORES, LIMA, LIMA' },
      seccionInteres: 'I', estado: 'COMPLETO', avisos: [],
      indicadores: { empresasRubro: 1167, empresasPorMil: 69.22, habitantesPorEmpresa: 14.45, indiceDemanda: 83.39, indiceCompetencia: 43.82, indicePoderAdquisitivo: 93, indiceAtractivo: 71.94, nivelAtractivo: 'ALTO', sectorPredominante: 'G' },
      territorial: { origen: 'INEI', tiempoMs: 110, intentos: 1, aviso: null, error: null, datos: { poblacionTotal: 203175, densidadHabKm2: 8671.57, tasaPobreza: 7 } },
      empresarial: { origen: 'SUNAT', tiempoMs: 179, intentos: 1, aviso: null, error: null, datos: { totalEmpresas: 16483, empresasActivas: 14063 } },
      tiempoTotalMs: 192,
      trazabilidad: [
        { paso: 'Solicitud validada', detalle: 'DISTRITO MIRAFLORES, LIMA, LIMA (UBIGEO 150122) · rubro I · sin caché', ms: 13 },
        { paso: 'Gateway paralelo', detalle: 'Se invocan Territorial (INEI) y Empresarial (SUNAT) al mismo tiempo', ms: 13 },
        { paso: 'Servicio Territorial', detalle: 'INEI en 110 ms', ms: 192 },
        { paso: 'Servicio Empresarial', detalle: 'SUNAT en 179 ms', ms: 192 },
        { paso: 'Gateway de convergencia', detalle: 'Estado COMPLETO · índice 71.94 (ALTO)', ms: 192 },
        { paso: 'Persistencia MySQL', detalle: 'Análisis N° 19 guardado', ms: 198 },
        { paso: 'Fin', detalle: 'Respuesta JSON consolidada enviada al dashboard', ms: 198 },
      ],
    },
  },
  estado: {
    codigoRespuesta: '01', mensajeRespuesta: 'OK', objErrorResource: null,
    servicios: [
      { servicio: 'INEI', protocolo: 'REST', url: `http://localhost:8081${CTX}/mock/inei/api/v1`, disponible: true, estadoHttp: 200, tiempoMs: 3 },
      { servicio: 'SUNAT', protocolo: 'SOAP', url: `http://localhost:8081${CTX}/mock/sunat/ws/ConsultaRuc`, disponible: true, estadoHttp: 200, tiempoMs: 8 },
    ],
    mocksHabilitados: true, simulacion: { INEI: 'NORMAL', SUNAT: 'NORMAL' }, modos: ['NORMAL', 'LENTO', 'INTERMITENTE', 'CAIDO'],
    configuracion: { reintentosMax: 3, reintentoEsperaMs: 400, timeoutMs: 6000, cacheVigenciaHoras: 168 },
  },
};

//-- ===================== esquemas =====================
const schemas = {
  Respuesta: obj({
    codigoRespuesta: str('"01" = éxito · "99" = error controlado', '01', { enum: ['01', '99'] }),
    mensajeRespuesta: str('Mensaje para el usuario', 'OK'),
    objErrorResource: { nullable: true, allOf: [ref('ErrorResource')] },
  }),
  ErrorResource: obj({
    code: str('Código de error', '99'),
    message: str('Mensaje de error', 'Seleccione un departamento, provincia o distrito válido'),
    fieldErrors: { type: 'array', nullable: true, description: 'Errores por campo cuando falla la validación del request', items: obj({ field: str('Campo', 'ubigeo'), message: str('Regla incumplida', 'no cumple el formato') }) },
  }),
  RespuestaId: conBase({ id: str('Id del registro creado o modificado', '3') }),

  //-- Seguridad
  UsuarioIngresoRequestDTO: obj({ usuario: str('Usuario', 'admin'), clave: str('Contraseña', 'tu-contraseña', { format: 'password' }) }, ['usuario', 'clave']),
  LoginResponse: conBase({
    jwtToken: str('Token JWT: envíalo como "Authorization: Bearer <token>"', 'eyJhbGciOiJIUzI1NiIs...'),
    codigoUsuario: str('Usuario', 'admin'), nombreUsuario: str('Nombre completo', 'ADMINISTRADOR DEL SISTEMA'), nombreCorto: str('Nombre corto', 'ADMINISTRADOR DEL'),
    rol: int('Id del rol', 1), nombreRol: str('Rol', 'ADMINISTRADOR'), tiempoMinuto: int('Minutos de vigencia del token', 20),
    idUsuario: int('Id del usuario', 1), tieneFoto: bool('Tiene foto', true), fotoVersion: str('Versión de la foto (para refrescar la caché del navegador)', 'a3d5a9c1f3'),
  }),
  UsuarioRegistroRequestDTO: obj({
    idUsuario: int('null = crear · id = editar', null, { nullable: true }), idRol: int('Rol', 2), nombres: str('Nombres', 'USUARIO'), apellidos: str('Apellidos', 'PRUEBA'),
    usuario: str('Usuario (único)', 'usuario01'), contrasenia: str('Solo al crear: mínimo 8 caracteres con letras y números', 'Clave2026', { format: 'password' }),
    telefono: str('Solo números, mínimo 9', '987654321'), correo: str('Correo (para recuperar la contraseña)', 'usuario01@marketdata.pe', { format: 'email' }),
    flkactivo: bool('Activo', true), idTipoDocumento: int('Id del tipo de documento (multitabla 004: idMultitabla de DNI, CE o pasaporte)', 2115), dni: str('Número de documento', '76543210'),
  }, ['nombres', 'apellidos', 'usuario', 'telefono', 'correo', 'dni']),
  UsuarioPerfilRequestDTO: obj({
    nombres: str('Nombres', 'ADMINISTRADOR'), apellidos: str('Apellidos', 'DEL SISTEMA'), telefono: str('Teléfono', '999111222'), idTipoDocumento: int('Tipo de documento (multitabla 004)', 2115),
    dni: str('Documento', '12345678'), claveActual: str('Solo para cambiar la contraseña', '', { format: 'password' }), claveNueva: str('Solo para cambiar la contraseña', '', { format: 'password' }),
  }, ['nombres', 'apellidos', 'telefono', 'dni']),
  UsuarioModificarRequestDTO: obj({ idUsuario: int('Id del usuario', 3), flkactivo: bool('false = desactivar · true = activar', false) }),
  RolRegistroRequestDTO: obj({ nombre: str('Nombre del rol', 'ROL DE PRUEBA'), flkactivo: bool('Activo', true) }, ['nombre']),
  RolModificacionRequestDTO: obj({ idrol: int('Id del rol', 3), nombre: str('Nombre', 'ROL DE PRUEBA EDITADO'), flkactivo: bool('Activo', true) }, ['idrol', 'nombre']),
  RolModificarRequestDTO: obj({ idRol: int('Id del rol', 3), flkactivo: bool('false = desactivar · true = activar', false) }),
  MenuRegistroRequestDTO: obj({ idMenu: int('null = crear · id = editar', null, { nullable: true }), nombre: str('Nombre', 'Menú de prueba'), descripcion: str('Descripción', 'Menú creado desde la API'), orden: int('Orden en el menú lateral', 9), flkactivo: bool('Activo', true) }, ['nombre', 'descripcion', 'orden']),
  MenuModificarRequestDTO: obj({ idMenu: int('Id del menú', 6), flkactivo: bool('false = desactivar · true = activar', false) }),
  AccesoRegistroRequestDTO: obj({
    idAcceso: int('null = crear · id = editar', null, { nullable: true }), idMenu: int('Menú al que pertenece', 1), nombre: str('Nombre', 'Acceso de prueba'),
    path: str('Ruta de la página o código de la acción', '/pages/prueba.html'), tipo: str('P = página del menú · A = acción (permiso)', 'P', { enum: ['P', 'A'] }), orden: int('Orden', 9), flkactivo: bool('Activo', true),
  }, ['idMenu', 'nombre', 'path', 'orden']),
  AccesoModificarRequestDTO: obj({ idAcceso: int('Id del acceso', 18), flkactivo: bool('false = desactivar · true = activar', false) }),
  AccesoRolListaRequestDTO: obj({ lista: { type: 'array', description: 'Accesos que tendrá el rol', items: obj({ idrol: int('Id del rol', 3), idacceso: int('Id del acceso', 1) }) } }),
  CorreoRequestDTO: obj({ correo: str('Correo registrado del usuario', 'analista@marketdata.pe', { format: 'email' }) }, ['correo']),
  TokenRequestDTO: obj({ token: str('Token recibido por correo', 'b3f1c0...'), clave: str('Nueva contraseña', 'NuevaClave2026', { format: 'password' }) }, ['token', 'clave']),

  //-- Maestros
  MultitablaGuardarRequestDTO: obj({
    idMultitabla: int('null = agregar (solo en tablas que lo permiten) · id = modificar', 2176, { nullable: true }), codigoTabla: str('Tabla (001-006, 031-038)', '031'),
    codigo: str('Código del valor', 'MUESTRA_EMPRESAS'), valor: str('Valor', '15'), valorAux: str('Valor auxiliar (según la tabla)', null, { nullable: true }),
    valorAux2: str('Valor auxiliar 2', null, { nullable: true }), orden: int('Orden', null, { nullable: true }), codigoPadre: str('Código del padre (ej. provincia → departamento)', null, { nullable: true }),
  }, ['codigoTabla']),
  MultitablaEstadoRequestDTO: obj({ idMultitabla: int('Id del valor', 2191), flkactivo: bool('false = desactivar · true = activar', false) }, ['idMultitabla']),
  AparienciaGuardarRequestDTO: obj({
    valores: {
      type: 'object', description: 'Colores #RRGGBB a cambiar. Códigos: COLOR_PRINCIPAL, COLOR_FONDO, COLOR_TARJETA, COLOR_NAV, COLOR_ASIDE, COLOR_MENU_TEXTO, COLOR_MENU_ACTIVO, COLOR_FOOTER, LOGIN_FONDO_COLOR, LOGIN_TARJETA_COLOR',
      additionalProperties: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, example: { COLOR_PRINCIPAL: '#2f81f7' },
    },
  }, ['valores']),
  ItemMultitabla: obj({ idMultitabla: int('Id', 2115), codigoTabla: str('Tabla', '004'), codigo: str('Código', '1'), orden: int('Orden', 1), valor: str('Valor', 'DNI'), valorAux: str('Valor auxiliar', 'DOCUMENTO NACIONAL DE IDENTIDAD'), valorAux2: str('Valor auxiliar 2', '1'), codigoPadre: str('Código del padre', null, { nullable: true }) }),

  //-- MarketData
  Territorial: obj({
    ubigeo: str('UBIGEO', '150122'), nivel: str('DEPARTAMENTO · PROVINCIA · DISTRITO', 'DISTRITO'), nombreZona: str('Zona', 'MIRAFLORES, LIMA, LIMA'),
    departamento: str('', 'LIMA'), provincia: str('', 'LIMA'), distrito: str('', 'MIRAFLORES'),
    poblacionTotal: int('Habitantes', 203175), poblacionUrbana: int('', 203168), poblacionRural: int('', 7), poblacionHombres: int('', 95584), poblacionMujeres: int('', 107591),
    hogares: int('Hogares', 50655), superficieKm2: num('Superficie (km²)', 23.43), densidadHabKm2: num('Habitantes por km² (calculado)', 8671.57), edadPromedio: num('Edad promedio', 35.9),
    tasaPobreza: num('% de pobreza', 7), pea: int('Población económicamente activa', 100104), porcentajeUrbano: num('% urbano', 100), anioReferencia: int('Año de referencia', 2017),
    fuente: str('Fuente', 'INEI - Censo 2017'), fechaConsulta: str('Fecha de consulta a la fuente', '2026-11-28T05:36:19.124Z', { format: 'date-time' }), vigenteHasta: str('Vigencia de la caché', '2026-12-05T05:36:19.124Z', { format: 'date-time' }),
  }),
  Contribuyente: obj({
    ruc: str('RUC', '20147117761'), razonSocial: str('Razón social', 'HOTEL LAS LOMAS S.A.C.'), tipoContribuyente: str('', 'SOCIEDAD ANONIMA CERRADA'), nombreComercial: str('', null, { nullable: true }),
    estado: str('ACTIVO, BAJA DE OFICIO...', 'ACTIVO'), condicion: str('HABIDO, NO HABIDO...', 'HABIDO'), ciiu: str('Código CIIU', '5610'), actividadEconomica: str('', 'ACTIVIDADES DE RESTAURANTES Y DE SERVICIO MOVIL DE COMIDAS'),
    seccionCiiu: str('Sección CIIU (rubro)', 'I'), sector: str('Sector', 'Restaurantes y hoteles'), ubigeo: str('', '150131'), direccion: str('', 'MZA. JOSE GALVEZ NRO. 1532'), fechaInscripcion: str('', '2022-07-18', { format: 'date' }),
  }),
  MetaFuente: obj({
    origen: str('INEI / SUNAT = en línea · CACHE = dato vigente en MySQL · CACHE_VENCIDA = la fuente no respondió', 'INEI', { enum: ['INEI', 'SUNAT', 'CACHE', 'CACHE_VENCIDA'] }),
    aviso: str('Aviso cuando se usa la caché vencida', null, { nullable: true }), intentos: int('Llamadas a la fuente (0 = caché)', 1), tiempoMs: int('Tiempo de respuesta (ms)', 83),
  }),
  AnalisisZonaRequestDTO: obj({
    ubigeo: str('UBIGEO de 2 (departamento), 4 (provincia) o 6 (distrito) dígitos', '150122', { pattern: '^(\\d{2}|\\d{4}|\\d{6})$' }),
    seccionInteres: str('Rubro: sección CIIU (A-U) de la multitabla 033. Opcional', 'I'),
    forzar: bool('true = no usar caché (requiere el permiso ANALISIS_FORZAR)', false),
  }, ['ubigeo']),
  SimulacionRequestDTO: obj({ servicio: str('Fuente', 'INEI', { enum: ['INEI', 'SUNAT'] }), modo: str('Comportamiento simulado', 'NORMAL', { enum: ['NORMAL', 'LENTO', 'INTERMITENTE', 'CAIDO'] }) }, ['servicio', 'modo']),
};

//-- ===================== rutas =====================
const T = {
  auth: 'Autenticación', usuarios: 'Seguridad · Usuarios', roles: 'Seguridad · Roles', menus: 'Seguridad · Menús', accesos: 'Seguridad · Accesos',
  accesoRol: 'Seguridad · Accesos por rol', recuperar: 'Recuperar contraseña', multitabla: 'Maestros · Multitabla', apariencia: 'Maestros · Apariencia',
  territorial: 'Servicio Territorial (INEI)', empresarial: 'Servicio Empresarial (SUNAT)', orquestador: 'Orquestador · Análisis de zona',
  analisis: 'Análisis guardados', integracion: 'Integración SOA', externos: 'Servicios externos simulados', salud: 'Salud',
};
const R = ok(ref('Respuesta'));
const RID = ok(ref('RespuestaId'), EJ.id);
const lista = (item = { type: 'object' }, campo = 'listados') => ok(conBase({ [campo]: { type: 'array', items: item } }));

const paths = {
  //-- Autenticación
  '/api/v1/usuarios/ingresos': { post: op(T.auth, 'Iniciar sesión', 'Devuelve el token JWT. Úsalo en el botón **Authorize** de Swagger (sin la palabra Bearer).', { ...PUBLICO, operationId: 'login', requestBody: body(ref('UsuarioIngresoRequestDTO'), { usuario: 'admin', clave: 'tu-contraseña' }), responses: ok(ref('LoginResponse'), EJ.login) }) },
  '/api/v1/usuarios/refreshToken': { get: op(T.auth, 'Renovar el token', 'Devuelve un token nuevo antes de que venza el actual.', { operationId: 'refreshToken', responses: ok(conBase({ jwtToken: str('Token nuevo', 'eyJhbGciOi...') })) }) },

  //-- Usuarios
  '/api/v1/usuarios/registros': { post: op(T.usuarios, 'Crear o editar un usuario', 'idUsuario null = crear (la contraseña es obligatoria) · idUsuario con valor = editar.', { operationId: 'usuarioRegistro', requestBody: body(ref('UsuarioRegistroRequestDTO')), responses: RID }) },
  '/api/v1/usuarios/listados': { get: op(T.usuarios, 'Listar usuarios', null, { operationId: 'usuarioListados', responses: lista() }) },
  '/api/v1/usuarios/mostrar/{idUsuario}': { get: op(T.usuarios, 'Ver un usuario', null, { operationId: 'usuarioMostrar', parameters: [pPath('idUsuario', 'Id del usuario', 1, { type: 'integer' })], responses: R }) },
  '/api/v1/usuarios/modificar': { post: op(T.usuarios, 'Activar o desactivar un usuario', null, { operationId: 'usuarioModificar', requestBody: body(ref('UsuarioModificarRequestDTO')), responses: RID }) },
  '/api/v1/usuarios/miPerfil': {
    get: op(T.usuarios, 'Ver mi perfil', 'Datos del usuario del token.', { operationId: 'miPerfil', responses: R }),
    post: op(T.usuarios, 'Guardar mi perfil', 'Para cambiar la contraseña envía claveActual y claveNueva.', { operationId: 'guardarMiPerfil', requestBody: body(ref('UsuarioPerfilRequestDTO')), responses: R }),
  },
  '/api/v1/usuarios/saveFoto': { post: op(T.usuarios, 'Subir la foto de un usuario', null, { operationId: 'usuarioFoto', requestBody: archivo({ idUsuario: int('Id del usuario', 3) }), responses: R }) },
  '/api/v1/usuarios/miFoto': { post: op(T.usuarios, 'Subir mi foto', null, { operationId: 'miFoto', requestBody: archivo(), responses: R }) },
  '/api/v1/usuarios/foto/{idUsuario}': { get: op(T.usuarios, 'Descargar la foto de un usuario', null, { operationId: 'fotoUsuario', parameters: [pPath('idUsuario', 'Id del usuario', 1, { type: 'integer' })], responses: { 200: { description: 'Imagen', content: { 'image/*': { schema: { type: 'string', format: 'binary' } } } } } }) },

  //-- Roles
  '/api/v1/roles/registros': { post: op(T.roles, 'Crear un rol', null, { operationId: 'rolRegistro', requestBody: body(ref('RolRegistroRequestDTO')), responses: RID }) },
  '/api/v1/roles/listados': { get: op(T.roles, 'Listar roles', null, { operationId: 'rolListados', responses: lista() }) },
  '/api/v1/roles/inicializacion': { get: op(T.roles, 'Roles activos (para combos)', null, { operationId: 'rolInicializacion', responses: lista() }) },
  '/api/v1/roles/modificar': { post: op(T.roles, 'Editar un rol', null, { operationId: 'rolModificar', requestBody: body(ref('RolModificacionRequestDTO')), responses: RID }) },
  '/api/v1/roles/mostrar/{idrol}': { get: op(T.roles, 'Ver un rol', null, { operationId: 'rolMostrar', parameters: [pPath('idrol', 'Id del rol', 2, { type: 'integer' })], responses: R }) },
  '/api/v1/roles/cambiarEstado/{idrol}/{estado}': { get: op(T.roles, 'Cambiar el estado de un rol', null, { operationId: 'rolCambiarEstado', parameters: [pPath('idrol', 'Id del rol', 3, { type: 'integer' }), pPath('estado', 'true = activo · false = inactivo', true, { type: 'boolean' })], responses: RID }) },
  '/api/v1/roles/modificarRol': { post: op(T.roles, 'Activar o desactivar un rol', null, { operationId: 'rolModificarEstado', requestBody: body(ref('RolModificarRequestDTO')), responses: RID }) },

  //-- Menús
  '/api/v1/menu/listados': { get: op(T.menus, 'Listar menús', null, { operationId: 'menuListados', responses: lista() }) },
  '/api/v1/menu/menuactivos': { get: op(T.menus, 'Menús activos', null, { operationId: 'menuActivos', responses: lista() }) },
  '/api/v1/menu/registros': { post: op(T.menus, 'Crear o editar un menú', null, { operationId: 'menuRegistro', requestBody: body(ref('MenuRegistroRequestDTO')), responses: RID }) },
  '/api/v1/menu/mostrar/{idMenu}': { get: op(T.menus, 'Ver un menú', null, { operationId: 'menuMostrar', parameters: [pPath('idMenu', 'Id del menú', 1, { type: 'integer' })], responses: R }) },
  '/api/v1/menu/modificar': { post: op(T.menus, 'Activar o desactivar un menú', null, { operationId: 'menuModificar', requestBody: body(ref('MenuModificarRequestDTO')), responses: RID }) },

  //-- Accesos
  '/api/v1/acceso/accesos': { get: op(T.accesos, 'Accesos activos agrupados por menú', null, { operationId: 'accesoAccesos', responses: lista({ type: 'object' }, 'lista') }) },
  '/api/v1/acceso/registros': { post: op(T.accesos, 'Crear o editar un acceso', null, { operationId: 'accesoRegistro', requestBody: body(ref('AccesoRegistroRequestDTO')), responses: RID }) },
  '/api/v1/acceso/listados': { get: op(T.accesos, 'Listar accesos', null, { operationId: 'accesoListados', responses: lista({ type: 'object' }, 'lista') }) },
  '/api/v1/acceso/mostrar/{idAcceso}': { get: op(T.accesos, 'Ver un acceso', null, { operationId: 'accesoMostrar', parameters: [pPath('idAcceso', 'Id del acceso', 1, { type: 'integer' })], responses: R }) },
  '/api/v1/acceso/modificar': { post: op(T.accesos, 'Activar o desactivar un acceso', null, { operationId: 'accesoModificar', requestBody: body(ref('AccesoModificarRequestDTO')), responses: RID }) },

  //-- Accesos por rol
  '/api/v1/accesoRol/listaAccesoRol/{idRol}': { get: op(T.accesoRol, 'Accesos de un rol', null, { operationId: 'accesoRolLista', parameters: [pPath('idRol', 'Id del rol', 2, { type: 'integer' })], responses: lista({ type: 'object' }, 'lista') }) },
  '/api/v1/accesoRol/registros': { post: op(T.accesoRol, 'Asignar accesos a un rol', null, { operationId: 'accesoRolRegistro', requestBody: body(ref('AccesoRolListaRequestDTO'), { lista: [{ idrol: 3, idacceso: 1 }] }), responses: RID }) },
  '/api/v1/accesoRol/modificar': { post: op(T.accesoRol, 'Reemplazar los accesos de un rol', 'La lista enviada queda como los accesos del rol.', { operationId: 'accesoRolModificar', requestBody: body(ref('AccesoRolListaRequestDTO'), { lista: [{ idrol: 3, idacceso: 1 }, { idrol: 3, idacceso: 2 }] }), responses: RID }) },

  //-- Recuperar contraseña (públicas)
  '/api/v1/login/enviarCorreo': { post: op(T.recuperar, 'Enviar el correo para restablecer la contraseña', 'Responde 1 = correo enviado · 0 = no se pudo.', { ...PUBLICO, operationId: 'enviarCorreo', requestBody: body(ref('CorreoRequestDTO')), responses: ok({ type: 'integer', enum: [0, 1] }, 1) }) },
  '/api/v1/login/restablecer/verificar/{token}': { get: op(T.recuperar, 'Verificar el token del correo', 'Responde 1 = válido · 0 = vencido o inexistente.', { ...PUBLICO, operationId: 'verificarToken', parameters: [pPath('token', 'Token recibido por correo', 'b3f1c0...')], responses: ok({ type: 'integer', enum: [0, 1] }, 1) }) },
  '/api/v1/login/restablecer': { post: op(T.recuperar, 'Guardar la nueva contraseña', 'Responde 1 = guardada · 0 = no se pudo.', { ...PUBLICO, operationId: 'restablecer', requestBody: body(ref('TokenRequestDTO')), responses: ok({ type: 'integer', enum: [0, 1] }, 1) }) },

  //-- Multitabla
  '/api/v1/multitabla/listados/{codigoTabla}': { get: op(T.multitabla, 'Valores activos de una tabla', '001 departamentos · 002 provincias (codigoPadre = departamento) · 003 distritos (codigoPadre = provincia) · 004 tipos de documento · 033 sectores CIIU...', { operationId: 'multitablaListados', parameters: [pPath('codigoTabla', 'Código de la tabla', '002'), pQuery('codigoPadre', 'Filtra por el código del padre', '15')], responses: lista(ref('ItemMultitabla')) }) },
  '/api/v1/multitabla/tablas': { get: op(T.multitabla, 'Lista de tablas y qué se puede editar en cada una', null, { operationId: 'multitablaTablas', responses: lista() }) },
  '/api/v1/multitabla/admin/{codigoTabla}': { get: op(T.multitabla, 'Valores de una tabla para administrar (incluye inactivos)', null, { operationId: 'multitablaAdmin', parameters: [pPath('codigoTabla', 'Código de la tabla', '031'), pQuery('codigoPadre', 'Filtra por el código del padre', null)], responses: lista() }) },
  '/api/v1/multitabla/catalogos': { get: op(T.multitabla, 'Varios catálogos en una llamada', null, { operationId: 'multitablaCatalogos', parameters: [pQuery('tablas', 'Códigos separados por coma', '033,036')], responses: ok(conBase({ catalogos: { type: 'object', additionalProperties: { type: 'array', items: { type: 'object' } } } })) }) },
  '/api/v1/multitabla/guardar': { post: op(T.multitabla, 'Agregar o modificar un valor', 'Cada tabla define qué se puede cambiar (ver /multitabla/tablas). Requiere el permiso MULTITABLA_EDITAR.', { operationId: 'multitablaGuardar', requestBody: body(ref('MultitablaGuardarRequestDTO'), { idMultitabla: 2176, codigoTabla: '031', codigo: 'MUESTRA_EMPRESAS', valor: '15' }), responses: RID }) },
  '/api/v1/multitabla/estado': { post: op(T.multitabla, 'Activar o desactivar un valor', 'Solo en tablas que lo permiten (por ejemplo 006 País).', { operationId: 'multitablaEstado', requestBody: body(ref('MultitablaEstadoRequestDTO')), responses: R }) },

  //-- Apariencia
  '/api/v1/apariencia/publica': { get: op(T.apariencia, 'Colores y fondo del login', 'Pública: el login la usa antes de iniciar sesión.', { ...PUBLICO, operationId: 'aparienciaPublica', responses: ok(conBase({ valores: { type: 'object', additionalProperties: { type: 'string' } } })) }) },
  '/api/v1/apariencia/guardar': { post: op(T.apariencia, 'Guardar colores', 'Requiere el permiso APARIENCIA_EDITAR.', { operationId: 'aparienciaGuardar', requestBody: body(ref('AparienciaGuardarRequestDTO')), responses: R }) },
  '/api/v1/apariencia/fondoLogin': { post: op(T.apariencia, 'Cambiar la imagen de fondo del login', null, { operationId: 'aparienciaFondo', requestBody: archivo(), responses: R }) },
  '/api/v1/apariencia/quitarFondo': { post: op(T.apariencia, 'Volver a la imagen original del login', null, { operationId: 'aparienciaQuitarFondo', responses: R }) },

  //-- MarketData
  '/api/v1/territorial/indicadores/{ubigeo}': { get: op(T.territorial, 'Indicadores territoriales de una zona', 'Servicio de entidad. Usa la caché vigente o consulta al INEI (REST/JSON) con timeout y reintentos. Si el INEI falla y hay dato guardado, responde origen CACHE_VENCIDA.', { operationId: 'territorialIndicadores', parameters: [pPath('ubigeo', 'UBIGEO de 2, 4 o 6 dígitos', '150122'), pForzar], responses: { 200: { description: 'codigoRespuesta "01" = éxito · "99" = error controlado', content: json({ allOf: [ref('Respuesta'), ref('MetaFuente'), obj({ territorial: ref('Territorial') })] }, EJ.territorial) } } }) },
  '/api/v1/empresarial/ruc/{ruc}': { get: op(T.empresarial, 'Datos de un contribuyente por RUC', 'Valida el dígito verificador (módulo 11) y consulta a la SUNAT por SOAP (getDatosPrincipales).', { operationId: 'empresarialRuc', parameters: [pPath('ruc', 'RUC de 11 dígitos', '20147117761'), pForzar], responses: { 200: { description: 'codigoRespuesta "01" = éxito · "99" = error controlado', content: json({ allOf: [ref('Respuesta'), ref('MetaFuente'), obj({ contribuyente: ref('Contribuyente') })] }, EJ.ruc) } } }) },
  '/api/v1/empresarial/zona/{ubigeo}': { get: op(T.empresarial, 'Resumen empresarial de una zona', 'Empresas por sección CIIU, activas, habidas, de baja y una muestra (SOAP getResumenPorUbigeo).', { operationId: 'empresarialZona', parameters: [pPath('ubigeo', 'UBIGEO de 2, 4 o 6 dígitos', '150122'), pForzar], responses: ok({ allOf: [ref('Respuesta'), ref('MetaFuente'), obj({ empresarial: { type: 'object' } })] }, EJ.zona) }) },
  '/api/v1/analisis/zona': { post: op(T.orquestador, 'Analizar una zona (orquestación)', 'Servicio compuesto. Valida la solicitud, invoca **en paralelo** al Servicio Territorial (INEI) y al Empresarial (SUNAT), consolida, calcula el índice de atractivo (0-100) y guarda el análisis. Estado: COMPLETO (ambas fuentes), PARCIAL (una) o FALLIDO (ninguna). La lista `trazabilidad` muestra cada paso del BPMN con su tiempo.', { operationId: 'analizarZona', requestBody: body(ref('AnalisisZonaRequestDTO'), { ubigeo: '150122', seccionInteres: 'I' }), responses: ok(conBase({ analisis: { type: 'object' } }), EJ.analisis) }) },
  '/api/v1/analisis/listados': { get: op(T.analisis, 'Historial de análisis', 'No vuelve a llamar a INEI ni SUNAT.', { operationId: 'analisisListados', parameters: [pQuery('texto', 'Zona o UBIGEO', 'LIMA'), pQuery('nivel', 'DEPARTAMENTO · PROVINCIA · DISTRITO', null), pQuery('estado', 'COMPLETO · PARCIAL · FALLIDO', null), pQuery('nivelAtractivo', 'ALTO · MEDIO · BAJO', null), pQuery('desde', 'Fecha inicial (AAAA-MM-DD)', null, { type: 'string', format: 'date' }), pQuery('hasta', 'Fecha final (AAAA-MM-DD)', null, { type: 'string', format: 'date' })], responses: lista() }) },
  '/api/v1/analisis/mostrar/{id}': { get: op(T.analisis, 'Ver un análisis guardado', null, { operationId: 'analisisMostrar', parameters: [pPath('id', 'Id del análisis', 1, { type: 'integer' })], responses: ok(conBase({ analisis: { type: 'object' } })) }) },
  '/api/v1/analisis/comparar': { get: op(T.analisis, 'Comparar de 2 a 4 análisis', null, { operationId: 'analisisComparar', parameters: [{ ...pQuery('ids', 'Ids separados por coma (2 a 4)', '1,2'), required: true }], responses: ok(conBase({ listados: { type: 'array', items: { type: 'object' } }, recomendado: int('Id del análisis con mejor índice', 1) })) }) },
  '/api/v1/analisis/dashboard': { get: op(T.analisis, 'Datos del panel principal', 'KPIs, ranking, análisis por día, por nivel, integración y últimos análisis.', { operationId: 'dashboard', responses: R }) },
  '/api/v1/integracion/bitacora': { get: op(T.integracion, 'Bitácora de llamadas a INEI y SUNAT', null, { operationId: 'bitacora', parameters: [pQuery('servicio', 'INEI · SUNAT', null), pQuery('exito', 'true · false', null), pQuery('desde', 'AAAA-MM-DD', null, { type: 'string', format: 'date' }), pQuery('hasta', 'AAAA-MM-DD', null, { type: 'string', format: 'date' })], responses: R }) },
  '/api/v1/integracion/estado': { get: op(T.integracion, 'Disponibilidad de las fuentes y parámetros de mediación', null, { operationId: 'estadoIntegracion', responses: ok(ref('Respuesta'), EJ.estado) }) },
  '/api/v1/integracion/simulacion': { post: op(T.integracion, 'Simular fallas de INEI o SUNAT', 'Solo con los servicios simulados. Requiere el permiso INTEGRACION_SIMULAR. **Vuelve a NORMAL al terminar.**', { operationId: 'simulacion', requestBody: body(ref('SimulacionRequestDTO'), { servicio: 'INEI', modo: 'NORMAL' }), responses: R }) },
  '/api/v1/integracion/limpiarCache': { post: op(T.integracion, 'Limpiar la caché de INEI y SUNAT', 'La próxima consulta irá a la fuente. El historial de análisis se conserva. Requiere el permiso CACHE_LIMPIAR.', { operationId: 'limpiarCache', responses: R }) },

  //-- Servicios externos simulados (otro "sistema": sin token)
  '/mock/inei/api/v1/salud': { get: op(T.externos, 'INEI · verificación del servicio', null, { ...PUBLICO, operationId: 'ineiSalud', responses: { 200: { description: 'Servicio disponible', content: json(obj({ status: str('', 'UP'), servicio: str('', 'INEI - Indicadores territoriales (simulado)'), modo: str('', 'NORMAL') })) } } }) },
  '/mock/inei/api/v1/ubigeo/{ubigeo}/indicadores': { get: op(T.externos, 'INEI · indicadores en su formato original (REST/JSON)', 'Respuesta antes de que el adaptador la transforme.', { ...PUBLICO, operationId: 'ineiIndicadores', parameters: [pPath('ubigeo', 'UBIGEO', '150122')], responses: { 200: { description: 'Indicadores INEI', content: json({ type: 'object' }) } } }) },
  '/mock/sunat/ws/ConsultaRuc': {
    get: op(T.externos, 'SUNAT · contrato WSDL', 'Agrega ?wsdl en el navegador.', { ...PUBLICO, operationId: 'sunatWsdl', parameters: [{ name: 'wsdl', in: 'query', required: false, allowEmptyValue: true, schema: { type: 'string' } }], responses: { 200: { description: 'WSDL', content: { 'text/xml': { schema: { type: 'string' } } } } } }),
    post: op(T.externos, 'SUNAT · operación SOAP (XML)', 'Header SOAPAction: getDatosPrincipales o getResumenPorUbigeo.', {
      ...PUBLICO, operationId: 'sunatSoap',
      parameters: [{ name: 'SOAPAction', in: 'header', required: true, schema: { type: 'string', enum: ['getDatosPrincipales', 'getResumenPorUbigeo'], example: 'getDatosPrincipales' } }],
      requestBody: { required: true, content: { 'text/xml': { schema: { type: 'string' }, example: '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://ws.consultaruc.sunat.mock.marketdata.pe/"><soapenv:Header/><soapenv:Body><ser:getDatosPrincipales><numruc>20147117761</numruc></ser:getDatosPrincipales></soapenv:Body></soapenv:Envelope>' } } },
      responses: { 200: { description: 'Sobre SOAP de respuesta', content: { 'text/xml': { schema: { type: 'string' } } } } },
    }),
  },
  '/actuator/health': { get: op(T.salud, 'Verificar que el back está arriba', null, { ...PUBLICO, operationId: 'health', responses: { 200: { description: 'OK', content: json(obj({ status: str('', 'UP') }), { status: 'UP' }) } } }) },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'MarketData Perú – API REST (SOA)',
    version: '1.0.0',
    description: [
      'API de MarketData Perú: integra el **INEI** (REST/JSON) y la **SUNAT** (SOAP/XML) mediante servicios de entidad, utilidad y orquestación.',
      '',
      '**Cómo probar:** 1) ejecuta *Autenticación › Iniciar sesión* con tu usuario; 2) copia `jwtToken`; 3) presiona **Authorize** y pégalo (sin la palabra Bearer).',
      '',
      '**Respuestas:** casi siempre HTTP 200. El resultado está en `codigoRespuesta`: "01" = éxito, "99" = error controlado (mensaje en `mensajeRespuesta`).',
    ].join('\n'),
  },
  servers: [{ url: CTX, description: 'Este servidor' }],
  tags: Object.values(T).map((name) => ({ name })),
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas },
  security: [{ bearerAuth: [] }],
  paths,
};
