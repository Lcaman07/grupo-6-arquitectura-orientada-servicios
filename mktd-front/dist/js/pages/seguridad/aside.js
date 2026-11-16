

class Aside extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    fnCargarTema();
    this.innerHTML = fnListarAccesoRol();
    fnActivarFotoUsuario(this);
  }
}


/**
 * Tema oscuro/rojo de todo el sistema (dist/css/gwu-theme.css).
 * Se inyecta aquí porque <aside-component> está en todas las páginas;
 * si una página ya lo tiene en su <head> no se vuelve a cargar.
 * layout-fixed: el aside queda fijo con su propio scroll (se ve el menú completo).
 */
var GWU_VERSION = "20261010"; //-- cambiarlo al publicar para que el navegador no use el css viejo

function fnCargarTema() {
  if (!document.getElementById("gwu-theme") && !document.querySelector('link[href*="gwu-theme.css"]')) {
    var link = document.createElement("link");
    link.id = "gwu-theme";
    link.rel = "stylesheet";
    link.href = "../../dist/css/gwu-theme.css?v=" + GWU_VERSION;
    document.head.appendChild(link);
  }
  document.body.classList.add("layout-fixed");
}


//-- Icono de cada menú (por nombre) y de cada pantalla (por archivo)
var ICONOS_MENU = {
  "inicio": "fas fa-home",
  "análisis de mercado": "fas fa-map-marked-alt",
  "integración soa": "fas fa-project-diagram",
  "maestros": "fas fa-boxes",
  "seguridad": "fas fa-user-shield"
};
var ICONOS_PANTALLA = {
  "principal": "fas fa-tachometer-alt",
  "analisis-zona": "fas fa-search-location",
  "comparar-zonas": "fas fa-balance-scale",
  "consulta-ruc": "fas fa-building",
  "historial": "fas fa-history",
  "bitacora": "fas fa-stream",
  "multitabla": "fas fa-table",
  "usuario": "fas fa-users",
  "rol": "fas fa-id-badge",
  "menu": "fas fa-bars",
  "acceso": "fas fa-key",
  "apariencia": "fas fa-palette"
};
//-- Pantallas hijas que deben marcar como activa a su listado
var PANTALLA_PADRE = {};

function fnNombreArchivo(path) {
  var archivo = String(path || "").split("?")[0].split("/").pop();
  return archivo.replace(/\.html$/i, "");
}

function fnPantallaActual() {
  var actual = fnNombreArchivo(window.location.pathname);
  actual = actual.replace(/^(nuevo|nueva|editar)-/, "");
  return PANTALLA_PADRE[actual] || actual;
}

