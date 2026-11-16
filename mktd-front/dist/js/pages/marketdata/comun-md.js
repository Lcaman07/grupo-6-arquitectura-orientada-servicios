//-- Utilitarios compartidos de las pantallas de MarketData (análisis de zona, comparar, RUC, historial, bitácora)
//-- Requiere: jQuery, common.js. Chart.js es opcional (solo en las pantallas con gráficos).

var fnMD = function () {

  //-- Colores de las series (paleta validada para daltonismo sobre el fondo oscuro del sistema).
  //-- Se asignan en este orden fijo, nunca por posición en un ranking.
  var SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500"];
  var UNA_SERIE = "#3987e5";
  var TEXTO = "rgba(255, 255, 255, 0.72)";
  var GRILLA = "rgba(255, 255, 255, 0.08)";
  var graficos = {};

  /** Sesión, menú superior, pie y estilo de los gráficos. Devuelve la sesión (o null si no hay) */
  function iniciarPagina() {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.inicializarSesion(usuarioSesion);
    if (usuarioSesion == null) return null;
    $("#navBar").load("../../pages/seguridad/nav.html");
    $("#footerBar").load("../../pages/seguridad/footer.html");
    if (typeof Chart !== "undefined") {
      Chart.defaults.global.defaultFontColor = TEXTO;
      Chart.defaults.global.defaultFontFamily = "'Source Sans Pro', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
      Chart.defaults.global.tooltips.backgroundColor = "rgba(15, 20, 29, 0.95)";
      Chart.defaults.global.tooltips.borderColor = "rgba(255, 255, 255, 0.18)";
      Chart.defaults.global.tooltips.borderWidth = 1;
      Chart.defaults.global.tooltips.xPadding = 10;
      Chart.defaults.global.tooltips.yPadding = 8;
      Chart.defaults.global.maintainAspectRatio = false;
    }
    return usuarioSesion;
  }

  function sesion() { return JSON.parse(localStorage.getItem("usuarioSesion")); }

  /** GET/POST al back con renovación de token */
  function llamar(metodo, ruta, cuerpo, callback) {
    fnCommon.consultarAjaxJWT(sesion(), metodo, fnCommon.URL_BACK + ruta, cuerpo ? JSON.stringify(cuerpo) : null, callback);
  }

  var num = function (v, dec) { return fnCommon.formatoNumero(v, dec); };
  var pct = function (v) { return v === null || v === undefined ? "-" : fnCommon.formatoNumero(v, 1) + " %"; };
  var esc = function (t) { return fnCommon.escaparHtml(t); };

  /** Badge con texto y color del catálogo (034-038) */
  function badge(codigo, tabla) {
    if (codigo === null || codigo === undefined || codigo === "") return "<span class='text-muted'>-</span>";
    return fnCommon.badgeEstado(codigo, tabla);
  }

  /** Índice 0-100 con su nivel */
  function badgeIndice(indice, nivel) {
    if (indice === null || indice === undefined) return "<span class='text-muted'>-</span>";
    return "<b>" + num(indice, 1) + "</b> " + badge(nivel, fnCommon.MT_NIVEL_ATRACTIVO);
  }

  function ms(v) { return v === null || v === undefined ? "-" : num(v) + " ms"; }

  /** Combos encadenados de UBIGEO: departamento -> provincia -> distrito (value = código UBIGEO) */
  function cascadaUbigeo(selDep, selProv, selDist, alTerminar) {
    var cargar = function (selector, tabla, padre, texto, despues) {
      var $s = $(selector).prop("disabled", true).empty().append('<option value="">' + texto + '</option>');
      llamar("GET", "/api/v1/multitabla/listados/" + tabla + (padre ? "?codigoPadre=" + padre : ""), null, function (r) {
        if (r.codigoRespuesta == "01") {
          $.each(r.listados, function (i, it) { $s.append('<option value="' + esc(it.codigo) + '">' + esc(it.valor) + '</option>'); });
        }
        $s.prop("disabled", false);
        if (despues) despues();
      });
    };
    var limpiar = function (selector, texto) { $(selector).empty().append('<option value="">' + texto + '</option>').prop("disabled", true); };
    $(selDep).on("change", function () {
      limpiar(selDist, "(toda la provincia)");
      if (!this.value) { limpiar(selProv, "(todo el departamento)"); return; }
      cargar(selProv, fnCommon.MT_PROVINCIA, this.value, "(todo el departamento)");
    });
    $(selProv).on("change", function () {
      if (!this.value) { limpiar(selDist, "(toda la provincia)"); return; }
      cargar(selDist, fnCommon.MT_DISTRITO, this.value, "(toda la provincia)");
    });
    limpiar(selProv, "(todo el departamento)");
    limpiar(selDist, "(toda la provincia)");
    cargar(selDep, fnCommon.MT_DEPARTAMENTO, null, "-- Seleccione --", alTerminar);
  }

  /** Selecciona un UBIGEO en los combos (para volver a analizar una zona) */
  function seleccionarUbigeo(selDep, selProv, selDist, ubigeo) {
    if (!ubigeo) return;
    $(selDep).val(ubigeo.substring(0, 2)).trigger("change");
    if (ubigeo.length < 4) return;
    var esperar = function (sel, valor, siguiente) {
      var intentos = 0;
      var t = setInterval(function () {
        intentos++;
        if ($(sel).find('option[value="' + valor + '"]').length) {
          clearInterval(t);
          $(sel).val(valor).trigger("change");
          if (siguiente) siguiente();
        } else if (intentos > 40) clearInterval(t);
      }, 100);
    };
    esperar(selProv, ubigeo.substring(0, 4), function () { if (ubigeo.length == 6) esperar(selDist, ubigeo); });
  }

  /** Código UBIGEO elegido: el nivel más detallado que se seleccionó */
  function ubigeoElegido(selDep, selProv, selDist) {
    return $(selDist).val() || $(selProv).val() || $(selDep).val() || "";
  }

  /** Sectores CIIU (multitabla 033) en un <select> */
  function llenarSectores(selector, textoVacio) {
    var $s = $(selector).empty().append('<option value="">' + esc(textoVacio || "(todos los rubros)") + '</option>');
    $.each(fnCommon.catalogos()[fnCommon.MT_SECTOR_ECONOMICO] || [], function (i, it) {
      $s.append('<option value="' + esc(it.codigo) + '" title="' + esc(it.valorAux) + '">' + esc(it.codigo + " · " + it.valor) + '</option>');
    });
  }

  function ejes(horizontal, sufijo) {
    var valores = { gridLines: { color: GRILLA, zeroLineColor: GRILLA, drawBorder: false }, ticks: { beginAtZero: true, fontColor: TEXTO, callback: function (v) { return num(v) + (sufijo || ""); } } };
    var categorias = { gridLines: { display: false, drawBorder: false }, ticks: { fontColor: TEXTO } };
    return horizontal ? { xAxes: [valores], yAxes: [categorias] } : { xAxes: [categorias], yAxes: [valores] };
  }

  /** Barras de una sola serie (horizontales por defecto). ayudas = texto largo para el tooltip */
  function barras(id, etiquetas, valores, nombreSerie, opciones) {
    if (typeof Chart === "undefined" || !document.getElementById(id)) return;
    opciones = opciones || {};
    if (graficos[id]) graficos[id].destroy();
    graficos[id] = new Chart(document.getElementById(id), {
      type: opciones.vertical ? "bar" : "horizontalBar",
      data: { labels: etiquetas, datasets: [{ label: nombreSerie, data: valores, backgroundColor: opciones.color || UNA_SERIE, borderWidth: 0, barThickness: opciones.grosor || 14, maxBarThickness: 22 }] },
      options: {
        legend: { display: false },
        scales: ejes(!opciones.vertical, opciones.sufijo),
        tooltips: {
          callbacks: {
            title: function (it) { return opciones.ayudas ? opciones.ayudas[it[0].index] : etiquetas[it[0].index]; },
            label: function (it) { return " " + nombreSerie + ": " + num(it.value, opciones.decimales || 0) + (opciones.sufijo || ""); }
          }
        }
      }
    });
  }

  /** Barras agrupadas (varias series: una por zona en Comparar) */
  function barrasAgrupadas(id, etiquetas, series, opciones) {
    if (typeof Chart === "undefined" || !document.getElementById(id)) return;
    opciones = opciones || {};
    if (graficos[id]) graficos[id].destroy();
    graficos[id] = new Chart(document.getElementById(id), {
      type: "bar",
      data: {
        labels: etiquetas,
        datasets: series.map(function (s, i) {
          return { label: s.nombre, data: s.valores, backgroundColor: SERIES[i % SERIES.length], borderColor: "rgba(35, 44, 61, 1)", borderWidth: 2, maxBarThickness: 26 };
        })
      },
      options: {
        legend: { display: true, position: "bottom", labels: { fontColor: TEXTO, boxWidth: 12 } },
        scales: ejes(false, opciones.sufijo),
        tooltips: { mode: "index", intersect: false, callbacks: { label: function (it, d) { return " " + d.datasets[it.datasetIndex].label + ": " + num(it.value, opciones.decimales || 1) + (opciones.sufijo || ""); } } }
      }
    });
  }

  /** Columnas simples en el tiempo (análisis por día) */
  function columnasTiempo(id, etiquetas, valores, nombreSerie) {
    barras(id, etiquetas, valores, nombreSerie, { vertical: true, grosor: 18 });
  }

  /** "LIMA, LIMA" (provincia) -> "LIMA (prov.)"; distritos solo con su nombre */
  function nombreCorto(a) {
    var n = String(a.nombreZona || "").split(",")[0];
    return a.nivel == "PROVINCIA" ? n + " (prov.)" : a.nivel == "DEPARTAMENTO" ? n + " (dep.)" : n;
  }

  return {
    SERIES: SERIES,
    nombreCorto: nombreCorto,
    iniciarPagina: iniciarPagina,
    llamar: llamar,
    num: num,
    pct: pct,
    esc: esc,
    ms: ms,
    badge: badge,
    badgeIndice: badgeIndice,
    cascadaUbigeo: cascadaUbigeo,
    seleccionarUbigeo: seleccionarUbigeo,
    ubigeoElegido: ubigeoElegido,
    llenarSectores: llenarSectores,
    barras: barras,
    barrasAgrupadas: barrasAgrupadas,
    columnasTiempo: columnasTiempo
  };
}();
