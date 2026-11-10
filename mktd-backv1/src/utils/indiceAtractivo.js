/**
 * Índice de atractivo de una zona (0 a 100) — lógica de negocio del Análisis de zona
 * ----------------------------------------------------------------------------
 *  Demanda            (INEI)  : tamaño del mercado. 70 % población (escala log: 1 mil = 0, 1 millón = 100)
 *                               + 30 % densidad (escala log: 1 hab/km2 = 0, 10 mil hab/km2 = 100)
 *  Competencia        (SUNAT) : qué tan libre está el mercado. Empresas activas por mil habitantes comparadas
 *                               con la referencia (REFERENCIA_EMPRESAS_MIL). Si se eligió un rubro, se compara
 *                               solo ese rubro contra su participación normal en el padrón.
 *                               ratio <= 0.5 -> 100 (poca competencia) · ratio >= 2 -> 0 (saturado)
 *  Poder adquisitivo  (INEI)  : 100 - % de pobreza
 *  Índice = promedio ponderado (PESO_DEMANDA, PESO_COMPETENCIA, PESO_PODER_ADQUISITIVO)
 *  Nivel  : ALTO >= 65 · MEDIO >= 50 · BAJO < 50
 * Es una función pura (sin base de datos) para poder probarla con npm test.
 */

//-- participación referencial (%) de cada sección CIIU en el padrón de contribuyentes
const PARTICIPACION_REFERENCIAL = {
  A: 4.0, B: 0.6, C: 7.5, D: 0.2, E: 0.3, F: 5.0, G: 40.0, H: 8.5, I: 9.5, J: 1.8, K: 1.0,
  L: 1.6, M: 6.5, N: 5.0, O: 0.3, P: 2.2, Q: 2.0, R: 1.2, S: 5.5, T: 0.05, U: 0.02,
};

const limitar = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const r2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 100) / 100);

function nivelDe(indice) {
  if (indice === null || indice === undefined) return null;
  if (indice >= 65) return 'ALTO';
  if (indice >= 50) return 'MEDIO';
  return 'BAJO';
}

/**
 * @param {object} t   datos territoriales { poblacionTotal, densidadHabKm2, tasaPobreza } (o null si INEI falló)
 * @param {object} e   datos empresariales { empresasActivas, sectores: [{seccionCiiu, activas}] } (o null si SUNAT falló)
 * @param {object} cfg { seccionInteres, pesoDemanda, pesoCompetencia, pesoPoder, referenciaPorMil }
 */
function calcular(t, e, cfg = {}) {
  const pesoD = Number(cfg.pesoDemanda ?? 40);
  const pesoC = Number(cfg.pesoCompetencia ?? 35);
  const pesoP = Number(cfg.pesoPoder ?? 25);
  const referencia = Number(cfg.referenciaPorMil ?? 45);
  const rubro = cfg.seccionInteres || null;

  const pob = t && t.poblacionTotal ? Number(t.poblacionTotal) : null;
  const out = {
    empresasPorMil: null,
    habitantesPorEmpresa: null,
    empresasRubro: null,
    empresasRubroPorMil: null,
    ratioCompetencia: null,
    indiceDemanda: null,
    indiceCompetencia: null,
    indicePoderAdquisitivo: null,
    indiceAtractivo: null,
    nivelAtractivo: null,
    sectorPredominante: null,
  };

  if (e && Array.isArray(e.sectores) && e.sectores.length) {
    const mayor = e.sectores.reduce((m, s) => (Number(s.activas) > Number(m.activas) ? s : m), e.sectores[0]);
    out.sectorPredominante = mayor.seccionCiiu;
    if (rubro) {
      const s = e.sectores.find((x) => x.seccionCiiu === rubro);
      out.empresasRubro = s ? Number(s.activas) : 0;
    }
  }

  if (t) {
    const densidad = Number(t.densidadHabKm2) || 0;
    const dPob = pob ? limitar((Math.log10(pob) - 3) / 3) : 0;
    const dDen = densidad > 0 ? limitar(Math.log10(densidad) / 4) : 0;
    out.indiceDemanda = r2(100 * (0.7 * dPob + 0.3 * dDen));
    if (t.tasaPobreza !== null && t.tasaPobreza !== undefined) out.indicePoderAdquisitivo = r2(limitar(100 - Number(t.tasaPobreza), 0, 100));
  }

  if (e && pob) {
    const activas = Number(e.empresasActivas) || 0;
    out.empresasPorMil = r2((activas / pob) * 1000);
    out.habitantesPorEmpresa = activas > 0 ? r2(pob / activas) : null;
    let ratio;
    if (rubro) {
      out.empresasRubroPorMil = r2((out.empresasRubro / pob) * 1000);
      const refRubro = (referencia * (PARTICIPACION_REFERENCIAL[rubro] || 1)) / 100;
      ratio = refRubro > 0 ? out.empresasRubroPorMil / refRubro : 0;
    } else {
      ratio = referencia > 0 ? out.empresasPorMil / referencia : 0;
    }
    out.ratioCompetencia = r2(ratio);
    out.indiceCompetencia = r2(100 * limitar(1 - (ratio - 0.5) / 1.5));
  }

  //-- el índice solo se calcula con las dos fuentes: con una sola sería engañoso
  if (out.indiceDemanda !== null && out.indiceCompetencia !== null && out.indicePoderAdquisitivo !== null) {
    const suma = pesoD + pesoC + pesoP || 1;
    out.indiceAtractivo = r2((pesoD * out.indiceDemanda + pesoC * out.indiceCompetencia + pesoP * out.indicePoderAdquisitivo) / suma);
    out.nivelAtractivo = nivelDe(out.indiceAtractivo);
  }
  return out;
}

module.exports = { calcular, nivelDe, PARTICIPACION_REFERENCIAL };
