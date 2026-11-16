
history.pushState(null, null, location.href);
window.onpopstate = function () {
    history.go(1);
};


/**
 * Obtener todos los valores de los campos del formulario como objeto JSON
 * 
 * @returns {String}
 */
$.fn.serializeObject = function () {
    var disabledInput = this.find(':input:disabled').removeAttr('disabled');

    var o = {};
    var a = this.serializeArray();

    disabledInput.attr('disabled', 'disabled');

    $.each(a, function () {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

var fnCommon = function () {

    //-- CONSTANTES
    //--------------------------------------------------------------------------

    var NOTIFICACION_EXITO = "success";
    var NOTIFICACION_ERROR = "danger";
    var NOTIFICACION_INFO = "info";

    //-- URL del back: se lee de dist/js/config.json (un archivo por ambiente: dev, pruebas, producción).
    //-- Si no se puede leer, se usa este valor por defecto.
    var URL_BACK = leerConfiguracion().URL_BACK || "http://localhost:8081/marketdata-api";

    //-- Multitabla (marketdata_db.multitabla.codigo_tabla)
    var MT_DEPARTAMENTO = "001";
    var MT_PROVINCIA = "002";
    var MT_DISTRITO = "003";
    var MT_TIPO_DOCUMENTO = "004";
    var MT_MONEDA = "005";
    var MT_PAIS = "006";
    var MT_PARAMETRO_GENERAL = "031";
    //-- Catálogos de MarketData: textos, colores y explicación de cada código (Maestros > Multitabla)
    var MT_SECTOR_ECONOMICO = "033";
    var MT_ESTADO_CONTRIBUYENTE = "034";
    var MT_CONDICION_DOMICILIO = "035";
    var MT_NIVEL_ATRACTIVO = "036";
    var MT_ORIGEN_DATO = "037";
    var MT_ESTADO_ANALISIS = "038";

    var PARAM_GENERAL_ESTADO_LECTURA = 1;
    var PARAM_GENERAL_ESTADO_CRUD_MODIF_VALOR = 2;
    var PARAM_GENERAL_ESTADO_CRUD_MODIF_VALOR_VALAUX = 3;
    var PARAM_GENERAL_ESTADO_MODIF_VALOR = 4;
    var PARAM_GENERAL_ESTADO_MODIF_VALAUX = 5;

    var DATE_REGEX = /^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)\d{4}$/i; //-- dd/mm/yyyy: https://www.regextester.com/99555

    // -- PARA TIPO DE ROL
    var ROL_ADMINISTRADOR = "1";
    var ROL_USUARIO = "2";


    //-- FUNCIONES
    //--------------------------------------------------------------------------

    /**
     * Funcion que limpia todos los campos de un formulario
     * 
     * @param form
     */
    function fnLimpiarFormulario(form) {

        //-- Itera todos los elementos inputs del formulario que se mapean	
        $(':input', form).each(function () {

            var type = this.type;
            var tag = this.tagName.toLowerCase(); // normalize case

            //-- Limpiar: text inputs, password inputs y textareas
            if (['text', 'password', 'number', 'email', 'date', 'tel', 'search', 'url', 'file'].indexOf(type) != -1 || tag == 'textarea') {
                this.value = "";
            }

            //-- Limpiar: checkboxes y radios se necesita tener su check status limpio
            else if (type == 'checkbox' || type == 'radio') {
                this.checked = false;
            }

            //-- Limpiar: select (trabaj con select simples y multiples)
            else if (tag == 'select') {
                this.selectedIndex = 0;
            }

        });

    };

    /**
     * Mover a una seccion de la pagina con animacion
     * 
     * @param id
     */
    function scrollTo(id) {
        $('html,body').animate({
            scrollTop: $("#" + id).offset().top
        }, 'slow');
    }

    /**
     * Muestra mensaje en una notificacion basado en Boostrap Alert. Finalidad del metodo, es mostrar notificaciones en la parte superior
     * derecha que esten por un tiempo minimo indicando una accion del sistema. Lo unico que se hace es colocar el metodo presente y listo se visualizara
     * la notificacion cada vez que se llame al metodo
     *  
     * @param textMensaje
     * @param tipoMensaje
     */
    function mostrarMensajeFlotante(textMensaje, tipoMensaje) {
        $.notify(
            {
                message: textMensaje
            }, 
            {
                type: tipoMensaje,
                delay: tipoMensaje=="danger"?10000:5000,
                allow_dismiss: false,
                placement: {
                    from: "top",
                    align: "right"
                },
            }
        );
    }
    
    /**
     * Metodo que coloca todos los campos de un formulario en solo lectura
     * @param id
     */
    function obtenerCamposSoloLectura(id) {
        $.each($(id).serializeArray(), function (index, value) {
            $('[name="' + value.name + '"]').attr('readonly', 'readonly');
        });
    }

    /**
     * Respuesta estandar cuando la peticion falla (HTTP != 2xx).
     * 401/403 = token invalido o expirado -> cierra la sesion.
     *
     * @param respuesta - objeto jqXHR del error
     */
    function respuestaError(respuesta) {
        if (respuesta.status == 401 || respuesta.status == 403) {
            opcionesEstaticas(2);
            return { "mensajeRespuesta": "Sesión expirada. Vuelva a ingresar.", "codigoRespuesta": "99" };
        }
        if (respuesta.status == 404) {
            return { "mensajeRespuesta": "El recurso solicitado no existe (HTTP: 404).", "codigoRespuesta": "99" };
        }
        if (respuesta.status == 0) {
            return { "mensajeRespuesta": "No hay conexión con el servidor (" + URL_BACK + ").", "codigoRespuesta": "99" };
        }
        if (respuesta.responseJSON && respuesta.responseJSON.mensajeRespuesta) {
            return respuesta.responseJSON;
        }
        return { "mensajeRespuesta": "Error no identificado (HTTP: " + respuesta.status + ").", "codigoRespuesta": "99" };
    }

    /**
     * true si la respuesta del back indica token expirado
     */
    function esTokenExpirado(respuesta) {
        return respuesta != null && respuesta.codigoRespuesta == "99"
            && typeof respuesta.mensajeRespuesta == "string"
            && respuesta.mensajeRespuesta.indexOf("Expirado") != -1;
    }

    /**
     * Componente que permite realizar peticiones de tipo Ajax al servidor.
     * 
     * @param {string}
     *            metodoEnv - Metodo de envio. Puede ser POST, GET, PUT, DELETE
     * @param {string}
     *            direccionUrl - Url del controlador que gestionara la peticion.
     * @param {string}
     *            jsonString - Objeto en formato Json que contiene los datos de la
     *            peticion.
     * @param {callback}
     *            callback - Nombre de la funcion que se ejecutara al finalizar el
     *            proceso. De indicarse null, se omite su uso.
     */
    function consultarAjax(metodoEnv, direccionUrl, jsonString, callback) {

        $.ajax({
            type: metodoEnv,
            data: jsonString,
            async: true,
            url: direccionUrl,
            contentType: "application/json",
            success: function (respuesta) {
                callback(respuesta);
            },
            error: function (respuesta) {
                callback(respuestaError(respuesta));
            }
        });
    }

    /**
     * Componente que permite realizar peticiones de tipo Ajax al servidor.
     * 
     * @param {object}
     *            usuarioSesion - Objeto localStorage de la sesion usuario
     * @param {string}
     *            metodoEnv - Metodo de envio. Puede ser POST, GET, PUT, DELETE
     * @param {string}
     *            direccionUrl - Url del controlador que gestionara la peticion.
     * @param {string}
     *            jsonString - Objeto en formato Json que contiene los datos de la
     *            peticion.
     * @param {callback}
     *            callback - Nombre de la funcion que se ejecutara al finalizar el
     *            proceso. De indicarse null, se omite su uso.
     */
    function consultarAjaxJWT(usuarioSesion, metodoEnv, direccionUrl, jsonString, callback) {

        $.ajax({
            type: "GET",
            data: null,
            async: true,
            url: fnCommon.URL_BACK+"/api/v1/usuarios/refreshToken",
            contentType: "application/json",
            headers: {
                "Authorization": ("Bearer "+ usuarioSesion.jwtToken)
            },
            success: function (respuesta) {

                //-- Actualizar JWT y localStorage
                localStorage.removeItem("usuarioSesion");

                respuesta.codigoUsuario = usuarioSesion.codigoUsuario; //-- TODO: se pone estos atributos pq hoy el refreshToken no devuelve estos atributos llenos
                respuesta.nombreUsuario = usuarioSesion.nombreUsuario;
                respuesta.tiempoMinuto = usuarioSesion.tiempoMinuto;
                //respuesta.modulos = usuarioSesion.modulos;
                respuesta.rol = usuarioSesion.rol;
                conservarDatosSesion(usuarioSesion, respuesta);

                localStorage.setItem("usuarioSesion", JSON.stringify(respuesta));
                usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
                // console.log("usuarioSesion - refreshToken= " +  localStorage.getItem("usuarioSesion") );

                //-- AJAX con el JWT renovado
                $.ajax({
                    type: metodoEnv,
                    data: jsonString,
                    async: true,
                    url: direccionUrl,
                    contentType: "application/json",
                    headers: {
                        "Authorization": ("Bearer "+ usuarioSesion.jwtToken)
                    },
                    success: function (respuesta) {
                        if (esTokenExpirado(respuesta)) {
                            fnCommon.opcionesEstaticas(2);
                        }
                        callback(respuesta);
                    },
                    error: function (respuesta) {
                        callback(respuestaError(respuesta));
                    }
                });

            },
            error: function (respuesta) {
                if (respuesta.status == 401 || respuesta.status == 403) {
                    opcionesEstaticas(2);
                }
                callback({
                    "mensajeRespuesta": "No se pudo renovar la sesión (refreshToken).",
                    "codigoRespuesta": "99"
                });
            }
        });

       
    }

    function consultarAjaxJWTSincrono(usuarioSesion, metodoEnv, direccionUrl, jsonString, callback) {

        $.ajax({
            type: "GET",
            data: null,
            async: false,
            url: fnCommon.URL_BACK+"/api/v1/usuarios/refreshToken",
            contentType: "application/json",
            headers: {
                "Authorization": ("Bearer "+ usuarioSesion.jwtToken)
            },
            success: function (respuesta) {

                //-- Actualizar JWT y localStorage
                localStorage.removeItem("usuarioSesion");

                respuesta.codigoUsuario = usuarioSesion.codigoUsuario; //-- TODO: se pone estos atributos pq hoy el refreshToken no devuelve estos atributos llenos
                respuesta.nombreUsuario = usuarioSesion.nombreUsuario;
                respuesta.tiempoMinuto = usuarioSesion.tiempoMinuto;
                //respuesta.modulos = usuarioSesion.modulos;
                respuesta.rol = usuarioSesion.rol;
                conservarDatosSesion(usuarioSesion, respuesta);

                localStorage.setItem("usuarioSesion", JSON.stringify(respuesta));
                usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
                // console.log("usuarioSesion - refreshToken= " +  localStorage.getItem("usuarioSesion") );

                //-- AJAX con el JWT renovado
                $.ajax({
                    type: metodoEnv,
                    data: jsonString,
                    async: false,
                    url: direccionUrl,
                    contentType: "application/json",
                    headers: {
                        "Authorization": ("Bearer "+ usuarioSesion.jwtToken)
                    },
                    success: function (respuesta) {
                        if (esTokenExpirado(respuesta)) {
                            fnCommon.opcionesEstaticas(2);
                        }
                        callback(respuesta);
                    },
                    error: function (respuesta) {
                        callback(respuestaError(respuesta));
                    }
                });

            },
            error: function (respuesta) {
                if (respuesta.status == 401 || respuesta.status == 403) {
                    opcionesEstaticas(2);
                }
                callback({
                    "mensajeRespuesta": "No se pudo renovar la sesión (refreshToken).",
                    "codigoRespuesta": "99"
                });
            }
        });

       
    }

    function consultarAjaxNotJWT( metodoEnv, direccionUrl, jsonString, callback) {

        $.ajax({
            type: metodoEnv,
            data: jsonString,
            async: true,
            url: direccionUrl,
            contentType: "application/json",
        
            success: function (respuesta) {
                if (esTokenExpirado(respuesta)) {
                    fnCommon.opcionesEstaticas(2);
                }
                callback(respuesta);
            },
            error: function (respuesta) {
                callback(respuestaError(respuesta));
            }
        });

       
    }

    function consultarAjaxFile(usuarioSesion, metodoEnv, direccionUrl, jsonString, callback) {

        $.ajax({
            type: "GET",
            data: null,
            async: true,
            url: fnCommon.URL_BACK+"/api/v1/usuarios/refreshToken",
            contentType: "application/json",
            headers: {
                "Authorization": ("Bearer "+ usuarioSesion.jwtToken)
            },
            success: function (respuesta) {

                //-- Actualizar JWT y localStorage
                localStorage.removeItem("usuarioSesion");

                respuesta.codigoUsuario = usuarioSesion.codigoUsuario; //-- TODO: se pone estos atributos pq hoy el refreshToken no devuelve estos atributos llenos
                respuesta.nombreUsuario = usuarioSesion.nombreUsuario;
                respuesta.tiempoMinuto = usuarioSesion.tiempoMinuto;
                //respuesta.modulos = usuarioSesion.modulos;
                respuesta.rol = usuarioSesion.rol;
                conservarDatosSesion(usuarioSesion, respuesta);

                localStorage.setItem("usuarioSesion", JSON.stringify(respuesta));
                usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
                // console.log("usuarioSesion - refreshToken= " +  localStorage.getItem("usuarioSesion") );

                //-- AJAX con el JWT renovado
                $.ajax({
                    type: metodoEnv,
                    data: jsonString,
                    async: true,
                    url: direccionUrl,
                    processData: false,
                    contentType: false,
                    headers: {
                        "Authorization": ("Bearer "+ usuarioSesion.jwtToken)
                    },
                    success: function (respuesta) {
                        if (esTokenExpirado(respuesta)) {
                            fnCommon.opcionesEstaticas(2);
                        }
                        callback(respuesta);
                    },
                    error: function (respuesta) {
                        callback(respuestaError(respuesta));
                    }
                });

            },
            error: function (respuesta) {
                if (respuesta.status == 401 || respuesta.status == 403) {
                    opcionesEstaticas(2);
                }
                callback({
                    "mensajeRespuesta": "No se pudo renovar la sesión (refreshToken).",
                    "codigoRespuesta": "99"
                });
            }
        });

       
    }

	/**
	 * Obtener el contexto de la aplicacion. Ejemplo: /chat-web
	 * Esto es para evitar usar jstl -> ${pageContext.servletContext.contextPath}
	 */
    function getCtx() {
        //-- Funciona si Live Server se abre en gwu-front (/pages/...) o en la carpeta padre (/gwu-front/pages/...)
        var ruta = window.location.pathname;
        var i = ruta.indexOf("/pages/");
        return i >= 0 ? ruta.substring(0, i) : "";
    }

    /**
     * Navegar a una ruta registrada en la tabla acceso (ej: /pages/almacen/movimiento.html)
     *
     * @param {string} path
     */
    function irA(path) {
        window.location.replace(getCtx() + path);
    }

    /**
     * Obtener las opciones del menu que son estáticas y NO van a cambiar 
     * 
     * @param {integer} tipo 
     */
    function opcionesEstaticas(tipo) {
        if( tipo == 1 ) { //-- menu principal
            return window.location.replace(fnCommon.getCtx()+'/pages/seguridad/principal.html');
        } else if(tipo == 2) { //-- sign-out
            localStorage.removeItem("usuarioSesion"); 
            return window.location.replace(fnCommon.getCtx()+'/pages/seguridad/login.html');
        } else if(tipo == 3) { //-- configuraciones/Usuarios
            return window.location.replace(fnCommon.getCtx()+'/pages/seguridad/usuario.html');
        } else if(tipo == 4) { //-- configuraciones/Usuarios
            return window.location.replace(fnCommon.getCtx()+'/pages/seguridad/rol.html');
        } else if(tipo == 13) { //-- seguridad/Menús
            return window.location.replace(fnCommon.getCtx()+'/pages/seguridad/menu.html');
        } else if(tipo == 14) { //-- seguridad/Accesos
            return window.location.replace(fnCommon.getCtx()+'/pages/seguridad/acceso.html');
        } else if(tipo == 30) { //-- marketdata/Análisis de zona
            return window.location.replace(fnCommon.getCtx()+'/pages/marketdata/analisis-zona.html');
        }

    }

    /**
     * Obtener los datos del usuario en sesión y sus opciones menús
     * 
     * @param {object} usuarioSesion 
     */
    function inicializarSesion(usuarioSesion) {
        // console.log("inicializarSesion - usuarioSesion = " + JSON.stringify(usuarioSesion) );

        //-- Si se intenta ingresar x URL a la opción sin loguearse
        if (usuarioSesion == null) {
            window.location.replace(fnCommon.getCtx()+"/pages/seguridad/login.html");
            return;
        }

        //-- Nombre del usuario en sesión
        //-- ---------------------------------------------------------------        
        $("#nombreUsuario").html(
            usuarioSesion.codigoUsuario + " - " + usuarioSesion.nombreUsuario
        );

    }

    /**
     * Obtener parametros desde la URL
     * 
     * @param {string} name 
     */
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    function mensajeAlerta(mensaje, campoId) {

        //-- mensaje
        alert(mensaje);
        $(".preloader").fadeOut();

        //--  Capturar la posición del elemento
        var offset = $(campoId).offset();

        //-- Dirigir hacia el elemento 
        $('html,body').animate(
            {
                scrollTop: offset.top
            },
            {
                duration: "slow"
            }
        );

        return;
    } 

    /**
     * Obtener el dia actual en formato dd/mm/yyyy
     * @returns {String}
     */
    function obtenerDiaActual(){
        var fullDate = new Date();
        var twoDigitDate = String(fullDate.getDate()).padStart(2, '0');
        var twoDigitMonth = String(fullDate.getMonth() + 1).padStart(2, '0');
        return twoDigitDate + "/" + twoDigitMonth + "/" + fullDate.getFullYear();
    }

    /**
     * Fecha de hoy en formato yyyy-mm-dd (para input type="date")
     */
    function obtenerDiaActualISO() {
        var d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
    }

    /**
     * Formatear fecha del back (yyyy-mm-dd o yyyy-mm-ddThh:mm:ss) a dd/mm/yyyy [hh:mm]
     */
    function formatoFecha(valor, conHora) {
        if (valor == null || valor == "") return "";
        //-- fecha-hora del back en UTC ("2026-10-03T16:21:00.000Z"): se muestra en la hora local (Lima)
        if (/T\d{2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/.test(String(valor))) {
            var d = new Date(valor);
            if (!isNaN(d.getTime())) {
                var dos = function (n) { return (n < 10 ? "0" : "") + n; };
                var local = dos(d.getDate()) + "/" + dos(d.getMonth() + 1) + "/" + d.getFullYear();
                return conHora ? local + " " + dos(d.getHours()) + ":" + dos(d.getMinutes()) : local;
            }
        }
        var t = String(valor).replace("T", " ");
        var f = t.substring(0, 10).split("-");
        var texto = f[2] + "/" + f[1] + "/" + f[0];
        return conHora && t.length >= 16 ? texto + " " + t.substring(11, 16) : texto;
    }

    /**
     * Formatear monto: 1234.5 -> "1,234.50"
     */
    function formatoMoneda(valor) {
        var n = Number(valor || 0);
        return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Formatear número entero o con decimales: 1234567.8 -> "1,234,567.8"
     */
    function formatoNumero(valor, decimales) {
        if (valor === null || valor === undefined || valor === "") return "-";
        var n = Number(valor);
        if (isNaN(n)) return "-";
        return n.toLocaleString("es-PE", { minimumFractionDigits: decimales || 0, maximumFractionDigits: decimales || 0 });
    }

    /**
     * Escapar texto antes de concatenarlo en HTML (evita romper la tabla con comillas o <)
     */
    function escaparHtml(texto) {
        if (texto == null) return "";
        return String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /**
     * true si el rol del usuario tiene la accion (acceso tipo 'A', path = codigo)
     * Usa la lista guardada en localStorage("accesos") al hacer login.
     *
     * @param {string} codigoAccion - ej: "AJUSTE_APROBAR"
     */
    function tienePermiso(codigoAccion) {
        var accesos = JSON.parse(localStorage.getItem("accesos"));
        if (accesos == null || accesos.lista == null) return false;
        return accesos.lista.some(function (item) { return item.path == codigoAccion; });
    }

    /**
     * Llenar un <select> con una lista de la multitabla
     *
     * @param {string} selector     - ej: "#idDistrito"
     * @param {string} codigoTabla  - ej: fnCommon.MT_DISTRITO
     * @param {string} codigoPadre  - opcional, ej: "1501" para distritos de Lima
     * @param {*} valorSeleccionado - opcional, id_multitabla a dejar seleccionado
     */
    function cargarMultitabla(selector, codigoTabla, codigoPadre, valorSeleccionado) {
        var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
        var url = URL_BACK + "/api/v1/multitabla/listados/" + codigoTabla + (codigoPadre ? "?codigoPadre=" + codigoPadre : "");
        consultarAjaxJWT(usuarioSesion, "GET", url, null, function (respuesta) {
            var $select = $(selector);
            $select.empty().append('<option value="">-- Seleccione --</option>');
            if (respuesta.codigoRespuesta == "01") {
                $.each(respuesta.listados, function (i, item) {
                    $select.append('<option value="' + item.idMultitabla + '" data-codigo="' + escaparHtml(item.codigo) + '">' + escaparHtml(item.valor) + '</option>');
                });
                if (valorSeleccionado != null) $select.val(valorSeleccionado).trigger("change");
            }
        });
    }


    /**
     * Llenar un <select> desde un servicio que devuelve { codigoRespuesta, listados: [...] }
     *
     * @param {string} selector    - ej: "#idAlmacen"
     * @param {string} url         - URL completa del servicio
     * @param {string} campoValor  - ej: "idAlmacen"
     * @param {function|string} campoTexto - ej: "nombre" o function(item){ return item.codigo + ' - ' + item.nombre; }
     * @param {function} alTerminar - opcional, se ejecuta con la lista cargada
     */
    function cargarCombo(selector, url, campoValor, campoTexto, alTerminar) {
        var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
        consultarAjaxJWT(usuarioSesion, "GET", url, null, function (respuesta) {
            var $select = $(selector);
            $select.empty().append('<option value="">-- Seleccione --</option>');
            var lista = respuesta.codigoRespuesta == "01" ? (respuesta.listados || []) : [];
            $.each(lista, function (i, item) {
                var texto = typeof campoTexto == "function" ? campoTexto(item) : item[campoTexto];
                $select.append('<option value="' + escaparHtml(item[campoValor]) + '">' + escaparHtml(texto) + '</option>');
            });
            if (respuesta.codigoRespuesta != "01") {
                mostrarError(respuesta);
            }
            if (alTerminar) alTerminar(lista);
        });
    }

    /**
     * DataTable con la configuracion estandar del proyecto
     */
    function crearTabla(selector, columns, columnDefs, opciones) {
        return $(selector).DataTable($.extend({
            "paging": true,
            "lengthChange": true,
            "searching": true,
            "ordering": false,
            "info": true,
            "autoWidth": false,
            "responsive": true,
            "language": { url: "../../plugins/datatables/Spanish.json" },
            "columns": columns,
            "columnDefs": columnDefs || []
        }, opciones || {}));
    }

    /**
     * Mostrar el mensaje de error del back con SweetAlert2
     */
    function mostrarError(respuesta) {
        Swal.fire(respuesta && respuesta.mensajeRespuesta ? respuesta.mensajeRespuesta : "Error no identificado.", "", "error");
        $(".preloader").fadeOut();
    }

    /**
     * Badge de color segun el estado (movimientos, unidades, garantias, inventarios)
     */
    /**
     * Badge de color según el estado. El texto y el color salen de la multitabla
     * (catálogos 034-038: valor = texto, valor_aux = color). Si el código no está, se muestra tal cual.
     * @param {string} codigoTabla - opcional, cuando el mismo código existe en varios catálogos
     */
    function badgeEstado(estado, codigoTabla) {
        if (estado == null || estado === "") return "";
        var item = itemCatalogo(estado, codigoTabla);
        var color = item && item.valorAux ? item.valorAux : "light";
        var texto = item ? item.valor : String(estado).replace(/_/g, " ");
        var ayuda = item && item.valorAux2 ? ' title="' + escaparHtml(item.valorAux2) + '"' : "";
        return '<span class="badge badge-' + escaparHtml(color) + '"' + ayuda + '>' + escaparHtml(texto) + '</span>';
    }

    /**
     * Lee dist/js/config.json (sincrono, una sola vez al cargar common.js).
     * Ejemplo de config.json: { "URL_BACK": "http://192.168.0.10:8081/gwu-admin" }
     */
    function leerConfiguracion() {
        try {
            var actual = document.currentScript ? document.currentScript.src : "";
            var url = actual ? actual.replace(/pages\/common\/common\.js.*$/, "config.json") : "";
            if (!url) return {};
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url + "?v=" + new Date().getTime(), false);
            xhr.send(null);
            return xhr.status == 200 ? JSON.parse(xhr.responseText) : {};
        } catch (e) {
            return {};
        }
    }

    //-- CATALOGOS (multitabla) ------------------------------------------------
    var CLAVE_CATALOGOS = "catalogos";
    var VIGENCIA_CATALOGOS_MS = 30 * 60 * 1000;   //-- se vuelven a pedir cada 30 minutos
    var catalogosMemoria = null;
    //-- orden de búsqueda cuando no se indica la tabla de un código (ej. badgeEstado("ANULADO"))
    var TABLAS_ESTADO = ["038", "036", "037", "034", "035"];

    /** Todos los catálogos del sistema { "019": [{codigo, valor, valorAux, valorAux2}], ... } (cache local) */
    function catalogos() {
        if (catalogosMemoria) return catalogosMemoria;
        try {
            var guardado = JSON.parse(localStorage.getItem(CLAVE_CATALOGOS));
            if (guardado && guardado.datos && (new Date().getTime() - guardado.fecha) < VIGENCIA_CATALOGOS_MS) {
                catalogosMemoria = guardado.datos;
                return catalogosMemoria;
            }
        } catch (e) { }
        var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
        if (usuarioSesion == null) return {};
        consultarAjaxJWTSincrono(usuarioSesion, "GET", URL_BACK + "/api/v1/multitabla/catalogos", null, function (respuesta) {
            if (respuesta.codigoRespuesta == "01") {
                catalogosMemoria = respuesta.catalogos || {};
                localStorage.setItem(CLAVE_CATALOGOS, JSON.stringify({ fecha: new Date().getTime(), datos: catalogosMemoria }));
            }
        });
        return catalogosMemoria || {};
    }

    /** Se llama al editar la multitabla para que todas las pantallas lean los textos nuevos */
    function limpiarCatalogos() {
        catalogosMemoria = null;
        localStorage.removeItem(CLAVE_CATALOGOS);
    }

    /** Busca un código en un catálogo (o en los catálogos de estados si no se indica la tabla) */
    function itemCatalogo(codigo, codigoTabla) {
        var todos = catalogos();
        var tablas = codigoTabla ? [codigoTabla] : TABLAS_ESTADO;
        for (var i = 0; i < tablas.length; i++) {
            var lista = todos[tablas[i]] || [];
            for (var j = 0; j < lista.length; j++) {
                if (lista[j].codigo == codigo) return lista[j];
            }
        }
        return null;
    }

    /** Texto que ve el usuario para un código (ej. "PENDIENTE_APROBACION" -> "Pendiente de aprobación") */
    function textoCatalogo(codigo, codigoTabla) {
        var item = itemCatalogo(codigo, codigoTabla);
        return item ? item.valor : (codigo == null ? "" : String(codigo).replace(/_/g, " "));
    }

    /**
     * Llena un <select> con un catálogo: value = código, texto = valor
     * @param {string} textoVacio - opcional: primera opción vacía ("Todos", "-- Seleccione --"); null = sin opción vacía
     */
    function llenarCatalogo(selector, codigoTabla, textoVacio, valorSeleccionado) {
        var $select = $(selector).empty();
        if (textoVacio != null) $select.append('<option value="">' + escaparHtml(textoVacio) + '</option>');
        $.each(catalogos()[codigoTabla] || [], function (i, item) {
            $select.append('<option value="' + escaparHtml(item.codigo) + '" title="' + escaparHtml(item.valorAux2 || "") + '">' + escaparHtml(item.valor) + '</option>');
        });
        if (valorSeleccionado != null) $select.val(valorSeleccionado);
        return $select;
    }

    /**
     * Descarga un archivo del back (ej. etiquetas en Word) renovando el JWT como consultarAjaxJWT.
     * Si el back responde JSON es un error ("99") y se pasa al callback.
     */
    function descargarArchivoJWT(usuarioSesion, metodoEnv, direccionUrl, jsonString, nombrePorDefecto, callback) {
        //-- 1. renovar el JWT (igual que consultarAjaxJWT)
        $.ajax({
            type: "GET",
            url: URL_BACK + "/api/v1/usuarios/refreshToken",
            contentType: "application/json",
            headers: { "Authorization": "Bearer " + usuarioSesion.jwtToken },
            error: function (respuesta) {
                if (respuesta.status == 401 || respuesta.status == 403) opcionesEstaticas(2);
                if (callback) callback({ codigoRespuesta: "99", mensajeRespuesta: "No se pudo renovar la sesión (refreshToken)." });
            },
            success: function (renovado) {
            renovado.codigoUsuario = usuarioSesion.codigoUsuario;
            renovado.nombreUsuario = usuarioSesion.nombreUsuario;
            renovado.tiempoMinuto = usuarioSesion.tiempoMinuto;
            renovado.rol = usuarioSesion.rol;
            conservarDatosSesion(usuarioSesion, renovado);
            localStorage.setItem("usuarioSesion", JSON.stringify(renovado));
            var sesion = renovado;
            //-- 2. pedir el archivo como blob
            var xhr = new XMLHttpRequest();
            xhr.open(metodoEnv, direccionUrl, true);
            xhr.responseType = "blob";
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + sesion.jwtToken);
            xhr.onload = function () {
                var tipo = xhr.getResponseHeader("Content-Type") || "";
                if (xhr.status != 200 || tipo.indexOf("application/json") == 0) {
                    var lector = new FileReader();
                    lector.onload = function () {
                        var r;
                        try { r = JSON.parse(lector.result); } catch (e) { r = { codigoRespuesta: "99", mensajeRespuesta: "No se pudo generar el archivo (HTTP " + xhr.status + ")" }; }
                        if (callback) callback(r);
                    };
                    lector.readAsText(xhr.response);
                    return;
                }
                var disposicion = xhr.getResponseHeader("Content-Disposition") || "";
                var m = /filename="?([^";]+)"?/.exec(disposicion);
                var enlace = document.createElement("a");
                enlace.href = URL.createObjectURL(xhr.response);
                enlace.download = m ? m[1] : nombrePorDefecto;
                document.body.appendChild(enlace);
                enlace.click();
                setTimeout(function () { URL.revokeObjectURL(enlace.href); enlace.remove(); }, 1000);
                if (callback) callback({ codigoRespuesta: "01" });
            };
            xhr.onerror = function () { if (callback) callback({ codigoRespuesta: "99", mensajeRespuesta: "No hay conexión con el servidor (" + URL_BACK + ")." }); };
            xhr.send(jsonString);
            }
        });
    }

    /** El refreshToken no devuelve los datos del usuario: se copian de la sesión anterior */
    function conservarDatosSesion(anterior, renovado) {
        $.each(["idUsuario", "nombreCorto", "nombreRol", "tieneFoto", "fotoVersion"], function (i, campo) {
            if (renovado[campo] == null && anterior[campo] != null) renovado[campo] = anterior[campo];
        });
    }

    /** Parámetro general (multitabla 031), ej. fnCommon.parametro("ADJUNTO_IMAGEN_PX", 1600) */
    function parametro(codigo, porDefecto) {
        var item = itemCatalogo(codigo, MT_PARAMETRO_GENERAL);
        return item && item.valor !== null && item.valor !== "" ? item.valor : porDefecto;
    }

    /**
     * Achica una imagen en el navegador antes de subirla (menos espacio en el hosting y subidas rápidas por celular).
     * Los PDF y archivos que no son imagen se devuelven tal cual.
     * @param {File} archivo
     * @param {number} ladoMaximo - px del lado más largo
     * @param {function} callback - recibe un Blob/File listo para FormData
     */
    function comprimirImagen(archivo, ladoMaximo, calidad, callback) {
        if (!archivo || !/^image\/(jpeg|png|webp|heic|heif)/.test(archivo.type)) { callback(archivo); return; }
        var lector = new FileReader();
        lector.onload = function () {
            var img = new Image();
            img.onload = function () {
                var escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
                var canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * escala);
                canvas.height = Math.round(img.height * escala);
                var ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(function (blob) {
                    if (!blob || blob.size >= archivo.size) { callback(archivo); return; }
                    var nombre = String(archivo.name || "imagen").replace(/\.[^.]+$/, "") + ".jpg";
                    try { callback(new File([blob], nombre, { type: "image/jpeg" })); } catch (e) { blob.name = nombre; callback(blob); }
                }, "image/jpeg", calidad || 0.8);
            };
            img.onerror = function () { callback(archivo); };
            img.src = lector.result;
        };
        lector.readAsDataURL(archivo);
    }

    //-- FOTO DEL USUARIO EN SESION ---------------------------------------------
    //-- Se pide una vez al back y se guarda en el navegador (unos 20 KB); solo se vuelve a pedir si cambia.
    var CLAVE_FOTO = "fotoUsuario";

    function fotoUsuarioGuardada() {
        var sesion = JSON.parse(localStorage.getItem("usuarioSesion")) || {};
        try {
            var f = JSON.parse(localStorage.getItem(CLAVE_FOTO));
            if (f && f.idUsuario == sesion.idUsuario && f.version == sesion.fotoVersion) return f.datos;
        } catch (e) { }
        return null;
    }

    function cargarFotoUsuario(callback) {
        var sesion = JSON.parse(localStorage.getItem("usuarioSesion"));
        if (!sesion || !sesion.idUsuario || !sesion.tieneFoto) { if (callback) callback(null); return; }
        var guardada = fotoUsuarioGuardada();
        if (guardada) { if (callback) callback(guardada); return; }
        var xhr = new XMLHttpRequest();
        //-- ?v=fotoVersion: con otra versión el navegador no reutiliza la foto anterior que tenía en caché
        xhr.open("GET", URL_BACK + "/api/v1/usuarios/foto/" + sesion.idUsuario + "?v=" + encodeURIComponent(sesion.fotoVersion || ""), true);
        xhr.responseType = "blob";
        xhr.setRequestHeader("Authorization", "Bearer " + sesion.jwtToken);
        xhr.onload = function () {
            if (xhr.status != 200) { if (callback) callback(null); return; }
            var lector = new FileReader();
            lector.onload = function () {
                try { localStorage.setItem(CLAVE_FOTO, JSON.stringify({ idUsuario: sesion.idUsuario, version: sesion.fotoVersion, datos: lector.result })); } catch (e) { }
                if (callback) callback(lector.result);
            };
            lector.readAsDataURL(xhr.response);
        };
        xhr.onerror = function () { if (callback) callback(null); };
        xhr.send(null);
    }

    /** El usuario en sesión cambia su foto (se achica a FOTO_USUARIO_PX antes de subir) */
    function cambiarMiFoto(archivo, callback) {
        var lado = parseInt(parametro("FOTO_USUARIO_PX", 256), 10) || 256;
        comprimirImagen(archivo, lado, 0.82, function (foto) {
            var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
            var form = new FormData();
            form.append("file", foto, foto.name || "foto.jpg");
            consultarAjaxFile(usuarioSesion, "POST", URL_BACK + "/api/v1/usuarios/miFoto", form, function (respuesta) {
                if (respuesta.codigoRespuesta == "01") {
                    var sesion = JSON.parse(localStorage.getItem("usuarioSesion"));
                    sesion.tieneFoto = true;
                    sesion.fotoVersion = respuesta.fotoVersion;
                    localStorage.setItem("usuarioSesion", JSON.stringify(sesion));
                    localStorage.removeItem(CLAVE_FOTO);
                }
                if (callback) callback(respuesta);
            });
        });
    }

    //-- RETURN
    //--------------------------------------------------------------------------
    //-- APARIENCIA (Seguridad > Apariencia) -------------------------------------
    //-- Los colores se guardan en la multitabla 032. Aquí se aplican como variables CSS en <html>
    //-- (gwu-theme.css, nav.html, footer.html y login.html las usan). Se guardan en el navegador
    //-- y se vuelven a pedir cada 5 minutos, así el cambio llega a todos sin recargar el back.
    var CLAVE_APARIENCIA = "apariencia";
    var APARIENCIA_MS = 5 * 60 * 1000;

    function hexRgb(hex) {
        var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ""));
        return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
    }
    function rgba(hex, alfa) { var c = hexRgb(hex); return c ? "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + alfa + ")" : null; }
    function oscurecer(hex, f) { var c = hexRgb(hex); return c ? "rgb(" + Math.round(c[0] * f) + ", " + Math.round(c[1] * f) + ", " + Math.round(c[2] * f) + ")" : null; }

    /** valores = { COLOR_PRINCIPAL: '#2f81f7', ..., LOGIN_FONDO_IMAGEN: 'apariencia/login-1.jpg' } */
    function aplicarApariencia(valores) {
        if (!valores) return;
        var raiz = document.documentElement.style;
        var poner = function (variable, valor) { if (valor) raiz.setProperty(variable, valor); };
        poner("--gwu-rojo", valores.COLOR_PRINCIPAL);
        poner("--gwu-rojo-oscuro", oscurecer(valores.COLOR_PRINCIPAL, 0.8));
        poner("--gwu-rojo-suave", rgba(valores.COLOR_PRINCIPAL, 0.35));
        poner("--gwu-fondo", valores.COLOR_FONDO);
        poner("--gwu-tarjeta", valores.COLOR_TARJETA);
        poner("--gwu-nav", rgba(valores.COLOR_NAV, 0.75));
        poner("--gwu-aside", rgba(valores.COLOR_ASIDE, 0.6));
        poner("--gwu-menu-texto", valores.COLOR_MENU_TEXTO);
        poner("--gwu-menu-activo", valores.COLOR_MENU_ACTIVO);
        poner("--gwu-menu-activo-suave", rgba(valores.COLOR_MENU_ACTIVO, 0.35));
        poner("--gwu-footer", valores.COLOR_FOOTER);
        poner("--gwu-login-fondo", valores.LOGIN_FONDO_COLOR);
        poner("--gwu-login-tarjeta", rgba(valores.LOGIN_TARJETA_COLOR, 0.6));
        if (valores.LOGIN_FONDO_IMAGEN) raiz.setProperty("--gwu-login-imagen", 'url("' + URL_BACK + "/archivos/" + valores.LOGIN_FONDO_IMAGEN + '")');
        else raiz.removeProperty("--gwu-login-imagen");
    }

    function aparienciaGuardada() {
        try { return JSON.parse(localStorage.getItem(CLAVE_APARIENCIA)); } catch (e) { return null; }
    }

    /** Aplica la guardada y, si pasó el tiempo (o forzar), la vuelve a pedir al back (sin token) */
    function cargarApariencia(forzar, callback) {
        var guardada = aparienciaGuardada();
        if (guardada && guardada.valores) aplicarApariencia(guardada.valores);
        if (!forzar && guardada && Date.now() - (guardada.leido || 0) < APARIENCIA_MS) { if (callback) callback(guardada); return; }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", URL_BACK + "/api/v1/apariencia/publica", true);
        xhr.onload = function () {
            try {
                var r = JSON.parse(xhr.responseText);
                if (r.codigoRespuesta == "01") {
                    r.leido = Date.now();
                    try { localStorage.setItem(CLAVE_APARIENCIA, JSON.stringify(r)); } catch (e) { }
                    aplicarApariencia(r.valores);
                    if (callback) callback(r);
                }
            } catch (e) { }
        };
        xhr.send(null);
    }
    cargarApariencia(false);

    return {
        fnLimpiarFormulario:                            fnLimpiarFormulario,
        scrollTo:                                       scrollTo,
        mostrarMensajeFlotante:                         mostrarMensajeFlotante,
        obtenerCamposSoloLectura:                       obtenerCamposSoloLectura,
        consultarAjax:                                  consultarAjax,
        consultarAjaxJWT:                               consultarAjaxJWT,
        consultarAjaxJWTSincrono:                       consultarAjaxJWTSincrono,
        consultarAjaxNotJWT:                            consultarAjaxNotJWT,
        consultarAjaxFile:                              consultarAjaxFile,
        getCtx:                                         getCtx,
        opcionesEstaticas:                              opcionesEstaticas,
        inicializarSesion:                              inicializarSesion,
        getUrlParameter:                                getUrlParameter,
        NOTIFICACION_EXITO:                             NOTIFICACION_EXITO,
        NOTIFICACION_ERROR:                             NOTIFICACION_ERROR,
        NOTIFICACION_INFO:                              NOTIFICACION_INFO,
        URL_BACK:                                       URL_BACK,
        PARAM_GENERAL_ESTADO_LECTURA:                   PARAM_GENERAL_ESTADO_LECTURA,
        PARAM_GENERAL_ESTADO_CRUD_MODIF_VALOR:          PARAM_GENERAL_ESTADO_CRUD_MODIF_VALOR,
        PARAM_GENERAL_ESTADO_CRUD_MODIF_VALOR_VALAUX:   PARAM_GENERAL_ESTADO_CRUD_MODIF_VALOR_VALAUX,
        PARAM_GENERAL_ESTADO_MODIF_VALOR:               PARAM_GENERAL_ESTADO_MODIF_VALOR,
        PARAM_GENERAL_ESTADO_MODIF_VALAUX:              PARAM_GENERAL_ESTADO_MODIF_VALAUX,
        DATE_REGEX:                                     DATE_REGEX,
        ROL_ADMINISTRADOR:                              ROL_ADMINISTRADOR,
        ROL_USUARIO:                                    ROL_USUARIO,
        mensajeAlerta:                                  mensajeAlerta,
        obtenerDiaActual:                               obtenerDiaActual,
        obtenerDiaActualISO:                            obtenerDiaActualISO,
        formatoFecha:                                   formatoFecha,
        formatoMoneda:                                  formatoMoneda,
        escaparHtml:                                    escaparHtml,
        tienePermiso:                                   tienePermiso,
        aplicarApariencia:                              aplicarApariencia,
        cargarApariencia:                               cargarApariencia,
        cargarMultitabla:                               cargarMultitabla,
        irA:                                            irA,
        cargarCombo:                                    cargarCombo,
        crearTabla:                                     crearTabla,
        mostrarError:                                   mostrarError,
        badgeEstado:                                    badgeEstado,
        MT_DEPARTAMENTO:                                MT_DEPARTAMENTO,
        MT_PROVINCIA:                                   MT_PROVINCIA,
        MT_DISTRITO:                                    MT_DISTRITO,
        MT_TIPO_DOCUMENTO:                              MT_TIPO_DOCUMENTO,
        MT_MONEDA:                                      MT_MONEDA,
        MT_PAIS:                                        MT_PAIS,
        MT_PARAMETRO_GENERAL:                           MT_PARAMETRO_GENERAL,
        MT_SECTOR_ECONOMICO:                            MT_SECTOR_ECONOMICO,
        MT_ESTADO_CONTRIBUYENTE:                        MT_ESTADO_CONTRIBUYENTE,
        MT_CONDICION_DOMICILIO:                         MT_CONDICION_DOMICILIO,
        MT_NIVEL_ATRACTIVO:                             MT_NIVEL_ATRACTIVO,
        MT_ORIGEN_DATO:                                 MT_ORIGEN_DATO,
        MT_ESTADO_ANALISIS:                             MT_ESTADO_ANALISIS,
        formatoNumero:                                  formatoNumero,
        catalogos:                                      catalogos,
        limpiarCatalogos:                               limpiarCatalogos,
        itemCatalogo:                                   itemCatalogo,
        textoCatalogo:                                  textoCatalogo,
        llenarCatalogo:                                 llenarCatalogo,
        descargarArchivoJWT:                            descargarArchivoJWT,
        parametro:                                      parametro,
        comprimirImagen:                                comprimirImagen,
        cargarFotoUsuario:                              cargarFotoUsuario,
        fotoUsuarioGuardada:                            fotoUsuarioGuardada,
        cambiarMiFoto:                                  cambiarMiFoto,
        
        
    }

}();