/**
 * Pruebas unitarias que NO necesitan base de datos:  npm test
 */
process.env.LOG_LEVEL = 'error';
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { validarDto } = require('../src/validators/validar');
const dateUtil = require('../src/utils/dateUtil');
const { obtenerMensaje } = require('../src/config/messages');
const jwtFilter = require('../src/middlewares/jwtFilter');

test('validar UsuarioRegistroRequestDTO: detecta campos obligatorios y formato', () => {
  const { errores } = validarDto('UsuarioRegistroRequestDTO', { nombres: '', telefono: '12a', dni: '123' });
  const campos = errores.map((e) => `${e.code}.${e.field}`);
  assert.ok(campos.includes('NotBlank.nombres'));
  assert.ok(campos.includes('Pattern.telefono'));
  assert.ok(campos.includes('NotBlank.correo'));
  assert.strictEqual(errores[0].resource, 'usuarioRegistroRequestDTO');
});

test('validar convierte tipos como Jackson (string -> int, boolean ausente -> false)', () => {
  const { datos, errores } = validarDto('MenuRegistroRequestDTO', { nombre: 'A', descripcion: 'B', orden: '3' });
  assert.strictEqual(errores.length, 0);
  assert.strictEqual(datos.orden, 3);
  assert.strictEqual(datos.flkactivo, false);
});

test('validar lista de AccesoRolListaRequestDTO', () => {
  const { datos } = validarDto('AccesoRolListaRequestDTO', { lista: [{ idrol: '2', idacceso: 5 }] });
  assert.deepStrictEqual(datos.lista, [{ idrol: 2, idacceso: 5 }]);
});

test('mensajes con parámetros', () => {
  assert.strictEqual(obtenerMensaje('generico.soaException', ['XDTO']), 'Error en atributos obligatorios del request XDTO');
  assert.strictEqual(obtenerMensaje('llave.inexistente'), 'llave.inexistente');
});

test('dateUtil: formatear y parsear', () => {
  const d = new Date(2026, 8, 30, 14, 5, 9);
  assert.strictEqual(dateUtil.dateToString(d, dateUtil.FORMATO_DIA_DDMMYYYY_HHMMSS), '30/09/2026 14:05:09');
  assert.strictEqual(dateUtil.dateToString(d, dateUtil.FORMATO_DIA_DDMMYYYY_T_HHMMSS), '2026-09-30T14:05:09');
  assert.strictEqual(dateUtil.stringToDate('30/09/2026', 'dd/MM/yyyy').getTime(), new Date(2026, 8, 30).getTime());
  assert.strictEqual(dateUtil.stringToDate('xx', 'dd/MM/yyyy'), null);
});

function llamarFiltro(path, authorization) {
  let body = null;
  let nextLlamado = false;
  const req = { path, headers: authorization ? { authorization } : {} };
  const res = { status() { return this; }, json(b) { body = b; return this; } };
  jwtFilter(req, res, () => { nextLlamado = true; });
  return { body, nextLlamado, req };
}

test('jwtFilter: login y recuperar contraseña no piden token', () => {
  assert.ok(llamarFiltro('/api/v1/usuarios/ingresos').nextLlamado);
  assert.ok(llamarFiltro('/api/v1/login/restablecer/verificar/abc').nextLlamado);
});

test('jwtFilter: sin token o token inválido responde 99', () => {
  assert.strictEqual(llamarFiltro('/api/v1/roles/listados').body.mensajeRespuesta, 'Token - Authorization header invalido');
  assert.strictEqual(llamarFiltro('/api/v1/roles/listados', 'Bearer xxx').body.mensajeRespuesta, 'Token - Expirado o Modificado');
});

test('jwtFilter: token válido deja pasar y guarda los claims', () => {
  const token = jwt.sign({}, config.jwt.secret, { subject: 'ADMIN', issuer: config.jwt.issuer, audience: config.jwt.audience, expiresIn: 60 });
  const r = llamarFiltro('/api/v1/roles/listados', `Bearer ${token}`);
  assert.ok(r.nextLlamado);
  assert.strictEqual(r.req.claims.sub, 'ADMIN');
});

//-- ===================== MARKETDATA =====================
const { ejecutarComo, usuarioActual } = require('../src/utils/contexto');
const ruc = require('../src/utils/ruc');
const indice = require('../src/utils/indiceAtractivo');
const ineiAdapter = require('../src/integracion/ineiRestAdapter');
const sunatAdapter = require('../src/integracion/sunatSoapAdapter');
const mocks = require('../src/integracion/mocks/datos');

test('contexto: usuario de la petición para usuario_crea', async () => {
  assert.strictEqual(usuarioActual(), 'sistema');
  await ejecutarComo('analista', async () => assert.strictEqual(usuarioActual(), 'analista'));
});

