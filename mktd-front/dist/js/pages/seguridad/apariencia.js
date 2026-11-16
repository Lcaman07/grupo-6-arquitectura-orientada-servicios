//-- APARIENCIA (Seguridad): colores del sistema y fondo del login (multitabla 032).
//-- Ver la pantalla: acceso. Guardar: permiso APARIENCIA_EDITAR.

var API = fnCommon.URL_BACK + "/api/v1";
var GRUPOS = [
  { titulo: "Sistema", codigos: ["COLOR_PRINCIPAL", "COLOR_FONDO", "COLOR_TARJETA"] },
  { titulo: "Barra superior, menú y pie", codigos: ["COLOR_NAV", "COLOR_ASIDE", "COLOR_MENU_TEXTO", "COLOR_MENU_ACTIVO", "COLOR_FOOTER"] },
  { titulo: "Login", codigos: ["LOGIN_FONDO_COLOR", "LOGIN_TARJETA_COLOR"] }
];

$(document).ready(function () {
  $(".preloader").fadeIn();
  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");

  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  if (usuarioSesion == null) return;

  var puedeEditar = fnCommon.tienePermiso("APARIENCIA_EDITAR");
  if (!puedeEditar) {
    $("#btnGuardar, #btnRestaurar, #btnDeshacer, #btnFondo, #btnQuitarFondo").prop("disabled", true).attr("title", "No tiene el permiso APARIENCIA_EDITAR");
  }
  $("#txtPx").text(fnCommon.parametro("LOGIN_IMAGEN_PX", 1920));
  $("#btnGuardar").click(fnApariencia.fnGuardar);
  $("#btnRestaurar").click(fnApariencia.fnRestaurar);
  $("#btnDeshacer").click(fnApariencia.fnDeshacer);
  $("#btnFondo").click(function () { $("#archivoFondo").click(); });
  $("#archivoFondo").on("change", fnApariencia.fnSubirFondo);
  $("#btnQuitarFondo").click(fnApariencia.fnQuitarFondo);

  fnApariencia.fnCargar();
});

