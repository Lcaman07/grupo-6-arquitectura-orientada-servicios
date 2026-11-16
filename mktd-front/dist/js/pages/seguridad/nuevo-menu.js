$(document).ready(function () {
    $(".preloader").fadeIn();

    $("#navBar").load("../../pages/seguridad/nav.html");
    $("#footerBar").load("../../pages/seguridad/footer.html");
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.inicializarSesion(usuarioSesion);
    fnNewMenu.fnInicializacion(usuarioSesion);

    $(".preloader").fadeOut();
});

var fnNewMenu = function () {

  function fnInicializacion(usuarioSesion) {
    var searchParams = new URLSearchParams(window.location.search);
    var id = searchParams.get("id");
    if (id!=null) {
        console.log("no es nulo" + null);
        fnCommon.consultarAjaxJWT(
            usuarioSesion,
            "GET",
            //fnCommon.URL_BACK + "/api/v1/osrnService/trazabilidadtraslados/"+ serie,
            fnCommon.URL_BACK + "/api/v1/menu/mostrar" + "/" + id,
            null,
            function (respuesta) { 
              if (respuesta.codigoRespuesta == "01") {
      
                //-- cargar datos en tabla 
                $("#nombre").val(respuesta.nombre);
                $("#descripcion").val(respuesta.descripcion);
                $("#orden").val(respuesta.orden);
                $("#customCheckbox1")[0].checked = respuesta.flkactivo;  ///.val(respuesta.flkactivo);
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
  
  function fnMenus() {
    var searchParams = new URLSearchParams(window.location.search);
    var id = searchParams.get("id");
      var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      $(".preloader").fadeIn();
      if ($("#nombre").val() != '' && $("#descripcion").val() != '' && $("#orden").val() != '' ) {
        if ($("#customCheckbox1").prop('checked')) {
          var resultado = 1;
        } else {
          var resultado = 0;
        }
        var request = {
          "idMenu": id,
          "nombre": $("#nombre").val(),
          "descripcion": $("#descripcion").val(),
          "orden": $("#orden").val(),
          "flkactivo": resultado
        }
        var jsonData = JSON.stringify(request);
        jsonData = $.parseJSON(jsonData);
        console.log(jsonData);
        fnCommon.consultarAjaxJWT(
          usuarioSesion,
          "POST",
          fnCommon.URL_BACK + "/api/v1/menu/registros",
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
                  fnCommon.opcionesEstaticas(13);
                }
              })
              //Swal.fire({ icon: "success" , title: respuesta.mensajeRespuesta,  allowOutsideClick: false , confirmButtonText:  '<a href="javascript: fnCommon.opcionesEstaticas(13);" style="color: white;">OK'});
              
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
  
    return {
      fnMenus: fnMenus,
      fnInicializacion: fnInicializacion
    }
  }();