test('validar AnalisisZonaRequestDTO: ubigeo obligatorio de 2, 4 o 6 dígitos', () => {
  assert.strictEqual(validarDto('AnalisisZonaRequestDTO', { ubigeo: '150122', seccionInteres: 'I' }).errores.length, 0);
  assert.strictEqual(validarDto('AnalisisZonaRequestDTO', { ubigeo: '15' }).datos.forzar, false);
  assert.ok(validarDto('AnalisisZonaRequestDTO', { ubigeo: '1501221' }).errores.some((e) => e.code === 'Pattern'));
  assert.ok(validarDto('AnalisisZonaRequestDTO', {}).errores.some((e) => e.code === 'NotBlank'));
});

test('RUC: dígito verificador módulo 11', () => {
  assert.strictEqual(ruc.motivoInvalido('20131312955'), null);
  assert.match(ruc.motivoInvalido('20131312956'), /verificador/);
  assert.match(ruc.motivoInvalido('2013131295'), /11 dígitos/);
  assert.match(ruc.motivoInvalido('30131312955'), /empezar/);
});

test('Adaptador INEI: transforma la lista de indicadores al contrato interno', () => {
  const d = ineiAdapter.normalizar({
    codigoUbigeo: '150122', nivelTerritorial: 'DIST', anioReferencia: 2017, fuente: 'INEI',
    indicadores: [{ codigo: 'POB_TOT', valor: '100000' }, { codigo: 'SUP_KM2', valor: '20.00' }, { codigo: 'POBREZA_PCT', valor: '7.5' }, { codigo: 'XX', valor: '1' }],
  }, '150122');
  assert.strictEqual(d.nivel, 'DISTRITO');
  assert.strictEqual(d.poblacionTotal, 100000);
  assert.strictEqual(d.densidadHabKm2, 5000);
  assert.strictEqual(d.tasaPobreza, 7.5);
  assert.strictEqual(d.hogares, null);
});

test('Adaptador SUNAT: SOAP Fault y normalización de estado / condición / sección CIIU', () => {
  const fault = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultcode>soap:Client</faultcode><faultstring>RUC inválido</faultstring></soap:Fault></soap:Body></soap:Envelope>';
  assert.deepStrictEqual(sunatAdapter.leerFault(fault), { codigo: 'Client', mensaje: 'RUC inválido' });
  const c = sunatAdapter.normalizarContribuyente({ ddp_numruc: '20131312955', ddp_nombre: 'X S.A.C.', desc_estado: 'BAJA DE OFICIO', desc_flag22: 'NO HABIDO', ddp_ciiu: '5610', ddp_ubigeo: '010101', ddp_nomcomer: '-' });
  assert.strictEqual(c.estado, 'BAJA_DE_OFICIO');
  assert.strictEqual(c.condicion, 'NO_HABIDO');
  assert.strictEqual(c.seccionCiiu, 'I');
  assert.strictEqual(c.nombreComercial, null);
  assert.strictEqual(sunatAdapter.seccionDeCiiu('4711'), 'G');
  assert.strictEqual(sunatAdapter.seccionDeCiiu('0111'), 'A');
});

test('Índice de atractivo: ponderación, rubro y nivel', () => {
  const t = { poblacionTotal: 100000, densidadHabKm2: 1000, tasaPobreza: 20 };
  const e = { empresasActivas: 4500, sectores: [{ seccionCiiu: 'G', activas: 1800 }, { seccionCiiu: 'I', activas: 900 }] };
  const r = indice.calcular(t, e, { pesoDemanda: 40, pesoCompetencia: 35, pesoPoder: 25, referenciaPorMil: 45 });
  assert.strictEqual(r.empresasPorMil, 45);
  assert.strictEqual(r.indiceCompetencia, 66.67); //-- ratio 1 -> 1 - 0.5/1.5
  assert.strictEqual(r.indicePoderAdquisitivo, 80);
  assert.strictEqual(r.sectorPredominante, 'G');
  assert.ok(r.indiceAtractivo > 0 && r.indiceAtractivo <= 100);
  const rubro = indice.calcular(t, e, { seccionInteres: 'I', referenciaPorMil: 45 });
  assert.strictEqual(rubro.empresasRubro, 900);
  assert.strictEqual(indice.calcular(t, null, {}).indiceAtractivo, null); //-- sin SUNAT no hay índice
  assert.strictEqual(indice.nivelDe(70), 'ALTO');
  assert.strictEqual(indice.nivelDe(55), 'MEDIO');
  assert.strictEqual(indice.nivelDe(40), 'BAJO');
});

test('Servicios simulados: determinísticos y coherentes', () => {
  const a = mocks.resumenZona('150122');
  const b = mocks.resumenZona('150122');
  assert.deepStrictEqual(a, b);
  assert.ok(a.activos <= a.total);
  const dep = mocks.indicadoresZona('15');
  assert.strictEqual(dep.pob > 9000000, true); //-- Lima: Censo 2017 ~ 9.48 millones
  const muestra = mocks.muestraZona('150122', 5);
  assert.strictEqual(muestra.length, 5);
  muestra.forEach((c) => {
    assert.ok(mocks.rucValido(c.ruc));
    assert.strictEqual(c.ubigeo, '150122'); //-- la muestra pertenece al distrito
    assert.strictEqual(mocks.datosRuc(c.ruc).razonSocial, c.razonSocial); //-- consultar el RUC devuelve lo mismo
  });
});