function fnTexto(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


function fnListarAccesoRol() {
  var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion")) || {};
  var html = "";

  var respuesta = JSON.parse(localStorage.getItem("accesos"));
  if (respuesta == null || respuesta.lista == null) { respuesta = { lista: [] }; }
  //-- tipo 'A' = acción (botón), no va en el menú
  //-- flkactivo = false: pantalla registrada pero aún no construida (o menú desactivado)
  var listaPantallas = respuesta.lista.filter(function (item) {
    return item.tipo != 'A' && item.flkactivo !== false && item.path;
  });

  //-- menús en el orden en que llegan (el back los ordena por menu.orden y acceso.orden)
  var menus = [];
  $.each(listaPantallas, function (i, item) {
    if (menus.indexOf(item.nombreMenu) === -1) menus.push(item.nombreMenu);
  });

  var actual = fnPantallaActual();
  var ul = "";

  $.each(menus, function (i, nombreMenu) {
    var li = "";
    var total = 0;
    var grupoActivo = false;

    $.each(listaPantallas, function (j, item) {
      if (item.nombreMenu != nombreMenu) return;
      var archivo = fnNombreArchivo(item.path);
      if (archivo == "principal") return; //-- ya está como "Página Principal" fijo arriba
      var activo = archivo == actual;
      if (activo) grupoActivo = true;
      total++;
      li +=
        '<li class="nav-item">' +
          '<a href="../..' + fnTexto(item.path) + '" class="nav-link' + (activo ? ' active' : '') + '">' +
            '<i class="' + (ICONOS_PANTALLA[archivo] || 'far fa-circle') + ' nav-icon"></i>' +
            '<p>' + fnTexto(item.nombreAcceso) + '</p>' +
          '</a>' +
        '</li>';
    });

    if (total === 0) return; //-- menú sin pantallas visibles: no se dibuja

    var icono = ICONOS_MENU[String(nombreMenu).toLowerCase()] || "fas fa-folder";
    //-- cada grupo se cierra con su </li>; antes quedaba abierto y los grupos se anidaban
    ul +=
      '<li class="nav-item' + (grupoActivo ? ' menu-open' : '') + '">' +
        '<a href="#" class="nav-link">' +
          '<i class="nav-icon ' + icono + '"></i>' +
          '<p>' + fnTexto(nombreMenu) +
            '<i class="right fas fa-angle-left"></i>' +
            '<span class="right gwu-contador">' + total + '</span>' +
          '</p>' +
        '</a>' +
        '<ul class="nav nav-treeview"' + (grupoActivo ? '' : ' style="display: none;"') + '>' +
          li +
        '</ul>' +
      '</li>';
  });

  //-- nombre corto (primer nombre + primer apellido); el completo queda en el title
  var nombreCompleto = usuarioSesion.nombreUsuario || usuarioSesion.codigoUsuario || "Usuario";
  var nombre = usuarioSesion.nombreCorto || nombreCompleto;
  //-- la foto ya guardada en el navegador se pinta de inmediato; si no hay, iniciales (y se pide en fnActivarFotoUsuario)
  var foto = (typeof fnCommon !== "undefined" && fnCommon.fotoUsuarioGuardada) ? fnCommon.fotoUsuarioGuardada() : null;
  var iniciales = String(nombre).trim().split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join("").toUpperCase();

  html = `
    <aside class="main-sidebar sidebar-dark-primary elevation-4">

      <!-- Brand Logo -->
      <a href="../seguridad/principal.html" class="brand-link">
        <img src="../../dist/img/marketdata-logo.svg" alt="MarketData Perú" class="brand-image elevation-3" style="opacity: 1; border-radius: 8px;">
        <span class="brand-text font-weight-light">
          <b>Market<span>Data</span></b> Perú
        </span>
      </a>

      <!-- Sidebar -->
      <div class="sidebar">

        <!-- Usuario conectado -->
        <div class="user-panel mt-3 pb-3 mb-2 d-flex align-items-center">
          <div class="image pl-1" id="gwuFotoUsuario" title="Cambiar mi foto">
            ` + (foto ? '<img class="gwu-foto" alt="' + fnTexto(nombre) + '" src="' + foto + '">' : '<div class="gwu-avatar">' + fnTexto(iniciales) + '</div>') + `
            <span class="gwu-camara"><i class="fas fa-camera"></i></span>
            <input type="file" id="gwuArchivoFoto" accept="image/*" style="display: none;">
          </div>
          <div class="info">
            <a href="../cuenta/perfil.html" class="d-block" title="Mi perfil: ` + fnTexto(nombreCompleto) + `">` + fnTexto(nombre) + `</a>
            <small title="Rol"><i class="fas fa-circle"></i> ` + (usuarioSesion.nombreRol ? fnTexto(usuarioSesion.nombreRol.charAt(0) + usuarioSesion.nombreRol.slice(1).toLowerCase()) : "En l&iacute;nea") + `</small>
          </div>
        </div>

        <!-- Sidebar Menu -->
        <nav class="mt-2">
          <ul class="nav nav-pills nav-sidebar flex-column nav-child-indent" data-widget="treeview" id='menu' role="menu" data-accordion="true">
            <li class="nav-item">
              <a href="../seguridad/principal.html" class="nav-link` + (actual == "principal" ? " active" : "") + `">
                <i class="nav-icon fas fa-home"></i>
                <p> P&aacute;gina Principal </p>
              </a>
            </li>
            <li class="nav-header">M&Oacute;DULOS</li>
          `+
            ul
          +
          `
          </ul>
        </nav>
        <!-- /.sidebar-menu -->

      </div>
      <!-- /.sidebar -->

    </aside>
  `;

  return html;
}

/**
 * Foto del usuario en el menú: si el back dice que tiene foto y no está guardada en el navegador, se pide una vez.
 * Clic en la foto o en las iniciales = cambiar mi foto (se achica en el navegador antes de subirla).
 */
function fnActivarFotoUsuario(raiz) {
  if (typeof fnCommon === "undefined" || !fnCommon.cargarFotoUsuario) return;
  var pintar = function (datos) {
    var cont = raiz.querySelector("#gwuFotoUsuario");
    if (!cont || !datos) return;
    var actual = cont.querySelector(".gwu-avatar, .gwu-foto");
    var img = document.createElement("img");
    img.className = "gwu-foto";
    img.alt = "Foto";
    img.src = datos;
    if (actual) actual.replaceWith(img);
  };
  if (!fnCommon.fotoUsuarioGuardada()) fnCommon.cargarFotoUsuario(pintar);
  window.gwuPintarFotoMenu = pintar; //-- Mi perfil la usa al cambiar la foto

  var cont = raiz.querySelector("#gwuFotoUsuario");
  var archivo = raiz.querySelector("#gwuArchivoFoto");
  if (!cont || !archivo) return;
  cont.addEventListener("click", function (e) { if (e.target !== archivo) archivo.click(); });
  archivo.addEventListener("change", function () {
    if (!archivo.files || !archivo.files[0]) return;
    fnCommon.cambiarMiFoto(archivo.files[0], function (respuesta) {
      archivo.value = "";
      if (respuesta.codigoRespuesta == "01") {
        fnCommon.cargarFotoUsuario(pintar);
        if (typeof Swal !== "undefined") Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Foto actualizada", showConfirmButton: false, timer: 2000 });
      } else if (typeof Swal !== "undefined") {
        Swal.fire(respuesta.mensajeRespuesta || "No se pudo guardar la foto", "", "error");
      }
    });
  });
}

customElements.define('aside-component', Aside);
