//-- MAESTROS > MULTITABLA: catálogos y parámetros del sistema (nada en duro).
//--  * A la izquierda las tablas; a la derecha sus valores.
//--  * Qué se puede hacer en cada tabla lo decide su estado_tabla (lo valida también el back):
//--      1 solo lectura · 2 agregar y modificar el valor · 3 agregar y modificar valor y valor aux
//--      4 solo modificar el valor · 5 solo modificar el valor aux · 6 catálogo del sistema (texto, color y explicación)
//--  * Editar requiere el permiso MULTITABLA_EDITAR (administrador).

var API = fnCommon.URL_BACK + "/api/v1";
var COLORES = ["success", "warning", "danger", "info", "primary", "secondary", "dark", "light"];

$(document).ready(function () {
  $(".preloader").fadeIn();
  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");

  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  if (usuarioSesion == null) return;

  fnMultitabla.fnInicializacion();
});

var fnMultitabla = function () {

  var puedeEditar = false;
  var tablas = [];
  var tablaActual = null;
  var valores = [];

  function fnInicializacion() {
    puedeEditar = fnCommon.tienePermiso("MULTITABLA_EDITAR");

    $.each(COLORES, function (i, c) { $("#valorAuxColor").append('<option value="' + c + '">' + c + '</option>'); });
    $("#valorAuxColor").on("change", fnMuestraColor);
    $("#valor").on("input", fnMuestraColor);
    $("#filtroPadre").select2({ theme: "bootstrap4", width: "100%" });
    $("#codigoPadre").select2({ theme: "bootstrap4", width: "100%", dropdownParent: $("#modalValor") });
    $("#filtroPadre").on("change", function () { fnListarValores(); });
    $("#btnNuevoValor").click(function () { fnAbrir(null); });
    $("#btnGuardarValor").click(fnGuardar);

    fnCommon.crearTabla("#tablaTablas", [
      { data: "codigoTabla" }, { data: "nombreTabla" }, { data: "total" }
    ], [
      { targets: 0, width: "18%", render: function (data) { return "<b>" + data + "</b>"; } },
      { targets: 1, render: function (data, type, row) {
          return fnCommon.escaparHtml(data) + "<br><small class='text-muted'>" + fnCommon.escaparHtml(row.regla.nombre) + "</small>";
      } },
      { targets: 2, className: "text-center", width: "18%" }
    ], { paging: false, info: false, ordering: false, scrollY: "60vh", scrollCollapse: true });

    fnCommon.crearTabla("#tablaValores", [
      { data: "codigo" }, { data: "valor" }, { data: "valorAux" }, { data: "valorAux2" }, { data: "orden" }, { data: "flkactivo" }, { data: "idMultitabla" }
    ], [
      { targets: 0, render: function (data) { return "<b>" + fnCommon.escaparHtml(data) + "</b>"; } },
      { targets: 1, render: function (data, type, row) {
          //-- en catálogos del sistema se muestra cómo se verá el badge
          if (tablaActual && tablaActual.estadoTabla == "6" && row.valorAux) {
            return '<span class="badge badge-' + fnCommon.escaparHtml(row.valorAux) + '">' + fnCommon.escaparHtml(data) + '</span>';
          }
          return fnCommon.escaparHtml(data);
      } },
      { targets: [2, 3], render: function (data) { return fnCommon.escaparHtml(data || ""); } },
      { targets: 4, className: "text-center" },
      { targets: 5, className: "text-center", render: function (data) {
          return data ? "<span class='badge badge-success'>ACTIVO</span>" : "<span class='badge badge-secondary'>INACTIVO</span>";
      } },
      { targets: 6, className: "text-center text-nowrap", width: "10%", render: function (data, type, row) {
          if (!puedeEditar || !tablaActual) return "";
          var r = tablaActual.regla, html = "";
          if (r.valor || r.aux) html += "<button type='button' class='btn btn-default btn-sm' title='Editar' onclick='fnMultitabla.fnAbrir(" + data + ")'><i class='fas fa-edit'></i></button>";
          if (r.estado) html += " <button type='button' class='btn btn-sm " + (row.flkactivo ? "btn-default" : "btn-success") + "' title='" + (row.flkactivo ? "Desactivar" : "Activar") + "'" +
                                " onclick='fnMultitabla.fnCambiarEstado(" + data + ", " + (!row.flkactivo) + ")'><i class='fas " + (row.flkactivo ? "fa-ban" : "fa-check") + "'></i></button>";
          return html;
      } }
    ], { pageLength: 25 });

    $("#tablaTablas tbody").on("click", "tr", function () {
      var fila = $("#tablaTablas").DataTable().row(this).data();
      if (!fila) return;
      $("#tablaTablas tbody tr").removeClass("seleccionada");
      $(this).addClass("seleccionada");
      fnSeleccionarTabla(fila.codigoTabla);
    });

    fnListarTablas();
  }

  function fnListarTablas(alTerminar) {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/multitabla/tablas", null, function (respuesta) {
      if (respuesta.codigoRespuesta != "01") { fnCommon.mostrarError(respuesta); return; }
      tablas = respuesta.listados || [];
      $("#tablaTablas").DataTable().clear().rows.add(tablas).draw();
      $(".preloader").fadeOut();
      if (alTerminar) alTerminar();
    });
  }

  function fnBuscarTabla(codigo) { return tablas.filter(function (t) { return t.codigoTabla == codigo; })[0]; }

  function fnSeleccionarTabla(codigoTabla) {
    tablaActual = fnBuscarTabla(codigoTabla);
    if (!tablaActual) return;
    $("#tituloValores").text(tablaActual.codigoTabla + " - " + tablaActual.nombreTabla);
    var ayuda = tablaActual.regla.nombre + ".";
    if (tablaActual.estadoTabla == "6") ayuda += " Valor = texto que ve el usuario · Valor aux = color · Valor aux 2 = explicación (aparece al pasar el mouse).";
    if (tablaActual.codigoTabla == fnCommon.MT_PARAMETRO_GENERAL) ayuda += " Código = parámetro · Valor = su valor · Valor aux 2 = para qué sirve. Los cambios se aplican al momento.";
    $("#ayudaTabla").text(ayuda);
    $("#btnNuevoValor").toggle(puedeEditar && tablaActual.regla.agregar);

    //-- tablas jerárquicas (provincias, distritos, modelos): se filtra por el padre para no traer miles de filas
    if (tablaActual.tablaPadre) {
      var padre = fnBuscarTabla(tablaActual.tablaPadre);
      $("#lblPadre, #lblPadreModal").text(padre ? padre.nombreTabla : "Pertenece a");
      $("#filaPadre").show();
      fnLlenarPadres("#filtroPadre", tablaActual.tablaPadre, function () { fnListarValores(); });
    } else {
      $("#filaPadre").hide();
      $("#filtroPadre").empty();
      fnListarValores();
    }
  }

  /** Para la tabla de distritos el padre es una provincia: se cargan todas las provincias (196) */
  function fnLlenarPadres(selector, tablaPadre, alTerminar) {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/multitabla/admin/" + tablaPadre, null, function (respuesta) {
      var $s = $(selector).empty();
      $.each(respuesta.listados || [], function (i, it) {
        $s.append('<option value="' + fnCommon.escaparHtml(it.codigo) + '">' + fnCommon.escaparHtml(it.valor) + ' (' + fnCommon.escaparHtml(it.codigo) + ')</option>');
      });
      $s.trigger("change.select2");
      if (alTerminar) alTerminar();
    });
  }

  function fnListarValores() {
    if (!tablaActual) return;
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    var padre = tablaActual.tablaPadre ? $("#filtroPadre").val() : "";
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/multitabla/admin/" + tablaActual.codigoTabla + (padre ? "?codigoPadre=" + encodeURIComponent(padre) : ""), null, function (respuesta) {
      $(".preloader").fadeOut();
      if (respuesta.codigoRespuesta != "01") { fnCommon.mostrarError(respuesta); return; }
      valores = respuesta.listados || [];
      $("#tablaValores").DataTable().clear().rows.add(valores).draw();
    });
  }

  function fnMuestraColor() {
    if (!tablaActual || tablaActual.estadoTabla != "6") { $("#muestraColor").empty(); return; }
    $("#muestraColor").html('Así se verá: <span class="badge badge-' + fnCommon.escaparHtml($("#valorAuxColor").val()) + '">' + fnCommon.escaparHtml($("#valor").val()) + '</span>');
  }

  function fnAbrir(id) {
    if (!tablaActual) return;
    var r = tablaActual.regla;
    var v = id ? valores.filter(function (x) { return x.idMultitabla == id; })[0] : null;
    var esColor = tablaActual.estadoTabla == "6";
    $("#tituloModal").text((v ? "Editar " + v.codigo : "Nuevo valor") + " · " + tablaActual.nombreTabla);
    $("#idMultitabla").val(v ? v.idMultitabla : "");
    $("#codigo").val(v ? v.codigo : "").prop("readonly", !!v);
    $("#valor").val(v ? v.valor : "").prop("readonly", !!v && !r.valor);
    $("#orden").val(v ? v.orden : "").prop("readonly", !!v && !r.valor);
    $("#valorAux").val(v ? (v.valorAux || "") : "").prop("readonly", !r.aux).toggle(!esColor);
    $("#valorAuxColor").val(v && v.valorAux ? v.valorAux : "success").prop("disabled", !r.aux).toggle(esColor);
    $("#valorAux2").val(v ? (v.valorAux2 || "") : "").prop("readonly", !r.aux);
    $("#lblValorAux").text(esColor ? "Color" : "Valor aux");
    $("#lblValorAux2").text(esColor || tablaActual.codigoTabla == fnCommon.MT_PARAMETRO_GENERAL ? "Explicación" : "Valor aux 2");
    if (tablaActual.tablaPadre && !v) {
      $(".grupo-padre").show();
      fnLlenarPadres("#codigoPadre", tablaActual.tablaPadre, function () { $("#codigoPadre").val($("#filtroPadre").val()).trigger("change.select2"); });
    } else {
      $(".grupo-padre").hide();
    }
    $("#ayudaModal").text(v && tablaActual.estadoTabla == "6" ? "El código " + v.codigo + " lo usa el sistema y no se cambia." : "");
    fnMuestraColor();
    $("#modalValor").modal("show");
  }

  function fnGuardar() {
    var esColor = tablaActual.estadoTabla == "6";
    var request = {
      "idMultitabla": $("#idMultitabla").val() ? parseInt($("#idMultitabla").val(), 10) : null,
      "codigoTabla": tablaActual.codigoTabla,
      "codigo": $.trim($("#codigo").val()).toUpperCase(),
      "valor": $.trim($("#valor").val()),
      "valorAux": esColor ? $("#valorAuxColor").val() : $.trim($("#valorAux").val()),
      "valorAux2": $.trim($("#valorAux2").val()),
      "orden": $("#orden").val(),
      "codigoPadre": tablaActual.tablaPadre ? $("#codigoPadre").val() : null
    };
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(usuarioSesion, "POST", API + "/multitabla/guardar", JSON.stringify(request), function (respuesta) {
      $(".preloader").fadeOut();
      if (respuesta.codigoRespuesta == "01") {
        fnCommon.limpiarCatalogos();   //-- las pantallas vuelven a leer textos y colores
        $("#modalValor").modal("hide");
        Swal.fire({ toast: true, position: "top-end", icon: "success", title: respuesta.mensajeRespuesta, showConfirmButton: false, timer: 2500 });
        fnListarValores();
        fnListarTablas(function () { tablaActual = fnBuscarTabla(tablaActual.codigoTabla); });
      } else {
        fnCommon.mostrarError(respuesta);
      }
    });
  }

  function fnCambiarEstado(id, activar) {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.consultarAjaxJWT(usuarioSesion, "POST", API + "/multitabla/estado", JSON.stringify({ "idMultitabla": id, "flkactivo": activar }), function (respuesta) {
      if (respuesta.codigoRespuesta == "01") {
        fnCommon.limpiarCatalogos();
        Swal.fire({ toast: true, position: "top-end", icon: "success", title: respuesta.mensajeRespuesta, showConfirmButton: false, timer: 2500 });
        fnListarValores();
      } else {
        fnCommon.mostrarError(respuesta);
      }
    });
  }

  return {
    fnInicializacion: fnInicializacion,
    fnAbrir: fnAbrir,
    fnCambiarEstado: fnCambiarEstado
  }
}();
