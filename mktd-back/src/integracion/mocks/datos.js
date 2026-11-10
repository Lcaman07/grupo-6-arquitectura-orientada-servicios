/**
 * Datos de los servicios SIMULADOS del INEI y la SUNAT (fines académicos).
 * ----------------------------------------------------------------------------
 * El proyecto se desarrolla con fines académicos (Cap. 1, Limitaciones): el acceso a los servicios
 * oficiales se simula con estos "servicios externos" que corren dentro del mismo back pero se consumen
 * por HTTP igual que uno real (REST/JSON el INEI y SOAP/XML la SUNAT).
 *
 *  - INEI : población por departamento = Censos Nacionales 2017; el reparto por distrito es simulado
 *           (data/inei-censo.json, generado una sola vez y siempre igual).
 *  - SUNAT: empresas por zona, RUC, razón social, CIIU, estado y condición se generan de forma
 *           DETERMINÍSTICA (el mismo RUC o UBIGEO siempre devuelve lo mismo).
 */
const censo = require('./data/inei-censo.json');

const DISTRITOS = censo.distritos;
const UBIGEOS = Object.keys(DISTRITOS).sort();
const INDICE_UBIGEO = new Map(UBIGEOS.map((u, i) => [u, i]));

//-- ---------------------------------------------------------------- utilidades deterministas
/** FNV-1a 32 bits */
function hash(texto) {
  let h = 0x811c9dc5;
  const s = String(texto);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio con semilla (mulberry32) */
function aleatorio(semilla) {
  let a = hash(semilla);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const elegir = (rnd, lista) => lista[Math.floor(rnd() * lista.length) % lista.length];

function elegirPonderado(rnd, pesos) {
  const total = Object.values(pesos).reduce((s, v) => s + v, 0);
  let r = rnd() * total;
  for (const [k, v] of Object.entries(pesos)) {
    r -= v;
    if (r <= 0) return k;
  }
  return Object.keys(pesos)[0];
}

//-- ---------------------------------------------------------------- INEI
/** Distritos que pertenecen a un UBIGEO de 2, 4 o 6 dígitos */
const distritosDe = (ubigeo) => UBIGEOS.filter((u) => u.startsWith(ubigeo));

/** Indicadores agregados de una zona (suma de sus distritos; promedios ponderados por población) */
function indicadoresZona(ubigeo) {
  const lista = distritosDe(ubigeo);
  if (!lista.length) return null;
  const s = { pob: 0, urb: 0, hom: 0, hog: 0, sup: 0, pea: 0, edadPond: 0, pobrezaPond: 0 };
  lista.forEach((u) => {
    const d = DISTRITOS[u];
    s.pob += d.pob; s.urb += d.urb; s.hom += d.hom; s.hog += d.hog; s.sup += d.sup; s.pea += d.pea;
    s.edadPond += d.edad * d.pob; s.pobrezaPond += d.pobreza * d.pob;
  });
  const primero = DISTRITOS[lista[0]];
  const nivel = ubigeo.length === 2 ? 'DEP' : ubigeo.length === 4 ? 'PROV' : 'DIST';
  return {
    ubigeo,
    nivel,
    departamento: primero.dep,
    provincia: nivel === 'DEP' ? null : primero.prov,
    distrito: nivel === 'DIST' ? primero.dist : null,
    distritos: lista.length,
    ...s,
    edad: s.edadPond / s.pob,
    pobreza: s.pobrezaPond / s.pob,
  };
}

//-- ---------------------------------------------------------------- SUNAT
//-- participación referencial de cada sección CIIU en el padrón (aprox.)
const PARTICIPACION = {
  A: 4.0, B: 0.6, C: 7.5, D: 0.2, E: 0.3, F: 5.0, G: 40.0, H: 8.5, I: 9.5, J: 1.8, K: 1.0,
  L: 1.6, M: 6.5, N: 5.0, O: 0.3, P: 2.2, Q: 2.0, R: 1.2, S: 5.5, T: 0.05, U: 0.02,
};

const CIIU = {
  A: [['0111', 'CULTIVO DE CEREALES (EXCEPTO ARROZ), LEGUMBRES Y SEMILLAS OLEAGINOSAS'], ['0141', 'CRIA DE GANADO BOVINO Y BUFALOS'], ['0311', 'PESCA MARITIMA']],
  B: [['0710', 'EXTRACCION DE MINERALES DE HIERRO'], ['0899', 'EXPLOTACION DE OTRAS MINAS Y CANTERAS N.C.P.']],
  C: [['1071', 'ELABORACION DE PRODUCTOS DE PANADERIA'], ['1410', 'FABRICACION DE PRENDAS DE VESTIR, EXCEPTO PRENDAS DE PIEL'], ['3100', 'FABRICACION DE MUEBLES']],
  D: [['3510', 'GENERACION, TRANSMISION Y DISTRIBUCION DE ENERGIA ELECTRICA']],
  E: [['3811', 'RECOGIDA DE DESECHOS NO PELIGROSOS']],
  F: [['4100', 'CONSTRUCCION DE EDIFICIOS'], ['4321', 'INSTALACIONES ELECTRICAS']],
  G: [
    ['4711', 'VENTA AL POR MENOR EN COMERCIOS NO ESPECIALIZADOS CON PREDOMINIO DE ALIMENTOS, BEBIDAS O TABACO'],
    ['4719', 'OTRAS ACTIVIDADES DE VENTA AL POR MENOR EN COMERCIOS NO ESPECIALIZADOS'],
    ['4520', 'MANTENIMIENTO Y REPARACION DE VEHICULOS AUTOMOTORES'],
    ['4530', 'VENTA DE PARTES, PIEZAS Y ACCESORIOS PARA VEHICULOS AUTOMOTORES'],
    ['4752', 'VENTA AL POR MENOR DE ARTICULOS DE FERRETERIA, PINTURAS Y PRODUCTOS DE VIDRIO'],
    ['4771', 'VENTA AL POR MENOR DE PRENDAS DE VESTIR, CALZADO Y ARTICULOS DE CUERO'],
    ['4772', 'VENTA AL POR MENOR DE PRODUCTOS FARMACEUTICOS Y MEDICINALES, COSMETICOS Y ARTICULOS DE TOCADOR'],
    ['4690', 'VENTA AL POR MAYOR NO ESPECIALIZADA'],
  ],
  H: [['4921', 'TRANSPORTE URBANO Y SUBURBANO DE PASAJEROS POR VIA TERRESTRE'], ['4923', 'TRANSPORTE DE CARGA POR CARRETERA'], ['5229', 'OTRAS ACTIVIDADES DE APOYO AL TRANSPORTE']],
  I: [['5610', 'ACTIVIDADES DE RESTAURANTES Y DE SERVICIO MOVIL DE COMIDAS'], ['5510', 'ACTIVIDADES DE ALOJAMIENTO PARA ESTANCIAS CORTAS'], ['5630', 'ACTIVIDADES DE SERVICIO DE BEBIDAS']],
  J: [['6201', 'ACTIVIDADES DE PROGRAMACION INFORMATICA'], ['6110', 'ACTIVIDADES DE TELECOMUNICACIONES ALAMBRICAS']],
  K: [['6419', 'OTROS TIPOS DE INTERMEDIACION MONETARIA'], ['6492', 'OTRAS ACTIVIDADES DE CONCESION DE CREDITO']],
  L: [['6810', 'ACTIVIDADES INMOBILIARIAS REALIZADAS CON BIENES PROPIOS O ARRENDADOS']],
  M: [['6920', 'ACTIVIDADES DE CONTABILIDAD, TENEDURIA DE LIBROS Y AUDITORIA; CONSULTORIA FISCAL'], ['7110', 'ACTIVIDADES DE ARQUITECTURA E INGENIERIA'], ['7310', 'PUBLICIDAD'], ['7020', 'ACTIVIDADES DE CONSULTORIA DE GESTION']],
  N: [['8299', 'OTRAS ACTIVIDADES DE SERVICIOS DE APOYO A LAS EMPRESAS N.C.P.'], ['7911', 'ACTIVIDADES DE AGENCIAS DE VIAJES'], ['8121', 'LIMPIEZA GENERAL DE EDIFICIOS']],
  O: [['8411', 'ACTIVIDADES DE LA ADMINISTRACION PUBLICA EN GENERAL']],
  P: [['8510', 'ENSEÑANZA PREESCOLAR Y PRIMARIA'], ['8549', 'OTROS TIPOS DE ENSEÑANZA N.C.P.']],
  Q: [['8620', 'ACTIVIDADES DE MEDICOS Y ODONTOLOGOS'], ['8610', 'ACTIVIDADES DE HOSPITALES']],
  R: [['9311', 'GESTION DE INSTALACIONES DEPORTIVAS'], ['9329', 'OTRAS ACTIVIDADES DE ESPARCIMIENTO Y RECREATIVAS N.C.P.']],
  S: [['9602', 'PELUQUERIA Y OTROS TRATAMIENTOS DE BELLEZA'], ['9511', 'REPARACION DE ORDENADORES Y EQUIPO PERIFERICO']],
  T: [['9700', 'ACTIVIDADES DE LOS HOGARES COMO EMPLEADORES DE PERSONAL DOMESTICO']],
  U: [['9900', 'ACTIVIDADES DE ORGANIZACIONES Y ORGANOS EXTRATERRITORIALES']],
};

const ESTADOS = { ACTIVO: 80, 'SUSPENSION TEMPORAL': 3, 'BAJA PROVISIONAL': 2, 'BAJA DE OFICIO': 10, 'BAJA DEFINITIVA': 5 };
const CONDICIONES = { HABIDO: 86, 'NO HABIDO': 10, 'NO HALLADO': 4 };

const PREFIJOS = {
  A: ['AGROINDUSTRIAS', 'AGRICOLA', 'PESQUERA', 'GANADERA'], B: ['MINERA', 'COMPAÑIA MINERA'], C: ['INDUSTRIAS', 'PANIFICADORA', 'TEXTIL', 'MUEBLERIA'],
  D: ['ENERGIA', 'HIDROELECTRICA'], E: ['SANEAMIENTO', 'RECICLAJE'], F: ['CONSTRUCTORA', 'INMOBILIARIA Y CONSTRUCTORA', 'CONTRATISTAS GENERALES'],
  G: ['COMERCIAL', 'DISTRIBUIDORA', 'INVERSIONES', 'IMPORTACIONES', 'NEGOCIACIONES', 'BOTICA', 'FERRETERIA', 'MINIMARKET'],
  H: ['EMPRESA DE TRANSPORTES', 'TRANSPORTES', 'LOGISTICA'], I: ['RESTAURANT', 'CEVICHERIA', 'POLLERIA', 'HOSTAL', 'HOTEL'],
  J: ['SISTEMAS', 'SOLUCIONES TECNOLOGICAS', 'TELECOMUNICACIONES'], K: ['FINANCIERA', 'CAJA', 'CORPORACION FINANCIERA'], L: ['INMOBILIARIA'],
  M: ['ESTUDIO CONTABLE', 'CONSULTORA', 'INGENIEROS CONSULTORES', 'AGENCIA DE PUBLICIDAD'], N: ['SERVICIOS GENERALES', 'MULTISERVICIOS', 'AGENCIA DE VIAJES'],
  O: ['PROYECTO ESPECIAL'], P: ['INSTITUCION EDUCATIVA PRIVADA', 'CENTRO DE ESTUDIOS', 'ACADEMIA'], Q: ['CLINICA', 'POLICLINICO', 'CENTRO ODONTOLOGICO'],
  R: ['CENTRO DE ENTRETENIMIENTO', 'COMPLEJO DEPORTIVO'], S: ['SALON DE BELLEZA', 'SERVICIO TECNICO', 'LAVANDERIA'], T: ['SERVICIO DOMESTICO'], U: ['MISION'],
};
const NOMBRES = ['ANDINA', 'DEL SUR', 'SAN MARTIN', 'EL PACIFICO', 'SANTA ROSA', 'INKA', 'MISTI', 'AMAZONICA', 'NORTE GRANDE', 'LA ESPERANZA',
  'VIRGEN DE GUADALUPE', 'SEÑOR DE LOS MILAGROS', 'CHAVIN', 'MOCHE', 'NAZCA', 'PARACAS', 'TITICACA', 'HUASCARAN', 'CORDILLERA', 'EL SOL',
  'LAS LOMAS', 'SAN JUDAS', 'NEXO PERU', 'QORI', 'WARI', 'KUNTUR', 'MAR AZUL', 'LOS ANDES', 'TAWANTINSUYO', 'RIMAC', 'SANTA CATALINA', 'PUMA'];
const SUFIJOS = { 'SOCIEDAD ANONIMA CERRADA': 'S.A.C.', 'EMPRESA INDIVIDUAL DE RESP. LTDA': 'E.I.R.L.', 'SOC.COM.RESPONS. LTDA': 'S.R.L.', 'SOCIEDAD ANONIMA': 'S.A.' };
const APELLIDOS = ['QUISPE', 'MAMANI', 'FLORES', 'HUAMAN', 'RODRIGUEZ', 'SANCHEZ', 'GARCIA', 'ROJAS', 'GONZALES', 'RAMIREZ', 'CHAVEZ', 'TORRES',
  'VARGAS', 'DIAZ', 'CASTILLO', 'MENDOZA', 'ESPINOZA', 'CRUZ', 'RAMOS', 'VALENCIA', 'CONDORI', 'TICONA', 'PAREDES', 'GUTIERREZ'];
const NOMBRES_PERSONA = ['JUAN CARLOS', 'MARIA ELENA', 'JOSE LUIS', 'ROSA', 'LUIS ALBERTO', 'CARMEN', 'JORGE', 'ANA MARIA', 'MIGUEL ANGEL',
  'LUZ MARINA', 'PEDRO', 'GLADYS', 'CESAR AUGUSTO', 'ELIZABETH', 'VICTOR HUGO', 'MILAGROS'];
const VIAS = ['AV.', 'JR.', 'CAL.', 'PSJE.', 'MZA.'];
const CALLES = ['LOS INCAS', 'GRAU', 'BOLOGNESI', 'SAN MARTIN', 'LIMA', 'AREQUIPA', 'LOS PINOS', 'TUPAC AMARU', 'LAS FLORES', 'UNION', 'COMERCIO',
  'JOSE GALVEZ', 'MARISCAL CASTILLA', 'ALFONSO UGARTE', 'PROLONGACION LOS ALAMOS', 'INDEPENDENCIA', 'LA MARINA', 'SANTA ROSA'];

/** Dígito verificador del RUC (módulo 11, factores 5 4 3 2 7 6 5 4 3 2) */
function digitoRuc(diez) {
  const f = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = f.reduce((s, x, i) => s + x * Number(diez[i]), 0);
  const r = 11 - (suma % 11);
  return r === 10 ? 0 : r === 11 ? 1 : r;
}
const rucValido = (ruc) => /^(10|15|16|17|20)\d{9}$/.test(String(ruc)) && digitoRuc(String(ruc).slice(0, 10)) === Number(String(ruc)[10]);

/** Pesos de cada sección CIIU según qué tan urbano es el distrito */
function pesosSector(d) {
  const urb = d.urb / d.pob;
  const p = { ...PARTICIPACION };
  p.A *= 1 + 4 * (1 - urb);
  p.B *= 1 + 2 * (1 - urb);
  ['J', 'K', 'M', 'L'].forEach((k) => { p[k] *= 0.4 + urb; });
  return p;
}

/** Empresas de un distrito: total, por estado, por condición y por sector (siempre iguales para el mismo UBIGEO) */
function empresasDistrito(ubigeo) {
  const d = DISTRITOS[ubigeo];
  const rnd = aleatorio(`SUNAT-${ubigeo}`);
  const urb = d.urb / d.pob;
  const metro = ubigeo.startsWith('1501') || ubigeo.startsWith('07');
  const porMil = metro ? 50 + rnd() * 40 : 14 + 42 * urb + (rnd() - 0.5) * 12;
  const total = Math.max(3, Math.round((d.pob * porMil) / 1000));
  const pesos = pesosSector(d);
  const sumaPesos = Object.values(pesos).reduce((s, v) => s + v, 0);
  const sectores = {};
  let asignadas = 0;
  Object.keys(pesos).forEach((k) => {
    const n = Math.floor((total * pesos[k] * (0.85 + rnd() * 0.3)) / sumaPesos);
    sectores[k] = n;
    asignadas += n;
  });
  sectores.G += Math.max(0, total - asignadas);
  const tasaActivos = 0.74 + rnd() * 0.12;
  const tasaHabidos = 0.82 + rnd() * 0.1;
  const porSector = {};
  Object.entries(sectores).forEach(([k, n]) => { porSector[k] = { cantidad: n, activos: Math.round(n * tasaActivos) }; });
  const activos = Object.values(porSector).reduce((s, x) => s + x.activos, 0);
  const totalReal = Object.values(porSector).reduce((s, x) => s + x.cantidad, 0);
  return {
    total: totalReal,
    activos,
    habidos: Math.round(totalReal * tasaHabidos),
    bajas: Math.round(totalReal * (1 - tasaActivos) * 0.75),
    sectores: porSector,
  };
}

function resumenZona(ubigeo) {
  const lista = distritosDe(ubigeo);
  if (!lista.length) return null;
  const r = { ubigeo, total: 0, activos: 0, habidos: 0, bajas: 0, sectores: {} };
  lista.forEach((u) => {
    const e = empresasDistrito(u);
    r.total += e.total; r.activos += e.activos; r.habidos += e.habidos; r.bajas += e.bajas;
    Object.entries(e.sectores).forEach(([k, v]) => {
      r.sectores[k] = r.sectores[k] || { cantidad: 0, activos: 0 };
      r.sectores[k].cantidad += v.cantidad;
      r.sectores[k].activos += v.activos;
    });
  });
  return r;
}

/** Datos principales de un RUC (el UBIGEO y el sector salen del propio número) */
function datosRuc(ruc) {
  const diez = String(ruc).slice(0, 10);
  const ubigeo = UBIGEOS[hash(diez) % UBIGEOS.length];
  const d = DISTRITOS[ubigeo];
  const rnd = aleatorio(`RUC-${ruc}`);
  const seccion = elegirPonderado(rnd, pesosSector(d));
  const [ciiu, actividad] = elegir(rnd, CIIU[seccion]);
  const personaNatural = String(ruc).startsWith('10');
  let razonSocial;
  let tipo;
  if (personaNatural) {
    tipo = 'PERSONA NATURAL CON NEGOCIO';
    razonSocial = `${elegir(rnd, APELLIDOS)} ${elegir(rnd, APELLIDOS)} ${elegir(rnd, NOMBRES_PERSONA)}`;
  } else {
    tipo = elegir(rnd, Object.keys(SUFIJOS));
    razonSocial = `${elegir(rnd, PREFIJOS[seccion])} ${elegir(rnd, NOMBRES)} ${SUFIJOS[tipo]}`;
  }
  const anio = 1995 + Math.floor(rnd() * 30);
  const mes = String(1 + Math.floor(rnd() * 12)).padStart(2, '0');
  const dia = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
  return {
    ruc: String(ruc),
    razonSocial,
    tipo,
    nombreComercial: personaNatural || rnd() < 0.5 ? '-' : razonSocial.replace(/ (S\.A\.C\.|E\.I\.R\.L\.|S\.R\.L\.|S\.A\.)$/, ''),
    estado: elegirPonderado(rnd, ESTADOS),
    condicion: elegirPonderado(rnd, CONDICIONES),
    ciiu,
    actividad,
    seccion,
    ubigeo,
    departamento: d.dep,
    provincia: d.prov,
    distrito: d.dist,
    direccion: `${elegir(rnd, VIAS)} ${elegir(rnd, CALLES)} NRO. ${100 + Math.floor(rnd() * 1900)}`,
    fechaInscripcion: `${anio > 2025 ? 2025 : anio}-${mes}-${dia}`,
  };
}

/** Un RUC (20... o 10...) que "vive" en el distrito indicado, distinto para cada n */
function rucDelDistrito(ubigeo, n) {
  const objetivo = INDICE_UBIGEO.get(ubigeo);
  const rnd = aleatorio(`MUESTRA-${ubigeo}-${n}`);
  const prefijo = rnd() < 0.7 ? '20' : '10';
  let cuerpo = Math.floor(rnd() * 1e8);
  for (let i = 0; i < 200000; i++) {
    const diez = prefijo + String((cuerpo + i) % 1e8).padStart(8, '0');
    if (hash(diez) % UBIGEOS.length === objetivo) return diez + digitoRuc(diez);
  }
  return null;
}

/** Muestra de contribuyentes de la zona (repartida entre sus distritos según la población) */
function muestraZona(ubigeo, cantidad) {
  const lista = distritosDe(ubigeo);
  if (!lista.length || cantidad <= 0) return [];
  const rnd = aleatorio(`MUESTRA-${ubigeo}`);
  const pesos = {};
  lista.forEach((u) => { pesos[u] = DISTRITOS[u].pob; });
  const muestra = [];
  const vistos = new Set();
  for (let n = 0; muestra.length < cantidad && n < cantidad * 4; n++) {
    const u = lista.length === 1 ? lista[0] : elegirPonderado(rnd, pesos);
    const ruc = rucDelDistrito(u, n);
    if (ruc && !vistos.has(ruc)) {
      vistos.add(ruc);
      muestra.push(datosRuc(ruc));
    }
  }
  return muestra;
}

module.exports = {
  FUENTE_INEI: censo.fuente,
  ANIO_CENSO: censo.anio,
  existeUbigeo: (u) => distritosDe(u).length > 0,
  indicadoresZona,
  resumenZona,
  datosRuc,
  muestraZona,
  rucValido,
  digitoRuc,
  PARTICIPACION,
};
