$(document).ready(function () {

  $(".preloader").fadeIn();
  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");

  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  $('#listaRol').DataTable({
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
        "targets": 2,
        "width": "20%",
        "className": "text-center"
      },
      {
        "render": function (data, type, row) {

          return "<div class='btn-group btn-group-sm'><a href='../seguridad/nuevo-rol.html?id=" + row.idRol + "' class='btn btn-info'><i class='fas fa-edit'></i></a><a href='#' onclick='fnRol.fnEliminar(" + row.idRol + "," + row.flkactivo + ")' class='btn btn-danger' ><i class='fas fa-trash'></i></a></div>";

        },
        "targets": 3,
        "width": "20%",
        "className": "text-center"
      }


    ],
    "columns": [{
        data: "idRol"
      },
      {
        data: "nombre"
      },
      {
        data: "flkactivo"
      },
      {
        data: "idRol"
      }
    ]
  });
  fnRol.fnRoles(usuarioSesion);
  $(".preloader").fadeIn();

  $('#modal-delete').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget); // Button that triggered the modal
    var id = button.data('id');
    var name = button.data('name');
    var state = button.data('state'); // Extract info from data-* attributes
    // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
    // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.


    var modal = $(this);
    if (state == true) {
      modal.find('.modal-title').text('desactivar');
      $("#labelPregunta").html("¿Seguro que desea desactiar el rol " + name + "?");
      $("#id").val(id);
      $("#name").val(name);
      $("#state").val(false);
    } else {
      modal.find('.modal-title').text('activar');
      $("#labelPregunta").html("¿Seguro que desea activar el rol " + name + "?");
      $("#id").val(id);
      $("#name").val(name);
      $("#state").val(true);
    }
  })
});
var fnRol = function () {

  function fnRoles(usuarioSesion) {
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(
      usuarioSesion,
      "GET",
      fnCommon.URL_BACK + "/api/v1/roles/listados",
      null,
      function (respuesta) {
        if (respuesta.codigoRespuesta == "01") {

          $('#listaRol').DataTable()
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

  function fnEditarRol(id) {
    window.location.replace(fnCommon.getCtx() + "/pages/seguridad/nuevo-rol.html?id=" + id);
  }

  function fnCambiarEstado() {
    $(".preloader").fadeIn();
    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    let id = $("#id").val();
    let state = $("#state").val();
    console.log("id :" + id + "state :" + state);
    fnCommon.consultarAjaxJWT(
      usuarioSesion,
      "GET",
      fnCommon.URL_BACK + "/api/v1/roles/cambiarEstado/" + id + "/" + state,
      null,
      function (respuesta) {
        if (respuesta.codigoRespuesta == "01") {
          $('#modal-delete').modal('hide')
          Swal.fire(respuesta.mensajeRespuesta, "", "success");
          fnRoles(usuarioSesion);
          $(".preloader").fadeOut();
        } else {
          $('#modal-delete').modal('hide')
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
          "idRol": id,
          "flkactivo": activar
        }
        var jsonData = JSON.stringify(request);
        jsonData = $.parseJSON(jsonData);
        console.log(jsonData);
        fnCommon.consultarAjaxJWT(
          usuarioSesion,
          "POST",
          fnCommon.URL_BACK + "/api/v1/roles/modificarRol",
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
                  fnCommon.opcionesEstaticas(4);
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
    fnRoles: fnRoles,
    fnEditarRol: fnEditarRol,
    fnCambiarEstado: fnCambiarEstado,
    fnEliminar: fnEliminar
  }
}();
