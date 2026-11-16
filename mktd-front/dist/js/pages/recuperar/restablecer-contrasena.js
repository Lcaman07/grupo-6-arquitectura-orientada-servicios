$(document).ready(function () {

  $(".preloader").fadeIn();
  formularioLogin = $('#login-formulario');

  //-- Cargar pagina - 1era vez
  //-----------------------------------------------------------------------------

  fnCommon.fnLimpiarFormulario(formularioLogin);
  $(".preloader").fadeOut();


  //-- Validaciones
  //-----------------------------------------------------------------------------

  $.validator.setDefaults({
    submitHandler: function () {
      fnRestablecer.fnCambiarContrasena();
    }
  });
  formularioLogin.validate({
    rules: {
      clave: {
        required: true
      },
      ConfirmarClave: {
        required: true
      }
    },
    messages: {
      clave: {
        required: "Ingrese su Usuario"       
      },
      ConfirmarClave: {
        required: "Ingrese su Clave"
      }
    },
    errorElement: 'span',
    errorPlacement: function (error, element) {
      error.addClass('invalid-feedback');
      element.closest('.form-group').append(error);
    },
    highlight: function (element, errorClass, validClass) {
      $(element).addClass('is-invalid');
    },
    unhighlight: function (element, errorClass, validClass) {
      $(element).removeClass('is-invalid');
    }
  });


  //-- Acciones
  //-----------------------------------------------------------------------------

  $("#clave").keypress(function () {
    if (event.keyCode == 13) {
      formularioLogin.validate();
      if (formularioLogin.valid()) {
        fnRestablecer.fnCambiarContrasena();
      }
    }
  });




}); //-- Fin - $(function ()
var fnRestablecer = function () {

    function fnCambiarContrasena() {
      //var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      $(".preloader").fadeIn();

      let searchParams = new URLSearchParams(window.location.search);
      let param = searchParams.get('id');
      let paramCallId = searchParams.get('callId');
      console.log("parametro" + param);

      
      $("#clave").each(function () {
        var validated = true;
        if (this.value.length < 8)
          validated = false;
        if (!/\d/.test(this.value))
          validated = false;
        if (!/[a-z]/.test(this.value))
          validated = false;
        if (!/[A-Z]/.test(this.value))
          validated = false;
        if (!/[!@#$&*]/.test(this.value))
          validated = false;
  
        //$('#passstrength').text(validated ? "" : "*Por favor ingrese minimo 6 caracteres que contengan al menus un caracter");
        // use DOM traversal to select the correct div for this input above
        if (validated == false) {
          $('#passstrength').text("*Por favor ingrese minimo 6 caracteres que contengan al menus un caracter");
          $(".preloader").fadeOut(); 
        } else {
          $('#passstrength').empty();
          if ($("#clave").val() == $("#ConfirmarClave").val()  ) {


            console.log("clave iguales");
            
            var request = {
              "token": param,
              "clave":  $("#clave").val()
            }
            var jsonData = JSON.stringify(request);
            jsonData = $.parseJSON(jsonData);
            console.log(jsonData);
            fnCommon.consultarAjaxNotJWT( 
              "POST",
              fnCommon.URL_BACK + "/api/v1/login/restablecer",
              JSON.stringify(request),
              function (respuesta) {
                if (respuesta == 1) {
                  //-- Cabecera
                  Swal.fire({ icon: "success" , title: "La contraseña se cambio correctamente ",  allowOutsideClick: false , confirmButtonText:  '<a href="../seguridad/login.html" style="color: white;">OK'});
                  
                  $(".preloader").fadeOut();
      
                } else {
                  Swal.fire(respuesta.mensajeRespuesta, "", "error");
                  $(".preloader").fadeOut();
                }
              }
            );
            
          } else {
            console.log("parametro" + param);
              Swal.fire({
                  icon: 'error',
                  title: 'Oops...',
                  text: 'Verificar que las contraseñas sean iguales'          
                })
                $(".preloader").fadeOut();
      
          }
        }
        
    
      });


      
    }

  /*function fnCambiarContrasena() {

    //$("#clave").click(function () {

    $("#clave").each(function () {
      var validated = true;
      if (this.value.length < 8)
        validated = false;
      if (!/\d/.test(this.value))
        validated = false;
      if (!/[a-z]/.test(this.value))
        validated = false;
      if (!/[A-Z]/.test(this.value))
        validated = false;
      if (!/[!@#$&*]/.test(this.value))
        validated = false;

      $('#passstrength').text(validated ? "" : "*Por favor ingrese minimo 6 caracteres que contengan al menus un caracter");
      // use DOM traversal to select the correct div for this input above
    });

    //});

  }*/

  return {
    fnCambiarContrasena: fnCambiarContrasena
  }
}();
