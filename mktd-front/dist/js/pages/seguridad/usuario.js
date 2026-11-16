//-- LISTADO DE USUARIOS
//--  Foto: se pide solo para las filas visibles de la página y se guarda en memoria (y en la caché del navegador con ?v=versión).
//--  Documento: tipo (DNI / CE / PAS) + número.

$(document).ready(function () {

  $(".preloader").fadeIn();

  $("#navBar").load("../../pages/seguridad/nav.html");
  $("#footerBar").load("../../pages/seguridad/footer.html");

  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
  fnCommon.inicializarSesion(usuarioSesion);
  if (usuarioSesion == null) return;

  $('#listaUsuario').DataTable({
    "paging": true,
    "lengthChange": true,
    "searching": true,
    "ordering": false,
    "info": false,
    "autoWidth": false,
    "responsive": true,
    "language": {
      url: "../../plugins/datatables/Spanish.json"
    },
    "columns": [
      { data: "idUsuario" },
      { data: "usuario" },
      { data: "nombres" },
      { data: "rol" },
      { data: "dni" },
      { data: "telefono" },
      { data: "correo" },
      { data: "flkactivo" },
      { data: "idUsuario" }
    ],
    "columnDefs": [
      {
        "targets": 3,
        "render": function (data) { return data ? "<span class='badge badge-info'>" + fnCommon.escaparHtml(data) + "</span>" : "-"; }
      },
      {
        "targets": 0,
        "width": "6%",
        "className": "text-center",
        "render": function (data, type, row) {
          if (type !== "display") return "";
          return fnUser.fnHtmlFoto(row);
        }
      },
      {
        "targets": 1,
        "render": function (data) { return fnCommon.escaparHtml(data); }
      },
      {
        "targets": 2,
        "render": function (data, type, row) {
          return fnCommon.escaparHtml((row.nombres || "") + " " + (row.apellidos || ""));
        }
      },
      {
        "targets": 4,
        "className": "text-nowrap",
        "render": function (data, type, row) {
          if (!data) return "-";
          var tipo = row.tipoDocumento ? "<span class='badge badge-secondary mr-1'>" + fnCommon.escaparHtml(row.tipoDocumento) + "</span>" : "";
          return tipo + fnCommon.escaparHtml(data);
        }
      },
      {
        "targets": [5, 6],
        "render": function (data) { return fnCommon.escaparHtml(data || "-"); }
      },
      {
        "targets": 7,
        "width": "10%",
        "className": "text-center",
        "render": function (data) {
          return data ? "<span class='badge badge-success'>Activo</span>" : "<span class='badge badge-secondary'>Inactivo</span>";
        }
      },
      {
        "targets": 8,
        "width": "10%",
        "className": "text-center",
        "render": function (data, type, row) {
          var icono = row.flkactivo ? "fa-trash" : "fa-check";
          var clase = row.flkactivo ? "btn-danger" : "btn-success";
          var titulo = row.flkactivo ? "Desactivar" : "Activar";
          return "<div class='btn-group btn-group-sm'>" +
            "<a href='../seguridad/nuevo-usuario.html?id=" + row.idUsuario + "' class='btn btn-info' title='Editar'><i class='fas fa-edit'></i></a>" +
            "<a href='#' onclick='fnUser.fnEliminar(" + row.idUsuario + "," + (row.flkactivo ? "true" : "false") + "); return false;' class='btn " + clase + "' title='" + titulo + "'><i class='fas " + icono + "'></i></a>" +
            "</div>";
        }
      }
    ],
    "drawCallback": function () { fnUser.fnCargarFotos(); }
  });
  fnUser.fnUsuarios(usuarioSesion);
});

