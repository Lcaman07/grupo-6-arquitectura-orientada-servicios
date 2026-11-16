//-- PANEL PRINCIPAL DE MARKETDATA: resumen de los análisis de zona y de la integración (GET /analisis/dashboard)

$(document).ready(function () {
  $(".preloader").fadeIn();
  var usuarioSesion = fnMD.iniciarPagina();
  if (usuarioSesion == null) return;
  fnPanel.cargar();
});

var fnPanel = function () {
  var num = fnMD.num, esc = fnMD.esc;

  function cargar() {
    fnMD.llamar("GET", "/api/v1/analisis/dashboard", null, function (d) {
      $(".preloader").fadeOut();
      if (d.codigoRespuesta != "01") { fnCommon.mostrarError(d); return; }
      var k = d.kpi;
      $("#kpiAnalisis").text(num(k.analisis));
      $("#kpiZonas").text(num(k.zonas));
      $("#kpiIndice").text(k.indicePromedio != null ? num(k.indicePromedio, 1) : "-");
      $("#kpiCompletos").text(k.porcentajeCompletos != null ? num(k.porcentajeCompletos, 1) + " %" : "-");
      $("#kpiTiempo").text(k.tiempoPromedioMs != null ? num(k.tiempoPromedioMs) + " ms" : "-");
      $("#kpiCache").text(num(k.desdeCache));

      fnMD.barras("graficoRanking",
        d.ranking.map(function (a) { return fnMD.nombreCorto(a); }),
        d.ranking.map(function (a) { return a.indiceAtractivo; }),
        "Índice de atractivo",
        { decimales: 1, ayudas: d.ranking.map(function (a) { return a.nombreZona + " · " + (fnCommon.textoCatalogo(a.nivelAtractivo, fnCommon.MT_NIVEL_ATRACTIVO) || ""); }) });

      //-- últimos 14 días, también los días sin análisis
      var porDia = {};
      d.porDia.forEach(function (x) { porDia[String(x.dia).substring(0, 10)] = x.cantidad; });
      var etiquetas = [], valores = [];
      for (var i = 13; i >= 0; i--) {
        var f = new Date(Date.now() - i * 86400000);
        var clave = f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
        etiquetas.push(String(f.getDate()).padStart(2, "0") + "/" + String(f.getMonth() + 1).padStart(2, "0"));
        valores.push(porDia[clave] || 0);
      }
      fnMD.columnasTiempo("graficoDias", etiquetas, valores, "Análisis");

      $("#tablaIntegracion tbody").html(d.integracion.length ? d.integracion.map(function (s) {
        return "<tr><td><b>" + esc(s.servicio) + "</b> <span class='md-chip'>" + (s.servicio == "INEI" ? "REST" : "SOAP") + "</span></td><td class='md-num'>" + num(s.llamadas) +
          "</td><td class='md-num'>" + fnMD.pct(s.porcentajeExito) + "</td><td class='md-num'>" + fnMD.ms(s.tiempoPromedioMs) + "</td></tr>";
      }).join("") : "<tr><td colspan='4' class='text-center md-ayuda py-3'>Aún no hay llamadas</td></tr>");

      var niveles = {};
      d.porNivel.forEach(function (x) { niveles[x.nivel] = x.cantidad; });
      var totalNiveles = d.porNivel.reduce(function (s, x) { return s + x.cantidad; }, 0);
      $("#tablaNiveles tbody").html(["ALTO", "MEDIO", "BAJO"].map(function (n) {
        var c = niveles[n] || 0;
        var p = totalNiveles ? Math.round(c / totalNiveles * 100) : 0;
        return "<tr><td style='width: 110px;'>" + fnMD.badge(n, fnCommon.MT_NIVEL_ATRACTIVO) + "</td><td><div class='md-barra mb-0'><div class='progress'><div class='progress-bar' style='width: " + p + "%'></div></div></div></td>" +
          "<td class='md-num' style='width: 90px;'>" + num(c) + " <span class='md-ayuda'>(" + p + "%)</span></td></tr>";
      }).join(""));

      $("#tablaUltimos tbody").html(d.ultimos.length ? d.ultimos.map(function (a) {
        return "<tr><td><a href='../marketdata/analisis-zona.html?id=" + a.idAnalisisZona + "'>" + a.idAnalisisZona + "</a></td><td class='text-nowrap'>" + fnCommon.formatoFecha(a.fecha, true) +
          "</td><td>" + esc(a.nombreZona) + (a.seccionInteresNombre ? " <span class='md-ayuda'>· " + esc(a.seccionInteresNombre) + "</span>" : "") + "</td><td class='text-nowrap'>" +
          fnMD.badgeIndice(a.indiceAtractivo, a.nivelAtractivo) + "</td><td>" + fnMD.badge(a.estado, fnCommon.MT_ESTADO_ANALISIS) + "</td></tr>";
      }).join("") : "<tr><td colspan='5' class='text-center md-ayuda py-3'>Todavía no hay análisis. <a href='../marketdata/analisis-zona.html'>Haz el primero</a>.</td></tr>");
    });
  }

  return { cargar: cargar };
}();
