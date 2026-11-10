/**
 * Rutas de la API REST de MarketData (bajo el context-path, ej. /marketdata-api)
 */
const express = require('express');
const multer = require('multer');
const config = require('../config');
const C = require('../config/constantes');
const { validar } = require('../validators/validar');
const { asyncHandler: h } = require('../middlewares/errorHandler');

const usuario = require('../controllers/usuarioController');
const rol = require('../controllers/rolController');
const menu = require('../controllers/menuController');
const acceso = require('../controllers/accesoController');
const accesoRol = require('../controllers/accesoRolController');
const login = require('../controllers/loginController');
const maestro = require('../controllers/maestroController');
const md = require('../controllers/marketdataController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxFileSizeMB * 1024 * 1024 } });
const router = express.Router();

//-- /api/v1/usuarios
router.post(C.LOGIN_URL, h(usuario.ingreso));
router.get(`/api/v1/usuarios${C.JWT_URL_REFRESH_TOKEN}`, h(usuario.refreshToken));
router.post('/api/v1/usuarios/registros', validar('UsuarioRegistroRequestDTO'), h(usuario.registro));
router.get('/api/v1/usuarios/listados', h(usuario.listados));
router.get('/api/v1/usuarios/mostrar/:idUsuario', h(usuario.mostrar));
router.post('/api/v1/usuarios/saveFoto', upload.single('file'), h(usuario.guardarFoto));
router.post('/api/v1/usuarios/miFoto', upload.single('file'), h(usuario.guardarMiFoto));
router.get('/api/v1/usuarios/foto/:idUsuario', h(usuario.foto));
router.get('/api/v1/usuarios/miPerfil', h(usuario.miPerfil));
router.post('/api/v1/usuarios/miPerfil', validar('UsuarioPerfilRequestDTO'), h(usuario.guardarMiPerfil));
router.post('/api/v1/usuarios/modificar', validar('UsuarioModificarRequestDTO'), h(usuario.modificarEstado));

//-- /api/v1/roles
router.post('/api/v1/roles/registros', validar('RolRegistroRequestDTO'), h(rol.registro));
router.get('/api/v1/roles/listados', h(rol.listados));
router.get('/api/v1/roles/inicializacion', h(rol.inicializacion));
router.post('/api/v1/roles/modificar', validar('RolModificacionRequestDTO'), h(rol.modificar));
router.get('/api/v1/roles/mostrar/:idrol', h(rol.mostrar));
router.get('/api/v1/roles/cambiarEstado/:idrol/:estado', h(rol.cambiarEstado));
router.post('/api/v1/roles/modificarRol', validar('RolModificarRequestDTO'), h(rol.modificarEstado));

//-- /api/v1/menu
router.get('/api/v1/menu/listados', h(menu.listados));
router.get('/api/v1/menu/menuactivos', h(menu.activos));
router.post('/api/v1/menu/registros', validar('MenuRegistroRequestDTO'), h(menu.registro));
router.get('/api/v1/menu/mostrar/:idMenu', h(menu.mostrar));
router.post('/api/v1/menu/modificar', validar('MenuModificarRequestDTO'), h(menu.modificarEstado));

//-- /api/v1/acceso
router.get('/api/v1/acceso/accesos', h(acceso.accesos));
router.post('/api/v1/acceso/registros', validar('AccesoRegistroRequestDTO'), h(acceso.registro));
router.get('/api/v1/acceso/listados', h(acceso.listados));
router.get('/api/v1/acceso/mostrar/:idAcceso', h(acceso.mostrar));
router.post('/api/v1/acceso/modificar', validar('AccesoModificarRequestDTO'), h(acceso.modificarEstado));

//-- /api/v1/accesoRol
router.get('/api/v1/accesoRol/listaAccesoRol/:idRol', h(accesoRol.listaPorRol));
router.post('/api/v1/accesoRol/registros', validar('AccesoRolListaRequestDTO'), h(accesoRol.registro));
router.post('/api/v1/accesoRol/modificar', validar('AccesoRolListaRequestDTO'), h(accesoRol.modificar));

//-- /api/v1/login (recuperar contraseña, sin token)
router.post('/api/v1/login/enviarCorreo', validar('CorreoRequestDTO'), h(login.enviarCorreo));
router.get('/api/v1/login/restablecer/verificar/:token', h(login.verificar));
router.post('/api/v1/login/restablecer', h(login.restablecer));

//-- ===================== MAESTROS =====================
//-- Multitabla: ubigeo (001 departamento, 002 provincia, 003 distrito), sectores CIIU (033), estados, parámetros (031)
router.get('/api/v1/multitabla/listados/:codigoTabla', h(maestro.multitabla));
router.get('/api/v1/multitabla/tablas', h(maestro.multitablaTablas));
router.get('/api/v1/multitabla/admin/:codigoTabla', h(maestro.multitablaAdmin));
router.get('/api/v1/multitabla/catalogos', h(maestro.multitablaCatalogos));
router.post('/api/v1/multitabla/guardar', validar('MultitablaGuardarRequestDTO'), h(maestro.multitablaGuardar));
router.post('/api/v1/multitabla/estado', validar('MultitablaEstadoRequestDTO'), h(maestro.multitablaEstado));
//-- Apariencia (la pública no pide token: la usa el login)
router.get('/api/v1/apariencia/publica', h(maestro.aparienciaPublica));
router.post('/api/v1/apariencia/guardar', validar('AparienciaGuardarRequestDTO'), h(maestro.aparienciaGuardar));
router.post('/api/v1/apariencia/fondoLogin', upload.single('file'), h(maestro.aparienciaFondoLogin));
router.post('/api/v1/apariencia/quitarFondo', h(maestro.aparienciaQuitarFondo));

//-- ===================== MARKETDATA (SOA) =====================
//-- Servicio Territorial (entidad) -> INEI REST/JSON
router.get('/api/v1/territorial/indicadores/:ubigeo', h(md.territorialIndicadores));
//-- Servicio Empresarial (entidad) -> SUNAT SOAP/XML
router.get('/api/v1/empresarial/ruc/:ruc', h(md.empresarialRuc));
router.get('/api/v1/empresarial/zona/:ubigeo', h(md.empresarialZona));
//-- Servicio Orquestador "Análisis de zona" (composición de Territorial + Empresarial)
router.post('/api/v1/analisis/zona', validar('AnalisisZonaRequestDTO'), h(md.analizarZona));
//-- Análisis guardados (MySQL): no vuelven a llamar a INEI ni SUNAT
router.get('/api/v1/analisis/listados', h(md.analisisListados));
router.get('/api/v1/analisis/mostrar/:id', h(md.analisisMostrar));
router.get('/api/v1/analisis/comparar', h(md.analisisComparar));
router.get('/api/v1/analisis/dashboard', h(md.dashboard));
//-- Integración: bitácora, estado de las fuentes, simulación de fallas y caché
router.get('/api/v1/integracion/bitacora', h(md.bitacora));
router.get('/api/v1/integracion/estado', h(md.estadoIntegracion));
router.post('/api/v1/integracion/simulacion', validar('SimulacionRequestDTO'), h(md.simulacion));
router.post('/api/v1/integracion/limpiarCache', h(md.limpiarCache));

module.exports = router;