var fnUser = function () {

  var fotos = {};   //-- idUsuario|version -> objectURL (ya descargadas en esta página)

  function fnIniciales(row) {
    var texto = ((row.nombres || "").trim().split(/\s+/)[0] || "").charAt(0) + ((row.apellidos || "").trim().charAt(0) || "");
    return (texto || (row.usuario || "?").charAt(0)).toUpperCase();
  }

  function fnHtmlFoto(row) {
    var clave = row.idUsuario + "|" + (row.fotoVersion || "");
    if (row.tieneFoto && fotos[clave]) {
      return "<img class='gwu-foto-lista' alt='Foto' src='" + fotos[clave] + "'>";
    }
    return "<span class='gwu-avatar gwu-foto-lista'" +
      (row.tieneFoto ? " data-id='" + row.idUsuario + "' data-version='" + fnCommon.escaparHtml(row.fotoVersion || "") + "'" : "") +
      ">" + fnCommon.escaparHtml(fnIniciales(row)) + "</span>";
  }

  //-- Pide las fotos de las filas que se están mostrando (no de todo el listado)
  function fnCargarFotos() {
    $("#listaUsuario span.gwu-foto-lista[data-id]").each(function () {
      var $el = $(this);
      var id = $el.data("id");
      var version = $el.attr("data-version") || "";
      var clave = id + "|" + version;
      $el.removeAttr("data-id");
      if (fotos[clave]) { $el.replaceWith("<img class='gwu-foto-lista' alt='Foto' src='" + fotos[clave] + "'>"); return; }
      var sesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      if (!sesion) return;
      var xhr = new XMLHttpRequest();
      xhr.open("GET", fnCommon.URL_BACK + "/api/v1/usuarios/foto/" + id + "?v=" + encodeURIComponent(version), true);
      xhr.responseType = "blob";
      xhr.setRequestHeader("Authorization", "Bearer " + sesion.jwtToken);
      xhr.onload = function () {
        if (xhr.status != 200) return;
        fotos[clave] = URL.createObjectURL(xhr.response);
        $el.replaceWith("<img class='gwu-foto-lista' alt='Foto' src='" + fotos[clave] + "'>");
      };
      xhr.send(null);
    });
  }

  function fnUsuarios(usuarioSesion) {
    $(".preloader").fadeIn();
    fnCommon.consultarAjaxJWT(
      usuarioSesion || JSON.parse(localStorage.getItem("usuarioSesion")),
      "GET",
      fnCommon.URL_BACK + "/api/v1/usuarios/listados",
      null,
      function (respuesta) {
        $(".preloader").fadeOut();
        if (respuesta.codigoRespuesta == "01") {
          $('#listaUsuario').DataTable()
            .clear()
            .rows.add(respuesta.listados || [])
            .draw();
        } else {
          Swal.fire(respuesta.mensajeRespuesta, "", "error");
        }
      }
    );
  }

  function fnEditarUsuario(id) {
    window.location.replace(fnCommon.getCtx() + "/pages/seguridad/nuevo-usuario.html?id=" + id);
  }

  function fnEliminar(id, estado) {
    var valor = estado ? "desactivar" : "activar";
    var activar = estado ? 0 : 1;
    Swal.fire({
      title: "¿Está seguro de " + valor + " el usuario?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, " + valor,
      cancelButtonText: "No, cancelar"
    }).then(function (result) {
      if (!result.value) return;
      var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      var request = { "idUsuario": id, "flkactivo": activar };
      $(".preloader").fadeIn();
      fnCommon.consultarAjaxJWT(
        usuarioSesion,
        "POST",
        fnCommon.URL_BACK + "/api/v1/usuarios/modificar",
        JSON.stringify(request),
        function (respuesta) {
          $(".preloader").fadeOut();
          if (respuesta.codigoRespuesta == "01") {
            Swal.fire({ toast: true, position: "top-end", icon: "success", title: respuesta.mensajeRespuesta, showConfirmButton: false, timer: 2000 });
            fnUsuarios();
          } else {
            Swal.fire(respuesta.mensajeRespuesta, "", "error");
          }
        }
      );
    });
  }

  return {
    fnUsuarios: fnUsuarios,
    fnEditarUsuario: fnEditarUsuario,
    fnEliminar: fnEliminar,
    fnHtmlFoto: fnHtmlFoto,
    fnCargarFotos: fnCargarFotos
  }
}();
