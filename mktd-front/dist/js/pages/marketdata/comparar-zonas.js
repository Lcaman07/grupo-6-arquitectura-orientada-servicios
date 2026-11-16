//-- COMPARAR ZONAS: usa solo análisis guardados en MySQL (GET /analisis/comparar?ids=), sin volver a llamar a INEI ni SUNAT

$(document).ready(function () {
  var usuarioSesion = fnMD.iniciarPagina();
  if (usuarioSesion == null) return;

  $("#cboAnalisis").select2({ theme: "bootstrap4", placeholder: "Busca por zona...", maximumSelectionLength: 4, language: { maximumSelected: function () { return "Máximo 4 zonas"; }, noResults: function () { return "Sin resultados"; } } });
  var ids = String(fnCommon.getUrlParameter("ids") || "").split(",").filter(function (x) { return x; });

  fnMD.llamar("GET", "/api/v1/analisis/listados?estado=COMPLETO", null, function (r) {
    if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
    var vistos = {};
    $.each(r.listados, function (i, a) {
      //-- se ofrece el último análisis de cada zona + rubro (los más recientes primero)
      var clave = a.ubigeo + "|" + (a.seccionInteres || "");
      if (vistos[clave] && ids.indexOf(String(a.idAnalisisZona)) < 0) return;
      vistos[clave] = true;
      var texto = a.nombreZona + (a.seccionInteresNombre ? " · rubro " + a.seccionInteresNombre : "") + " · índice " + fnMD.num(a.indiceAtractivo, 1) + " · N° " + a.idAnalisisZona + " (" + fnCommon.formatoFecha(a.fecha) + ")";
      $("#cboAnalisis").append(new Option(texto, a.idAnalisisZona, false, false));
    });
    if (ids.length) $("#cboAnalisis").val(ids).trigger("change");
    if (ids.length >= 2) fnComparar.comparar();
  });

  $("#btnComparar").on("click", function () { fnComparar.comparar(); });
});

