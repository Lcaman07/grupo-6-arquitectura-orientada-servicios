/**
 * Consultas sobre los análisis guardados (no llaman a INEI ni SUNAT):
 * historial, detalle, comparación de zonas y dashboard de la página principal.
 */
const analisisRepository = require('../repositories/analisisRepository');
const logIntegracionRepository = require('../repositories/logIntegracionRepository');
const territorialRepository = require('../repositories/territorialRepository');
const empresarialRepository = require('../repositories/empresarialRepository');
const referenciaService = require('./referenciaService');
const parametros = require('../utils/parametros');
const { MktdTXException } = require('../exceptions');
const { exito, itemBase } = require('../utils/respuesta');

const num = (v) => (v === null || v === undefined ? null : Number(v));

async function filaDto(a) {
  const mapa = await referenciaService.mapaSectores();
  const nombre = (c) => (c && mapa[c] ? mapa[c].nombre : c);
  return itemBase({
    idAnalisisZona: a.idAnalisisZona,
    fecha: a.fechaCrea,
    usuario: a.usuarioCrea,
    ubigeo: a.ubigeo,
    nivel: a.nivel,
    nombreZona: a.nombreZona,
    seccionInteres: a.seccionInteres,
    seccionInteresNombre: nombre(a.seccionInteres),
    poblacionTotal: num(a.poblacionTotal),
    densidadHabKm2: num(a.densidadHabKm2),
    tasaPobreza: num(a.tasaPobreza),
    totalEmpresas: num(a.totalEmpresas),
    empresasActivas: num(a.empresasActivas),
    empresasRubro: num(a.empresasRubro),
    empresasPorMil: num(a.empresasPorMil),
    habitantesPorEmpresa: num(a.habitantesPorEmpresa),
    sectorPredominante: a.sectorPredominante,
    sectorPredominanteNombre: nombre(a.sectorPredominante),
    indiceDemanda: num(a.indiceDemanda),
    indiceCompetencia: num(a.indiceCompetencia),
    indicePoderAdquisitivo: num(a.indicePoderAdquisitivo),
    indiceAtractivo: num(a.indiceAtractivo),
    nivelAtractivo: a.nivelAtractivo,
    estado: a.estado,
    origenTerritorial: a.origenTerritorial,
    origenEmpresarial: a.origenEmpresarial,
    tiempoTerritorialMs: a.tiempoTerritorialMs,
    tiempoEmpresarialMs: a.tiempoEmpresarialMs,
    tiempoTotalMs: a.tiempoTotalMs,
    observacion: a.observacion,
    sectores: a.sectores
      ? a.sectores
        .map((s) => ({
          seccionCiiu: s.seccionCiiu,
          sector: nombre(s.seccionCiiu),
          color: mapa[s.seccionCiiu] ? mapa[s.seccionCiiu].color : null,
          activas: num(s.cantidad),
          porcentaje: num(s.porcentaje),
          porMilHabitantes: num(s.porMilHabitantes),
        }))
        .sort((x, y) => y.activas - x.activas)
      : undefined,
  });
}

const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const fecha = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);

/** GET /api/v1/analisis/listados?texto=&nivel=&estado=&nivelAtractivo=&desde=&hasta= */
async function listar(q) {
  const lista = await analisisRepository.listar({
    texto: texto(q.texto), nivel: texto(q.nivel), estado: texto(q.estado), nivelAtractivo: texto(q.nivelAtractivo),
    desde: fecha(q.desde), hasta: fecha(q.hasta),
  });
  return exito({ listados: await Promise.all(lista.map(filaDto)) });
}