var fnApariencia = function () {

  var datos = null;     //-- lo que vino del back: { valores, detalle, original }
  var actuales = {};    //-- lo que se está editando

  function fnCargar() {
    fnCommon.cargarApariencia(true, function (r) {
      $(".preloader").fadeOut();
      datos = r;
      actuales = $.extend({}, r.valores);
      fnPintar();
    });
  }

  function nombre(codigo) {
    var d = (datos.detalle || []).find(function (x) { return x.codigo == codigo; });
    return d ? d.nombre : codigo;
  }

  function fnPintar() {
    var $c = $("#listaColores").empty();
    GRUPOS.forEach(function (g) {
      $c.append("<div class='grupo-titulo'>" + g.titulo + "</div>");
      g.codigos.forEach(function (codigo) {
        var v = actuales[codigo] || datos.original[codigo];
        $c.append(
          "<div class='fila-color'>" +
            "<div class='texto'><b>" + fnCommon.escaparHtml(etiqueta(codigo)) + "</b><small>" + fnCommon.escaparHtml(nombre(codigo)) + "</small></div>" +
            "<input type='color' data-codigo='" + codigo + "' value='" + v + "' title='Elegir color'>" +
            "<input type='text' class='form-control form-control-sm hex' data-codigo='" + codigo + "' value='" + v + "' maxlength='7'>" +
          "</div>");
      });
    });
    $c.find("input[type=color]").on("input", function () { fnCambiar($(this).data("codigo"), this.value); });
    $c.find("input.hex").on("change", function () {
      var v = $.trim(this.value).toLowerCase();
      if (v.charAt(0) != "#") v = "#" + v;
      if (!/^#[0-9a-f]{6}$/.test(v)) { Swal.fire("Use el formato #RRGGBB (ej. #2f81f7)", "", "warning"); this.value = actuales[$(this).data("codigo")]; return; }
      fnCambiar($(this).data("codigo"), v);
    });
    fnPintarFondo();
  }

  function etiqueta(codigo) {
    return {
      COLOR_PRINCIPAL: "Color principal", COLOR_FONDO: "Fondo", COLOR_TARJETA: "Tarjetas", COLOR_NAV: "Barra superior",
      COLOR_ASIDE: "Menú lateral", COLOR_MENU_TEXTO: "Texto del menú", COLOR_MENU_ACTIVO: "Opción activa del menú",
      COLOR_FOOTER: "Pie de página", LOGIN_FONDO_COLOR: "Fondo del login", LOGIN_TARJETA_COLOR: "Recuadro del login"
    }[codigo] || codigo;
  }

  //-- cambia el color y lo muestra al momento en toda la pantalla (barra, menú, pie, botones)
  function fnCambiar(codigo, valor) {
    actuales[codigo] = valor;
    $("input[data-codigo='" + codigo + "']").val(valor);
    fnCommon.aplicarApariencia(actuales);
  }

  function fnPintarFondo() {
    var img = datos.valores.LOGIN_FONDO_IMAGEN;
    $("#txtFondo").text(img ? "Imagen propia cargada." : "Se usa la imagen original del sistema.");
    $("#btnQuitarFondo").toggle(!!img);
  }

  function cambiados() {
    var c = {};
    Object.keys(datos.original).forEach(function (k) { if (actuales[k] && actuales[k] != datos.valores[k]) c[k] = actuales[k]; });
    return c;
  }

  function fnGuardar() {
    var valores = cambiados();
    if ($.isEmptyObject(valores)) { Swal.fire("No hay cambios que guardar", "", "info"); return; }
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(usuarioSesion, "POST", API + "/apariencia/guardar", JSON.stringify({ "valores": valores }), function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Apariencia guardada", showConfirmButton: false, timer: 2500 });
      fnCargar();
    });
  }

  function fnRestaurar() {
    Swal.fire({
      title: "¿Volver a los colores originales?", text: "Se aplican aquí para que los veas; luego presiona Guardar.", icon: "question",
      showCancelButton: true, confirmButtonText: "Sí, ver los originales", cancelButtonText: "Cancelar"
    }).then(function (res) {
      if (!res.value) return;
      Object.keys(datos.original).forEach(function (k) { actuales[k] = datos.original[k]; });
      fnPintar();
      fnCommon.aplicarApariencia(actuales);
    });
  }

  function fnDeshacer() {
    actuales = $.extend({}, datos.valores);
    fnPintar();
    fnCommon.aplicarApariencia(actuales);
  }

  function fnSubirFondo() {
    var archivo = this.files && this.files[0];
    if (!archivo) return;
    if (!/^image\//.test(archivo.type)) { Swal.fire("Elija una imagen (JPG o PNG)", "", "warning"); return; }
    var lado = parseInt(fnCommon.parametro("LOGIN_IMAGEN_PX", 1920), 10) || 1920;
    $(".preloader").fadeIn();
    fnCommon.comprimirImagen(archivo, lado, 0.8, function (img) {
      var form = new FormData();
      form.append("file", img, img.name || "fondo.jpg");
      var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      fnCommon.consultarAjaxFile(usuarioSesion, "POST", API + "/apariencia/fondoLogin", form, function (r) {
        $("#archivoFondo").val("");
        $(".preloader").fadeOut();
        if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
        Swal.fire({ toast: true, position: "top-end", icon: "success", title: r.mensajeRespuesta, showConfirmButton: false, timer: 2500 });
        fnCargar();
      });
    });
  }

  function fnQuitarFondo() {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.consultarAjaxJWT(usuarioSesion, "POST", API + "/apariencia/quitarFondo", "{}", function (r) {
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: r.mensajeRespuesta, showConfirmButton: false, timer: 2500 });
      fnCargar();
    });
  }

  return { fnCargar: fnCargar, fnGuardar: fnGuardar, fnRestaurar: fnRestaurar, fnDeshacer: fnDeshacer, fnSubirFondo: fnSubirFondo, fnQuitarFondo: fnQuitarFondo };
}();