var fnComparar = function () {
  var num = fnMD.num, esc = fnMD.esc;

  //-- filas de la tabla: [titulo, campo, decimales, sufijo, mejor: "max" | "min" | null]
  var FILAS = [
    ["Índice de atractivo", "indiceAtractivo", 1, "", "max"],
    ["Demanda", "indiceDemanda", 1, "", "max"],
    ["Competencia (más alto = menos saturado)", "indiceCompetencia", 1, "", "max"],
    ["Poder adquisitivo", "indicePoderAdquisitivo", 1, "", "max"],
    ["Población", "poblacionTotal", 0, "", "max"],
    ["Densidad (hab/km²)", "densidadHabKm2", 0, "", null],
    ["Pobreza", "tasaPobreza", 1, " %", "min"],
    ["Empresas activas", "empresasActivas", 0, "", null],
    ["Empresas por mil habitantes", "empresasPorMil", 1, "", "min"],
    ["Habitantes por empresa", "habitantesPorEmpresa", 1, "", "max"],
    ["Competidores del rubro", "empresasRubro", 0, "", "min"]
  ];

  function comparar() {
    var ids = $("#cboAnalisis").val() || [];
    if (ids.length < 2) { Swal.fire("Elige al menos 2 análisis", "", "info"); return; }
    $(".preloader").fadeIn();
    fnMD.llamar("GET", "/api/v1/analisis/comparar?ids=" + ids.join(","), null, function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      if (window.history && history.replaceState) history.replaceState(null, "", "?ids=" + ids.join(","));
      pintar(r.listados, r.recomendado);
    });
  }

  function nombreCorto(a) { return fnMD.nombreCorto(a) + (a.seccionInteresNombre ? " · " + a.seccionInteresNombre : ""); }

  function pintar(lista, recomendado) {
    $("#sinResultado").hide();
    $("#resultado").show();
    var mejor = lista.filter(function (a) { return a.idAnalisisZona == recomendado; })[0];
    $("#cajaRecomendacion").toggle(!!mejor).html(mejor ? "<i class='fas fa-trophy mr-1'></i> Con los datos disponibles, la zona más atractiva es <b>" + esc(mejor.nombreZona) +
      "</b> (índice " + num(mejor.indiceAtractivo, 1) + "). Revisa también la competencia de tu rubro antes de decidir." : "");

    var cab = "<tr><th>Indicador</th>" + lista.map(function (a, i) {
      return "<th class='md-num'><span style='display:inline-block;width:10px;height:10px;border-radius:2px;background:" + fnMD.SERIES[i] + ";margin-right:6px;'></span>" +
        "<a href='analisis-zona.html?id=" + a.idAnalisisZona + "'>" + esc(nombreCorto(a)) + "</a><div class='md-ayuda font-weight-normal'>" + esc(a.nivel) + " · " + esc(a.ubigeo) + "</div></th>";
    }).join("") + "</tr>";
    var cuerpo = "<tr><td>Nivel de atractivo</td>" + lista.map(function (a) { return "<td class='md-num'>" + fnMD.badge(a.nivelAtractivo, fnCommon.MT_NIVEL_ATRACTIVO) + "</td>"; }).join("") + "</tr>";
    cuerpo += "<tr><td>Sector predominante</td>" + lista.map(function (a) { return "<td class='md-num'>" + esc(a.sectorPredominanteNombre || "-") + "</td>"; }).join("") + "</tr>";
    FILAS.forEach(function (f) {
      var valores = lista.map(function (a) { return a[f[1]]; });
      if (valores.every(function (v) { return v === null || v === undefined; })) return;
      var validos = valores.filter(function (v) { return v !== null && v !== undefined; });
      var objetivo = f[4] == "max" ? Math.max.apply(null, validos) : f[4] == "min" ? Math.min.apply(null, validos) : null;
      cuerpo += "<tr><td>" + f[0] + "</td>" + valores.map(function (v) {
        var resaltar = objetivo !== null && v === objetivo && validos.length > 1;
        return "<td class='md-num" + (resaltar ? " md-mejor" : "") + "'>" + (v === null || v === undefined ? "-" : num(v, f[2]) + f[3]) + "</td>";
      }).join("") + "</tr>";
    });
    cuerpo += "<tr><td>Fecha del análisis</td>" + lista.map(function (a) { return "<td class='md-num md-ayuda'>" + fnCommon.formatoFecha(a.fecha, true) + "</td>"; }).join("") + "</tr>";
    $("#tablaComparar thead").html(cab);
    $("#tablaComparar tbody").html(cuerpo);

    fnMD.barrasAgrupadas("graficoIndices", ["Atractivo", "Demanda", "Competencia", "Poder adquisitivo"], lista.map(function (a) {
      return { nombre: nombreCorto(a), valores: [a.indiceAtractivo, a.indiceDemanda, a.indiceCompetencia, a.indicePoderAdquisitivo] };
    }));

    //-- sectores con más empresas sumando todas las zonas (máx. 6) -> empresas por mil habitantes en cada zona
    var total = {};
    lista.forEach(function (a) { (a.sectores || []).forEach(function (s) { total[s.seccionCiiu] = (total[s.seccionCiiu] || 0) + (s.porMilHabitantes || 0); }); });
    var top = Object.keys(total).sort(function (x, y) { return total[y] - total[x]; }).slice(0, 6);
    var nombres = top.map(function (c) { return fnCommon.textoCatalogo(c, fnCommon.MT_SECTOR_ECONOMICO); });
    fnMD.barrasAgrupadas("graficoSectores", nombres, lista.map(function (a) {
      var mapa = {};
      (a.sectores || []).forEach(function (s) { mapa[s.seccionCiiu] = s.porMilHabitantes; });
      return { nombre: nombreCorto(a), valores: top.map(function (c) { return mapa[c] || 0; }) };
    }), { decimales: 2 });
  }

  return { comparar: comparar };
}();
