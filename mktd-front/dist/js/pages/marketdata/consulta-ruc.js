//-- CONSULTA RUC: Servicio Empresarial (GET /empresarial/ruc/:ruc). SUNAT responde en SOAP/XML; el back lo devuelve en JSON.

$(document).ready(function () {
  var usuarioSesion = fnMD.iniciarPagina();
  if (usuarioSesion == null) return;
  if (fnCommon.tienePermiso("ANALISIS_FORZAR")) $("#grupoForzar").show();

  $("#txtRuc").on("input", function () { this.value = this.value.replace(/\D/g, "").substring(0, 11); });
  $("#formRuc").on("submit", function () { fnRuc.consultar(); });

  var ruc = fnCommon.getUrlParameter("ruc");
  if (ruc) { $("#txtRuc").val(ruc); fnRuc.consultar(); }
});

var fnRuc = function () {
  var esc = fnMD.esc;

  /** Misma validación que el back: 11 dígitos, prefijo y dígito verificador (módulo 11) */
  function motivoInvalido(ruc) {
    if (!/^\d{11}$/.test(ruc)) return "El RUC debe tener 11 dígitos";
    if (!/^(10|15|16|17|20)/.test(ruc)) return "El RUC debe empezar con 10, 15, 16, 17 o 20";
    var f = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2], s = 0;
    for (var i = 0; i < 10; i++) s += f[i] * Number(ruc[i]);
    var d = 11 - (s % 11);
    d = d == 10 ? 0 : d == 11 ? 1 : d;
    return d == Number(ruc[10]) ? null : "El dígito verificador no corresponde (revisa el número)";
  }

  function fila(etiqueta, valor) { return "<tr><td>" + etiqueta + "</td><td>" + valor + "</td></tr>"; }

  function consultar() {
    var ruc = $("#txtRuc").val().trim();
    var motivo = motivoInvalido(ruc);
    $("#txtRuc").toggleClass("is-invalid", !!motivo);
    if (motivo) { $("#ayudaRuc").text(motivo).addClass("text-danger"); return; }
    $("#ayudaRuc").text("11 dígitos. Se valida el dígito verificador antes de consultar.").removeClass("text-danger");
    $(".preloader").fadeIn();
    fnMD.llamar("GET", "/api/v1/empresarial/ruc/" + ruc + ($("#chkForzar").is(":checked") ? "?forzar=true" : ""), null, function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      var c = r.contribuyente;
      if (window.history && history.replaceState) history.replaceState(null, "", "?ruc=" + ruc);
      $("#sinResultado").hide();
      $("#resultado").show();
      $("#lblRazonSocial").text(c.razonSocial);
      $("#lblOrigen").html(fnMD.badge(r.origen, fnCommon.MT_ORIGEN_DATO) + " <span class='md-chip ml-1'>" + fnMD.num(r.tiempoMs) + " ms</span>");
      $("#tablaRuc tbody").html(
        fila("RUC", "<b>" + esc(c.ruc) + "</b>") +
        fila("Tipo de contribuyente", esc(c.tipoContribuyente || "-")) +
        fila("Nombre comercial", esc(c.nombreComercial || "-")) +
        fila("Estado", fnMD.badge(c.estado, fnCommon.MT_ESTADO_CONTRIBUYENTE)) +
        fila("Condición del domicilio", fnMD.badge(c.condicion, fnCommon.MT_CONDICION_DOMICILIO)) +
        fila("Actividad económica (CIIU)", "<span class='md-ayuda'>" + esc(c.ciiu || "") + "</span> " + esc(c.actividadEconomica || "-")) +
        fila("Sector", esc(c.sector || "-")) +
        fila("Domicilio fiscal", esc(c.direccion || "-")) +
        fila("UBIGEO", c.ubigeo ? "<a href='analisis-zona.html?ubigeo=" + esc(c.ubigeo) + "' title='Analizar esta zona'>" + esc(c.ubigeo) + " <i class='fas fa-search-location'></i></a>" : "-") +
        fila("Fecha de inscripción", c.fechaInscripcion ? fnCommon.formatoFecha(c.fechaInscripcion) : "-"));
      $("#lblPie").html((r.aviso ? "<span class='text-warning'><i class='fas fa-exclamation-triangle mr-1'></i>" + esc(r.aviso) + "</span><br>" : "") +
        "Consultado el " + fnCommon.formatoFecha(c.fechaConsulta, true) + " · vigente en caché hasta el " + fnCommon.formatoFecha(c.vigenteHasta, true));
    });
  }

  return { consultar: consultar };
}();