/** GET /api/v1/analisis/mostrar/:id — el análisis guardado + los datos que hoy tiene la caché de esa zona */
async function mostrar(id) {
  const a = await analisisRepository.porId(id);
  if (!a) throw new MktdTXException(`No existe el análisis N° ${id}`);
  const zona = await referenciaService.resolverUbigeo(a.ubigeo);
  const [terr, resumen] = await Promise.all([
    territorialRepository.porUbigeo(a.ubigeo),
    empresarialRepository.contribuyentesDeZona(a.ubigeo, parametros.entero('MUESTRA_EMPRESAS')),
  ]);
  return exito({
    analisis: await filaDto(a),
    zona,
    territorial: terr
      ? {
        poblacionTotal: num(terr.poblacionTotal), poblacionUrbana: num(terr.poblacionUrbana), poblacionRural: num(terr.poblacionRural),
        poblacionHombres: num(terr.poblacionHombres), poblacionMujeres: num(terr.poblacionMujeres), hogares: num(terr.hogares),
        superficieKm2: num(terr.superficieKm2), densidadHabKm2: num(terr.densidadHabKm2), edadPromedio: num(terr.edadPromedio),
        tasaPobreza: num(terr.tasaPobreza), pea: num(terr.pea), anioReferencia: terr.anioReferencia, fuente: terr.fuente,
        fechaConsulta: terr.fechaConsulta,
      }
      : null,
    muestra: await Promise.all(resumen.map(async (c) => ({
      ruc: c.ruc, razonSocial: c.razonSocial, estado: c.estado, condicion: c.condicion, ciiu: c.ciiu,
      actividadEconomica: c.actividadEconomica, seccionCiiu: c.seccionCiiu, sector: await referenciaService.nombreSector(c.seccionCiiu),
      ubigeo: c.ubigeo, direccion: c.direccion,
    }))),
  });
}

/** GET /api/v1/analisis/comparar?ids=1,2,3 (2 a 4 análisis) */
async function comparar(idsTexto) {
  const ids = [...new Set(String(idsTexto || '').split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0))];
  if (ids.length < 2 || ids.length > 4) throw new MktdTXException('Seleccione de 2 a 4 análisis para comparar');
  const filas = await analisisRepository.porIds(ids);
  const orden = new Map(ids.map((id, i) => [id, i]));
  filas.sort((x, y) => orden.get(x.idAnalisisZona) - orden.get(y.idAnalisisZona));
  const lista = await Promise.all(filas.map(filaDto));
  const conIndice = lista.filter((x) => x.indiceAtractivo !== null);
  const mejor = conIndice.length ? conIndice.reduce((m, x) => (x.indiceAtractivo > m.indiceAtractivo ? x : m)) : null;
  return exito({ listados: lista, recomendado: mejor ? mejor.idAnalisisZona : null });
}

/** GET /api/v1/analisis/dashboard */
async function dashboard() {
  const hace30 = new Date(Date.now() - 30 * 86400000);
  const [tot, ranking, porDia, porNivel, integracion, ultimos] = await Promise.all([
    analisisRepository.totales(),
    analisisRepository.ultimosPorUbigeo(8),
    analisisRepository.porDia(14),
    analisisRepository.porNivelAtractivo(),
    logIntegracionRepository.resumen(hace30),
    analisisRepository.listar({ limite: 8 }),
  ]);
  const analisis = Number(tot?.analisis || 0);
  return exito({
    kpi: {
      analisis,
      zonas: Number(tot?.zonas || 0),
      indicePromedio: tot?.indicePromedio !== null && tot?.indicePromedio !== undefined ? Math.round(Number(tot.indicePromedio) * 10) / 10 : null,
      tiempoPromedioMs: tot?.tiempoPromedio ? Math.round(Number(tot.tiempoPromedio)) : null,
      porcentajeCompletos: analisis ? Math.round((Number(tot.completos) / analisis) * 1000) / 10 : null,
      desdeCache: Number(tot?.desdeCache || 0),
    },
    ranking: await Promise.all(ranking.map(filaDto)),
    porDia: porDia.map((d) => ({ dia: d.dia, cantidad: Number(d.cantidad) })),
    porNivel: porNivel.map((d) => ({ nivel: d.nivelAtractivo, cantidad: Number(d.cantidad) })),
    integracion: integracion.map((s) => ({
      servicio: s.servicio,
      llamadas: Number(s.llamadas),
      exitosas: Number(s.exitosas),
      porcentajeExito: Number(s.llamadas) ? Math.round((Number(s.exitosas) / Number(s.llamadas)) * 1000) / 10 : null,
      tiempoPromedioMs: s.tiempoPromedio ? Math.round(Number(s.tiempoPromedio)) : null,
      tiempoMaximoMs: s.tiempoMaximo ? Number(s.tiempoMaximo) : null,
      recuperadas: Number(s.recuperadas || 0),
    })),
    ultimos: await Promise.all(ultimos.map(filaDto)),
  });
}

module.exports = { listar, mostrar, comparar, dashboard };
