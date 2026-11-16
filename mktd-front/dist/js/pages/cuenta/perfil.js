//-- MI PERFIL: cada usuario actualiza sus datos, su foto y (si quiere) su contraseña.
//-- El correo y el usuario no se cambian aquí (el correo sirve para recuperar la contraseña).

var API = fnCommon.URL_BACK + "/api/v1";
var TIPOS_PERSONA = ["DNI", "CE", "PAS"];

$(document).ready(function () {
  $(".preloader").fadeIn();
  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");

  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  if (usuarioSesion == null) return;

  $("#chkCambiarClave").on("change", function () {
    $("#grupoClave").toggle(this.checked);
    if (!this.checked) $("#claveActual, #claveNueva, #claveRepetir").val("");
    else $("#claveActual").focus();
  });
  $(".btn-ver-clave").on("click", function () {
    var $i = $(this).closest(".input-group").find("input");
    var ver = $i.attr("type") == "password";
    $i.attr("type", ver ? "text" : "password");
    $(this).find("i").toggleClass("fa-eye", !ver).toggleClass("fa-eye-slash", ver);
  });
  $("#telefono").on("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 9); });
  $("#btnCambiarFoto, #perfilFoto").on("click", function () { $("#perfilArchivo").click(); });
  $("#perfilArchivo").on("change", fnPerfil.fnCambiarFoto);
  $("#btnGuardarPerfil").on("click", fnPerfil.fnGuardar);

  fnPerfil.fnCargar();
});

var fnPerfil = function () {

  var perfil = null;

  function fnCargar() {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/multitabla/listados/" + fnCommon.MT_TIPO_DOCUMENTO, null, function (tipos) {
      var $s = $("#idTipoDocumento").empty();
      $.each(tipos.listados || [], function (i, item) {
        if (TIPOS_PERSONA.indexOf(item.valor) < 0) return;
        $s.append('<option value="' + item.idMultitabla + '" data-tipo="' + item.valor + '" title="' + fnCommon.escaparHtml(item.valorAux || "") + '">' + fnCommon.escaparHtml(item.valor) + '</option>');
      });
      fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/usuarios/miPerfil", null, function (r) {
        $(".preloader").fadeOut();
        if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
        perfil = r;
        $("#nombres").val(r.nombres);
        $("#apellidos").val(r.apellidos);
        $("#telefono").val(r.telefono || "");
        if (r.idTipoDocumento) $("#idTipoDocumento").val(String(r.idTipoDocumento));
        $("#dni").val(r.dni || "");
        $("#correo").val(r.correo || "");
        $("#usuario").val(r.usuario);
        fnPintarCabecera();
        fnMostrarFoto();
      });
    });
  }

  function fnPintarCabecera() {
    var nombre = $.trim($("#nombres").val() + " " + $("#apellidos").val());
    $("#perfilNombre").text(nombre);
    $("#perfilRol").text(perfil.rol || "");
    $("#perfilUsuario").text(perfil.usuario);
    $("#perfilCorreo").text(perfil.correo || "-").attr("title", perfil.correo || "");
    var ini = nombre.split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join("").toUpperCase();
    $("#perfilIniciales").text(ini || "?");
  }

  function fnMostrarFoto() {
    var guardada = fnCommon.fotoUsuarioGuardada();
    var pintar = function (datos) {
      if (!datos) return;
      $("#perfilFoto").html("<img alt='Mi foto' src='" + datos + "'>");
    };
    if (guardada) pintar(guardada); else fnCommon.cargarFotoUsuario(pintar);
  }

  function fnCambiarFoto() {
    var archivo = this.files && this.files[0];
    if (!archivo) return;
    if (!/^image\//.test(archivo.type)) { Swal.fire("Elija una imagen (JPG o PNG)", "", "warning"); return; }
    $(".preloader").fadeIn();
    fnCommon.cambiarMiFoto(archivo, function (respuesta) {
      $("#perfilArchivo").val("");
      $(".preloader").fadeOut();
      if (respuesta.codigoRespuesta != "01") { fnCommon.mostrarError(respuesta); return; }
      fnCommon.cargarFotoUsuario(function (datos) {
        if (!datos) return;
        $("#perfilFoto").html("<img alt='Mi foto' src='" + datos + "'>");
        if (window.gwuPintarFotoMenu) window.gwuPintarFotoMenu(datos);
      });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Foto actualizada", showConfirmButton: false, timer: 2000 });
    });
  }

  function fnValidar() {
    if (!$.trim($("#nombres").val()) || !$.trim($("#apellidos").val())) return ["Ingrese sus nombres y apellidos", "#nombres"];
    var tipo = $("#idTipoDocumento option:selected").data("tipo");
    var numero = $.trim($("#dni").val()).toUpperCase();
    if (!tipo) return ["Seleccione el tipo de documento", "#idTipoDocumento"];
    if (tipo == "DNI" && !/^\d{8}$/.test(numero)) return ["El DNI debe tener 8 dígitos", "#dni"];
    if (tipo == "CE" && !/^[A-Z0-9]{8,12}$/.test(numero)) return ["El carnet de extranjería debe tener entre 8 y 12 letras o números", "#dni"];
    if (tipo == "PAS" && !/^[A-Z0-9]{6,12}$/.test(numero)) return ["El pasaporte debe tener entre 6 y 12 letras o números", "#dni"];
    if (!/^\d{9}$/.test($("#telefono").val())) return ["El teléfono debe tener 9 dígitos", "#telefono"];
    if ($("#chkCambiarClave").is(":checked")) {
      var nueva = $("#claveNueva").val();
      if (!$("#claveActual").val()) return ["Ingrese su contraseña actual", "#claveActual"];
      if (nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return ["La nueva contraseña debe tener mínimo 8 caracteres, con letras y números", "#claveNueva"];
      if (nueva != $("#claveRepetir").val()) return ["Las contraseñas nuevas no coinciden", "#claveRepetir"];
    }
    return null;
  }

  function fnGuardar() {
    var error = fnValidar();
    $("#formPerfil .is-invalid").removeClass("is-invalid");
    if (error) { $(error[1]).addClass("is-invalid").focus(); Swal.fire(error[0], "", "warning"); return; }
    var cambiaClave = $("#chkCambiarClave").is(":checked");
    var request = {
      "nombres": $.trim($("#nombres").val()),
      "apellidos": $.trim($("#apellidos").val()),
      "telefono": $("#telefono").val(),
      "idTipoDocumento": parseInt($("#idTipoDocumento").val(), 10),
      "dni": $.trim($("#dni").val()).toUpperCase(),
      "claveActual": cambiaClave ? $("#claveActual").val() : null,
      "claveNueva": cambiaClave ? $("#claveNueva").val() : null
    };
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(usuarioSesion, "POST", API + "/usuarios/miPerfil", JSON.stringify(request), function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      //-- el nombre del menú y de la barra superior se actualizan al momento
      var sesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      sesion.nombreUsuario = r.nombreUsuario;
      sesion.nombreCorto = r.nombreCorto;
      localStorage.setItem("usuarioSesion", JSON.stringify(sesion));
      $("aside .user-panel .info a").text(r.nombreCorto);
      $("#navNombreUsuario").text(r.nombreCorto);
      $("#chkCambiarClave").prop("checked", false).trigger("change");
      fnPintarCabecera();
      Swal.fire(r.mensajeRespuesta, cambiaClave ? "La próxima vez ingresa con tu nueva contraseña." : "", "success");
    });
  }

  return { fnCargar: fnCargar, fnCambiarFoto: fnCambiarFoto, fnGuardar: fnGuardar };
}();
