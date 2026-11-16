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
            fnLogin.fnUsuarioIngreso();
        }
    });
    formularioLogin.validate({
        rules: {
            usuario: {
                required: true
            },
            clave: {
                required: true
            }
        },
        messages: {
            usuario: {
                required: "Ingrese su Usuario"
            },
            password: {
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

    $( "#clave" ).keypress(function() {
        if(event.keyCode == 13) { 
            formularioLogin.validate();
            if( formularioLogin.valid() ) {
                fnLogin.fnUsuarioIngreso();
            }
        }
    });    
    

}); //-- Fin - $(function ()


var fnLogin = function () {

    function fnUsuarioIngreso() {        

        $(".preloader").fadeIn(); //-- aplica para boton y enter en campo "clave"
        localStorage.removeItem("usuarioSesion");
                
        var request = {
        "usuario": $("#usuario").val(),
        "clave": $("#clave").val()
        }

        fnCommon.consultarAjax( 
            "POST",
            fnCommon.URL_BACK+"/api/v1/usuarios/ingresos",
            JSON.stringify(request),
            function(respuesta){
      //        console.log("respuesta = " + JSON.stringify(respuesta));
      
              if(respuesta.codigoRespuesta == "01") {
                
                //-- cache
                localStorage.setItem("usuarioSesion", JSON.stringify(respuesta));
                var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
                var rol = usuarioSesion.rol;
                fnCommon.consultarAjaxJWT(
                    usuarioSesion,
                    "GET",
                    fnCommon.URL_BACK + "/api/v1/accesoRol/listaAccesoRol/" + rol,
                    null,
                    function (response) {
                        localStorage.setItem("accesos", JSON.stringify(response));
                        Swal.fire(respuesta.mensajeRespuesta, "", "success");
                        //-- Redireccionar
                        window.location.replace(fnCommon.getCtx()+"/pages/seguridad/principal.html");

                    });
      //          console.log("usuarioSesion = " + localStorage.getItem("usuarioSesion") );
      //          console.log("usuarioSesion = " +  JSON.parse(localStorage.getItem("usuarioSesion")).codigoUsuario );
      
              } else {
                Swal.fire(respuesta.mensajeRespuesta, "", "error");
                $(".preloader").fadeOut();
              }
      
            }  
        );        

    }

    //--
    return {
        fnUsuarioIngreso:   fnUsuarioIngreso
    }    

}();






