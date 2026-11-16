$(document).ready(function () {
  $(".preloader").fadeIn();
  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");
  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  fnNewAcceso.fnListarMenu(usuarioSesion);
  fnNewAcceso.fnInicializacion(usuarioSesion);
  $(".preloader").fadeOut();
});

var fnNewAcceso = function () {

  function fnInicializacion(usuarioSesion) {
    var searchParams = new URLSearchParams(window.location.search);
    var id = searchParams.get("id"); 
    if (id != null) {
      console.log("no es nulo" + null);
      fnCommon.consultarAjaxJWT(
        usuarioSesion,
        "GET",
        //fnCommon.URL_BACK + "/api/v1/osrnService/trazabilidadtraslados/"+ serie,
        fnCommon.URL_BACK + "/api/v1/acceso/mostrar" + "/" + id,
        null,
        function (respuesta) {
          if (respuesta.codigoRespuesta == "01") {
            //-- cargar datos en tabla 
            $("#nombre").val(respuesta.nombreAcceso);
            $("#path").val(respuesta.path);
            $("#orden").val(respuesta.ordenAcceso);
            $("#Nombremenu").val(respuesta.idMenu);
            $("#customCheckbox1")[0].checked = respuesta.flkactivo; ///.val(respuesta.flkactivo);
            //
            console.log(respuesta);

            $(".preloader").fadeOut();

          } else {
            Swal.fire(respuesta.mensajeRespuesta, "", "error");
            $(".preloader").fadeOut();
          }
        }
      );
    } else {
      console.log("es nulo" + null);
    }
  }

  function fnAccesos() {
    var searchParams = new URLSearchParams(window.location.search);
    var id = searchParams.get("id");
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    $(".preloader").fadeIn();
    if ($("#nombre").val() != '' && $("#descripcion").val() != '' && $("#orden").val() != '') {
      if ($("#customCheckbox1").prop('checked')) {
        var resultado = 1;
      } else {
        var resultado = 0;
      }
      var menu = parseInt($("#Nombremenu").val());
      var request = {
        "idAcceso": id, 
        "nombre": $("#nombre").val(),
        "path": $("#path").val(),
        "orden": $("#orden").val(),
        "idMenu": menu,
        "flkactivo": resultado
      }
      var jsonData = JSON.stringify(request);
      jsonData = $.parseJSON(jsonData);
      console.log(jsonData);
      fnCommon.consultarAjaxJWT(
        usuarioSesion,
        "POST",
        fnCommon.URL_BACK + "/api/v1/acceso/registros",
        JSON.stringify(request),
        function (respuesta) {
          if (respuesta.codigoRespuesta == "01") {
            //-- Cabecera
            Swal.fire({
              title: respuesta.mensajeRespuesta,
              icon: 'success',
              showCancelButton: false,
              confirmButtonText: 'Ok',
              allowOutsideClick: false
            }).then((result) => {
              console.log(id);
              if (result.value) {
                fnCommon.opcionesEstaticas(14);
              }
            })

            $(".preloader").fadeOut();

          } else {
            Swal.fire(respuesta.mensajeRespuesta, "", "error");
            $(".preloader").fadeOut();
          }
        }
      );
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Algunos campos esta vacios'
      })
      $(".preloader").fadeOut();
    }
  }

  function fnListarMenu(usuarioSesion) {
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.inicializarSesion(usuarioSesion);

    fnCommon.consultarAjaxJWT(
      usuarioSesion,
      "GET",
      fnCommon.URL_BACK + "/api/v1/menu/menuactivos",
      null,
      function (respuesta) {
        if (respuesta.codigoRespuesta == "01") {
          var jsonData = JSON.stringify(respuesta.listados);
          jsonData = $.parseJSON(jsonData);
          console.log(jsonData);
          $(function () {
            //$("#select").empty();
            $("#Nombremenu").append('<option value=""' + '</option>');
            $.each(jsonData, function (i, item) {

              $("#Nombremenu").append('<option value=' + item.idMenu + '>' + item.nombre + '</option>');
            });
          });
        } else {}
      }
    );
  }

  return {
    fnAccesos: fnAccesos,
    fnListarMenu: fnListarMenu,
    fnInicializacion: fnInicializacion
  }
}();
