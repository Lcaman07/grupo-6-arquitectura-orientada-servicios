//-- BITÁCORA DE INTEGRACIÓN: estado de INEI / SUNAT, simulación de fallas, caché y cada llamada registrada (log_integracion)

$(document).ready(function () {
  var usuarioSesion = fnMD.iniciarPagina();
  if (usuarioSesion == null) return;
  fnBitacora.iniciar();
  $("#btnBuscar").on("click", fnBitacora.buscar);
});

var fnBitacora = function () {
  var tabla = null;
  var num = fnMD.num, esc = fnMD.esc;
  var DESCRIPCION_MODO = {
    NORMAL: "Responde siempre",
    LENTO: "Tarda 2.5 s en responder",
    INTERMITENTE: "Falla una llamada sí y otra no (el reintento la recupera)",
    CAIDO: "Responde siempre HTTP 503"
  };

  function iniciar() {
    tabla = fnCommon.crearTabla("#tablaBitacora", [
      { data: "idLogIntegracion" }, { data: "fecha" }, { data: "servicio" }, { data: "operacion" }, { data: "parametro" }, { data: "estadoHttp" },
      { data: "intentos" }, { data: "tiempoMs" }, { data: "exito" }, { data: "mensaje" }, { data: "usuario" }
    ], [
      { targets: 1, className: "text-nowrap", render: function (d) { return fnCommon.formatoFecha(d, true); } },
      { targets: 2, className: "text-nowrap", render: function (d, t, row) { return "<b>" + esc(d) + "</b> <span class='md-chip'>" + esc(row.protocolo) + "</span>"; } },
      { targets: 3, render: function (d, t, row) { return "<span title='" + esc(row.url) + "'>" + esc(d) + "</span>"; } },
      { targets: [4, 9, 10], render: function (d) { return esc(d || "-"); } },
      { targets: 5, className: "text-center", render: function (d) { return d == null ? "-" : "<span class='badge badge-" + (d < 300 ? "success" : d < 500 ? "warning" : "danger") + "'>" + d + "</span>"; } },
      { targets: 6, className: "text-center", render: function (d) { return d > 1 ? "<b>" + d + "</b>" : d; } },
      { targets: 7, className: "md-num", render: function (d) { return fnMD.ms(d); } },
      { targets: 8, className: "text-center", render: function (d, t, row) {
        if (!d) return "<span class='badge badge-danger'><i class='fas fa-times mr-1'></i>Error</span>";
        return row.intentos > 1 ? "<span class='badge badge-warning' title='Se recuperó con reintento'><i class='fas fa-redo mr-1'></i>Recuperada</span>" : "<span class='badge badge-success'><i class='fas fa-check mr-1'></i>OK</span>";
      } }
    ], { searching: true, pageLength: 25 });
    estado();
    buscar();
  }

  function buscar() {
    var q = $.param({ servicio: $("#cboServicio").val(), exito: $("#cboExito").val(), desde: $("#txtDesde").val(), hasta: $("#txtHasta").val() });
    $(".preloader").fadeIn();
    fnMD.llamar("GET", "/api/v1/integracion/bitacora?" + q, null, function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      tabla.clear().rows.add(r.listados).draw();
      $("#tablaResumen tbody").html(r.resumen.length ? r.resumen.map(function (s) {
        return "<tr><td><b>" + esc(s.servicio) + "</b></td><td class='md-num'>" + num(s.llamadas) + "</td><td class='md-num'>" + fnMD.pct(s.porcentajeExito) +
          "</td><td class='md-num'>" + num(s.recuperadas) + "</td><td class='md-num'>" + fnMD.ms(s.tiempoPromedioMs) + "</td><td class='md-num'>" + fnMD.ms(s.tiempoMaximoMs) + "</td></tr>";
      }).join("") : "<tr><td colspan='6' class='text-center md-ayuda py-3'>Aún no hay llamadas registradas</td></tr>");
    });
  }

  function estado() {
    fnMD.llamar("GET", "/api/v1/integracion/estado", null, function (r) {
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      var puedeSimular = r.mocksHabilitados && fnCommon.tienePermiso("INTEGRACION_SIMULAR");
      var html = r.servicios.map(function (s) {
        var modo = r.simulacion ? r.simulacion[s.servicio] : null;
        var selector = puedeSimular ? "<div class='mt-2'><label class='md-ayuda mb-1' for='modo" + s.servicio + "'>Simular (pruebas de falla)</label><select class='form-control form-control-sm cbo-modo' id='modo" + s.servicio + "' data-servicio='" + s.servicio + "'>" +
          r.modos.map(function (m) { return "<option value='" + m + "'" + (m == modo ? " selected" : "") + " title='" + esc(DESCRIPCION_MODO[m]) + "'>" + m + " · " + esc(DESCRIPCION_MODO[m]) + "</option>"; }).join("") + "</select></div>"
          : (modo ? "<div class='md-ayuda mt-2'>Modo simulado: <b>" + modo + "</b></div>" : "");
        return "<div class='col-md-4 mb-3'><div class='card mb-0 h-100'><div class='card-body'>" +
          "<div class='md-servicio-cab'><b>" + (s.servicio == "INEI" ? "<i class='fas fa-users mr-1'></i> INEI" : "<i class='fas fa-building mr-1'></i> SUNAT") + "</b><span class='md-chip'>" + s.protocolo + (s.protocolo == "SOAP" ? " / XML" : " / JSON") + "</span></div>" +
          "<div>" + (s.disponible ? "<span class='badge badge-success'><i class='fas fa-check mr-1'></i>Disponible</span>" : "<span class='badge badge-danger'><i class='fas fa-times mr-1'></i>Sin respuesta</span>") +
          " <span class='md-chip ml-1'>" + fnMD.ms(s.tiempoMs) + "</span></div>" +
          "<div class='md-ayuda mt-2 text-break'>" + esc(s.url) + (s.protocolo == "SOAP" ? " · <a href='" + esc(s.url) + "?wsdl' target='_blank' rel='noopener'>WSDL</a>" : "") + "</div>" +
          selector + "</div></div></div>";
      }).join("");
      var c = r.configuracion;
      html += "<div class='col-md-4 mb-3'><div class='card mb-0 h-100'><div class='card-body'>" +
        "<div class='md-servicio-cab'><b><i class='fas fa-sliders-h mr-1'></i> Mediación (adaptadores)</b></div>" +
        "<table class='table table-sm md-tabla-dl mb-2'><tbody>" +
        "<tr><td>Intentos por llamada</td><td>" + c.reintentosMax + "</td></tr>" +
        "<tr><td>Espera progresiva</td><td>" + num(c.reintentoEsperaMs) + " ms × 2ⁿ</td></tr>" +
        "<tr><td>Timeout por intento</td><td>" + num(c.timeoutMs) + " ms</td></tr>" +
        "<tr><td>Vigencia de la caché</td><td>" + num(c.cacheVigenciaHoras) + " h</td></tr></tbody></table>" +
        (fnCommon.tienePermiso("CACHE_LIMPIAR") ? "<button type='button' class='btn btn-default btn-sm' id='btnLimpiarCache'><i class='fas fa-broom mr-1'></i> Limpiar caché</button>" : "") +
        " <span class='md-ayuda'>Se cambian en Maestros &gt; Multitabla &gt; Parámetros.</span></div></div></div>";
      $("#cajaEstado").html(html);

      $(".cbo-modo").on("change", function () {
        var servicio = $(this).data("servicio"), modo = this.value;
        fnMD.llamar("POST", "/api/v1/integracion/simulacion", { servicio: servicio, modo: modo }, function (x) {
          if (x.codigoRespuesta != "01") { fnCommon.mostrarError(x); estado(); return; }
          Swal.fire({ toast: true, position: "top-end", icon: modo == "NORMAL" ? "success" : "warning", title: x.mensajeRespuesta, showConfirmButton: false, timer: 2500 });
          estado();
        });
      });
      $("#btnLimpiarCache").on("click", function () {
        Swal.fire({ title: "¿Limpiar la caché?", text: "La próxima consulta de cada zona irá de nuevo al INEI y a la SUNAT. El historial de análisis no se borra.", icon: "question", showCancelButton: true, confirmButtonText: "Sí, limpiar", cancelButtonText: "Cancelar" })
          .then(function (res) {
            if (!res.value && !res.isConfirmed) return;
            fnMD.llamar("POST", "/api/v1/integracion/limpiarCache", {}, function (x) {
              if (x.codigoRespuesta != "01") { fnCommon.mostrarError(x); return; }
              Swal.fire(x.mensajeRespuesta, "", "success");
            });
          });
      });
    });
  }

  return { iniciar: iniciar, buscar: buscar };
}();
