//-- NUEVO / EDITAR USUARIO (Seguridad > Usuarios)
//--  Nuevo: datos, rol y contraseña inicial.
//--  Editar (?id=N): solo datos y rol. La contraseña y la foto las cambia cada usuario en "Mi perfil".

var API = fnCommon.URL_BACK + "/api/v1";

$(document).ready(function () {
  $(".preloader").fadeIn();
  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");

  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  if (usuarioSesion == null) return;

  if (fnNewUsuario.idEditar()) {
    $(".content-header h1").text("Editar Usuario");
    $(".breadcrumb-item.active").text("Editar Usuario");
    document.title = "MarketData | Editar Usuario";
    $("#grupoContrasena").hide();
    $("#notaEdicion").show();
  }
  $("#telefono").on("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 9); });
  $("#rmGuardar").click(fnNewUsuario.fnGuardar);

  fnNewUsuario.fnCargarCombos(function () { fnNewUsuario.fnInicializacion(); });
});

var fnNewUsuario = function () {

  var TIPOS_PERSONA = ["DNI", "CE", "PAS"];   //-- multitabla 004: tipos de documento de una persona

  function idEditar() {
    var id = fnCommon.getUrlParameter("id");
    return id ? parseInt(id, 10) : null;
  }

  //-- roles y tipos de documento; al terminar ambos llama a listo()
  function fnCargarCombos(listo) {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    var pendientes = 2;
    var fin = function () { if (--pendientes == 0 && listo) listo(); };
    fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/roles/listados", null, function (r) {
      var $s = $("#rol").empty().append('<option value="">-- Seleccione --</option>');
      $.each(r.listados || [], function (i, item) {
        if (item.flkactivo === false) return;
        $s.append('<option value="' + item.idRol + '">' + fnCommon.escaparHtml(item.nombre) + '</option>');
      });
      fin();
    });
    fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/multitabla/listados/" + fnCommon.MT_TIPO_DOCUMENTO, null, function (r) {
      var $s = $("#idTipoDocumento").empty();
      $.each(r.listados || [], function (i, item) {
        if (TIPOS_PERSONA.indexOf(item.valor) < 0) return;
        $s.append('<option value="' + item.idMultitabla + '" data-tipo="' + item.valor + '" title="' + fnCommon.escaparHtml(item.valorAux || "") + '">' + fnCommon.escaparHtml(item.valor) + '</option>');
      });
      fin();
    });
  }

  function fnInicializacion() {
    var id = idEditar();
    if (!id) { $(".preloader").fadeOut(); $("#nombres").focus(); return; }
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.consultarAjaxJWT(usuarioSesion, "GET", API + "/usuarios/mostrar/" + id, null, function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      $("#nombres").val(r.nombres);
      $("#apellidos").val(r.apellidos);
      $("#usuario").val(r.usuario);
      $("#telefono").val(r.telefono || "");
      $("#correo").val(r.correo || "");
      $("#customCheckbox1").prop("checked", r.flkactivo === true || r.flkactivo === 1);
      $("#rol").val(String(r.idRol));
      if (r.idTipoDocumento) $("#idTipoDocumento").val(String(r.idTipoDocumento));
      $("#dni").val(r.dni || "");
    });
  }

  //-- [mensaje, campo] o null
  function fnValidar() {
    if (!$.trim($("#nombres").val())) return ["Ingrese los nombres", "#nombres"];
    if (!$.trim($("#apellidos").val())) return ["Ingrese los apellidos", "#apellidos"];
    var tipo = $("#idTipoDocumento option:selected").data("tipo");
    var numero = $.trim($("#dni").val()).toUpperCase();
    if (!tipo) return ["Seleccione el tipo de documento", "#idTipoDocumento"];
    if (tipo == "DNI" && !/^\d{8}$/.test(numero)) return ["El DNI debe tener 8 dígitos", "#dni"];
    if (tipo == "CE" && !/^[A-Z0-9]{8,12}$/.test(numero)) return ["El carnet de extranjería debe tener entre 8 y 12 letras o números", "#dni"];
    if (tipo == "PAS" && !/^[A-Z0-9]{6,12}$/.test(numero)) return ["El pasaporte debe tener entre 6 y 12 letras o números", "#dni"];
    if (!/^\d{9}$/.test($("#telefono").val())) return ["El teléfono debe tener 9 dígitos", "#telefono"];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($.trim($("#correo").val()))) return ["Ingrese un correo válido", "#correo"];
    if (!$("#rol").val()) return ["Seleccione el rol", "#rol"];
    if (!$.trim($("#usuario").val())) return ["Ingrese el usuario", "#usuario"];
    if (!idEditar()) {
      var clave = $("#contrasena").val();
      if (clave.length < 8 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return ["La contraseña inicial debe tener mínimo 8 caracteres, con letras y números", "#contrasena"];
    }
    return null;
  }

  function fnGuardar() {
    $("#regint-formulario .is-invalid").removeClass("is-invalid");
    var error = fnValidar();
    if (error) { $(error[1]).addClass("is-invalid").focus(); Swal.fire(error[0], "", "warning"); return; }
    var id = idEditar();
    var request = {
      "idUsuario": id,
      "idRol": parseInt($("#rol").val(), 10),
      "nombres": $.trim($("#nombres").val()),
      "apellidos": $.trim($("#apellidos").val()),
      "usuario": $.trim($("#usuario").val()),
      "contrasenia": id ? null : $("#contrasena").val(),
      "telefono": $("#telefono").val(),
      "idTipoDocumento": parseInt($("#idTipoDocumento").val(), 10),
      "dni": $.trim($("#dni").val()).toUpperCase(),
      "correo": $.trim($("#correo").val()),
      "flkactivo": $("#customCheckbox1").is(":checked") ? 1 : 0
    };
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(usuarioSesion, "POST", API + "/usuarios/registros", JSON.stringify(request), function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      Swal.fire({
        title: id ? "Usuario actualizado" : "Usuario creado",
        text: id ? "" : "Entréguele su usuario y contraseña inicial: podrá cambiarla en Mi perfil.",
        icon: "success",
        confirmButtonText: "Ok",
        allowOutsideClick: false
      }).then(function () { fnCommon.opcionesEstaticas(3); });
    });
  }

  return {
    idEditar: idEditar,
    fnCargarCombos: fnCargarCombos,
    fnInicializacion: fnInicializacion,
    fnGuardar: fnGuardar
  };
}();
