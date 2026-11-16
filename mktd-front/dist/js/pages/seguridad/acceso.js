$(document).ready(function () {

    $(".preloader").fadeIn();
  
    $("#navBar").load("../../pages/seguridad/nav.html");
    $("#footerBar").load("../../pages/seguridad/footer.html");
  
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    fnCommon.inicializarSesion(usuarioSesion);
    $('#listaAcceso').DataTable({
      "paging": true,
      "lengthChange": true,
      "searching": true,
      "ordering": false,
      "info": false,
      "autoWidth": true,
      "responsive": true,
      "language": {
        url: "../../plugins/datatables/Spanish.json"
      },
      "columnDefs": [
  
        {
          "render": function (data, type, row) {
            if (row.flkactivo == true) {
              return "Activo";
            } else {
              return "Inactivo";
            }
          },
          "targets": 3,
          "width": "10%",
          "className": "text-center"
        },
        {
          "render": function (data, type, row) {
            return "<div class='btn-group btn-group-sm'><a href='../seguridad/nuevo-acceso.html?id=" + row.idAcceso + "' class='btn btn-info'><i class='fas fa-edit'></i></a><a href='#' onclick='fnAcceso.fnEliminar(" + row.idAcceso + "," + row.flkactivo + ")' class='btn btn-danger'><i class='fas fa-trash'></i></a></div>";
          },
          "targets": 4,
          "width": "10%",
          "className": "text-center"
        }
      ],
      "columns": [{
          data: "nombreMenu"
        },
        {
          data: "nombreAcceso"
        },
        {
          data: "ordenAcceso"
        },
        {
          data: "flkactivo"
        },
        {
          data: "idAcceso"
        }
      ]
    });
   
    fnAcceso.fnAccesos(usuarioSesion);
  
    $(".preloader").fadeIn();
  });
  
  var fnAcceso = function () {
  
    function fnAccesos(usuarioSesion) {
      $(".preloader").fadeIn();
      fnCommon.consultarAjaxJWT(
        usuarioSesion,
        "GET",
        fnCommon.URL_BACK + "/api/v1/acceso/listados",
        null,
        function (respuesta) {
          if (respuesta.codigoRespuesta == "01") {
  
            $('#listaAcceso').DataTable()
              .clear()
              .rows.add(respuesta.lista)
              .draw();
                console.log( respuesta.lista);
  
            $(".preloader").fadeOut();
  
          } else {
            Swal.fire(respuesta.mensajeRespuesta, "", "error");
            $(".preloader").fadeOut();
          }
        }
      );
    }
   

    function fnEliminar(id, estado) {
      console.log(id);
      if (estado == true) {
        valor = "desactivar"
        activar = 0
      } else {
        valor = "activar"
        activar = 1
      }
      swal({
        title: "Esta Seguro de " + valor,
        icon: "warning",
        buttons: [
          'No, Cancelar',
          'Si, ' + valor
        ],
        dangerMode: true,
      }).then(function (isConfirm) {
        if (isConfirm) {
          var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  
          var request = {
            "idAcceso": id,
            "flkactivo": activar
          }
          var jsonData = JSON.stringify(request);
          jsonData = $.parseJSON(jsonData);
          console.log(jsonData);
          fnCommon.consultarAjaxJWT(
            usuarioSesion,
            "POST",
            fnCommon.URL_BACK + "/api/v1/acceso/modificar",
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
          console.log('no acepta->>>');
        }
      });
    }
  
    return {
        fnAccesos: fnAccesos,
      fnEliminar: fnEliminar
    }
  }();
  