//-- HISTORIAL DE ANÁLISIS (GET /analisis/listados): todo lo guardado en MySQL por el Servicio Orquestador

$(document).ready(function () {
  var usuarioSesion = fnMD.iniciarPagina();
  if (usuarioSesion == null) return;
  fnCommon.llenarCatalogo("#cboAtractivo", fnCommon.MT_NIVEL_ATRACTIVO, "Todos");
  fnHistorial.iniciar();
  $("#btnBuscar").on("click", fnHistorial.buscar);
  $("#txtTexto").on("keyup", function (e) { if (e.keyCode == 13) fnHistorial.buscar(); });
  $("#btnComparar").on("click", function () { window.location.href = "comparar-zonas.html?ids=" + fnHistorial.seleccionados().join(","); });
});

var fnHistorial = function () {
  var tabla = null;
  var marcados = [];
  var num = fnMD.num, esc = fnMD.esc;
  var CORTO = { INEI: "INEI", SUNAT: "SUNAT", CACHE: "Caché", CACHE_VENCIDA: "Caché venc.", ERROR: "Error" };
  //-- origen abreviado con el color del catálogo 037 (el texto completo queda en el title)
  function corto(c) {
    if (!c) return "";
    var it = fnCommon.itemCatalogo(c, fnCommon.MT_ORIGEN_DATO);
    return "<span class='badge badge-" + esc(it && it.valorAux ? it.valorAux : "light") + "' title='" + esc(it ? it.valor : c) + "'>" + esc(CORTO[c] || c) + "</span>";
  }

  function iniciar() {
    tabla = fnCommon.crearTabla("#tablaHistorial", [
      { data: "idAnalisisZona" }, { data: "idAnalisisZona" }, { data: "fecha" }, { data: "nombreZona" }, { data: "seccionInteresNombre" },
      { data: "poblacionTotal" }, { data: "empresasActivas" }, { data: "empresasPorMil" }, { data: "indiceAtractivo" }, { data: "estado" },
      { data: "origenTerritorial" }, { data: "tiempoTotalMs" }, { data: "usuario" }, { data: "idAnalisisZona" }
    ], [
      { targets: 0, width: "24px", className: "text-center", render: function (d, t, row) {
        return row.estado == "COMPLETO" ? "<input type='checkbox' class='chk-comparar' value='" + d + "'" + (marcados.indexOf(String(d)) >= 0 ? " checked" : "") + " title='Comparar'>" : "";
      } },
      { targets: 2, className: "text-nowrap", render: function (d) { return fnCommon.formatoFecha(d, true); } },
      { targets: 3, render: function (d, t, row) { return "<b>" + esc(d) + "</b><div class='md-ayuda'>" + esc(row.nivel) + " · " + esc(row.ubigeo) + "</div>"; } },
      { targets: 4, render: function (d) { return d ? esc(d) : "<span class='md-ayuda'>todos</span>"; } },
      { targets: [5, 6], className: "md-num", render: function (d) { return num(d); } },
      { targets: 7, className: "md-num", render: function (d) { return d == null ? "-" : num(d, 1); } },
      { targets: 8, className: "text-nowrap", render: function (d, t, row) { return fnMD.badgeIndice(d, row.nivelAtractivo); } },
      { targets: 9, render: function (d) { return fnMD.badge(d, fnCommon.MT_ESTADO_ANALISIS); } },
      { targets: 10, className: "text-nowrap", render: function (d, t, row) { return corto(row.origenTerritorial) + " " + corto(row.origenEmpresarial); } },
      { targets: 11, className: "md-num", render: function (d) { return fnMD.ms(d); } },
      { targets: 12, render: function (d) { return esc(d); } },
      { targets: 13, className: "text-center", render: function (d) { return "<a class='btn btn-default btn-xs' href='analisis-zona.html?id=" + d + "' title='Ver'><i class='fas fa-eye'></i></a>"; } }
    ], { searching: false, info: true, pageLength: 25 });

    $("#tablaHistorial").on("change", ".chk-comparar", function () {
      var v = this.value;
      if (this.checked) {
        if (marcados.length >= 4) { this.checked = false; Swal.fire("Máximo 4 zonas para comparar", "", "info"); return; }
        marcados.push(v);
      } else {
        marcados = marcados.filter(function (x) { return x != v; });
      }
      $("#lblSeleccionados").text(marcados.length);
      $("#btnComparar").prop("disabled", marcados.length < 2);
    });
    buscar();
  }

  function buscar() {
    var q = $.param({ texto: $("#txtTexto").val(), nivel: $("#cboNivel").val(), nivelAtractivo: $("#cboAtractivo").val(), desde: $("#txtDesde").val(), hasta: $("#txtHasta").val() });
    $(".preloader").fadeIn();
    fnMD.llamar("GET", "/api/v1/analisis/listados?" + q, null, function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      tabla.clear().rows.add(r.listados).draw();
    });
  }

  return { iniciar: iniciar, buscar: buscar, seleccionados: function () { return marcados; } };
}();
