$(document).ready(function () {

  $(".preloader").fadeIn();

  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");

  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  $('#listaMenu').DataTable({
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
          return "<div class='btn-group btn-group-sm'><a href='../seguridad/nuevo-menu.html?id=" + row.idMenu + "' class='btn btn-info'><i class='fas fa-edit'></i></a><a href='#' onclick='fnMenu.fnEliminar(" + row.idMenu + "," + row.flkactivo + ")' class='btn btn-danger'><i class='fas fa-trash'></i></a></div>";
        },
        "targets": 4,
        "width": "10%",
        "className": "text-center"
      }
    ],
    "columns": [{
        data: "nombre"
      },
      {
        data: "descripcion"
      },
      {
        data: "orden"
      },
      {
        data: "flkactivo"
      },
      {
        data: "idMenu"
      }
    ]
  });

  fnMenu.fnMenus(usuarioSesion);

  $(".preloader").fadeIn();
});

var fnMenu = function () {

  function fnMenus(usuarioSesion) {
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(
      usuarioSesion,
      "GET",
      fnCommon.URL_BACK + "/api/v1/menu/listados",
      null,
      function (respuesta) {
        if (respuesta.codigoRespuesta == "01") {

          $('#listaMenu').DataTable()
            .clear()
            .rows.add(respuesta.listados)
            .draw();
          console.log(respuesta.listados);

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
          "idMenu": id,
          "flkactivo": activar
        }
        var jsonData = JSON.stringify(request);
        jsonData = $.parseJSON(jsonData);
        console.log(jsonData);
        fnCommon.consultarAjaxJWT(
          usuarioSesion,
          "POST",
          fnCommon.URL_BACK + "/api/v1/menu/modificar",
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
    fnMenus: fnMenus,
    fnEliminar: fnEliminar
  }
}();
