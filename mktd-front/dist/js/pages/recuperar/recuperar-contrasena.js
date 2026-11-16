$(document).ready(function () {
    $(".preloader").fadeIn();

    $("#navBar").load("../../pages/seguridad/nav.html");
    $("#footerBar").load("../../pages/seguridad/footer.html");
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    //fnCommon.inicializarSesion(usuarioSesion);
    //fnNewUsuario.fnUsuarios(usuarioSesion);

    $(".preloader").fadeOut();
});

var fnRecuperar = function () {

    function fnRestableserContrasena() {
      //var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      $(".preloader").fadeIn();
      if ($("#email").val() != '' ) {
        
        var request = {
          "correo": $("#email").val() 
        }
        var jsonData = JSON.stringify(request);
        jsonData = $.parseJSON(jsonData);
        console.log(jsonData);
        fnCommon.consultarAjaxNotJWT( 
          "POST",
          fnCommon.URL_BACK + "/api/v1/login/enviarCorreo",
          JSON.stringify(request),
          function (respuesta) {
            if (respuesta == 1) {
              //-- Cabecera
              Swal.fire({ icon: "success" , title: "revise su correo por favor!!",  allowOutsideClick: false , confirmButtonText:  '<a href="../seguridad/login.html" style="color: white;">OK'});
              
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
        fnRestableserContrasena: fnRestableserContrasena
    }
  }();

