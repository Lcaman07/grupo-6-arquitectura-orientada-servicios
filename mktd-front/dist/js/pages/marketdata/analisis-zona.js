//-- ANÁLISIS DE ZONA
//--  El dashboard hace UNA sola llamada al Servicio Orquestador (POST /analisis/zona), que invoca en paralelo
//--  al Servicio Territorial (INEI, REST/JSON) y al Empresarial (SUNAT, SOAP/XML) y devuelve un JSON consolidado.
//--  Con ?id=N se muestra un análisis guardado (GET /analisis/mostrar/N): no se vuelve a llamar a INEI ni SUNAT.

$(document).ready(function () {
  var usuarioSesion = fnMD.iniciarPagina();
  if (usuarioSesion == null) return;

  fnMD.llenarSectores("#cboRubro", "(todos los rubros)");
  if (fnCommon.tienePermiso("ANALISIS_FORZAR")) $("#grupoForzar").show();

  var id = fnCommon.getUrlParameter("id");
  var ubigeoUrl = fnCommon.getUrlParameter("ubigeo");
  fnMD.cascadaUbigeo("#cboDepartamento", "#cboProvincia", "#cboDistrito", function () {
    if (ubigeoUrl) fnMD.seleccionarUbigeo("#cboDepartamento", "#cboProvincia", "#cboDistrito", ubigeoUrl);
  });

  $("#formAnalisis").on("submit", function () { fnZona.analizar(); });
  $("#btnReanalizar").on("click", function () {
    var a = fnZona.actual();
    if (!a) return;
    fnMD.seleccionarUbigeo("#cboDepartamento", "#cboProvincia", "#cboDistrito", a.zona.ubigeo);
    $("#cboRubro").val(a.seccionInteres ? a.seccionInteres.codigo : "");
    $("html, body").animate({ scrollTop: 0 }, "fast");
  });

  if (id) fnZona.mostrarGuardado(id);
});

var fnZona = function () {
  var actual = null;
  var num = fnMD.num, esc = fnMD.esc;

  function analizar() {
    var ubigeo = fnMD.ubigeoElegido("#cboDepartamento", "#cboProvincia", "#cboDistrito");
    if (!ubigeo) { Swal.fire("Elige al menos un departamento", "", "info"); return; }
    var cuerpo = { ubigeo: ubigeo, seccionInteres: $("#cboRubro").val() || null, forzar: $("#chkForzar").is(":checked") };
    $(".preloader").fadeIn();
    $("#btnAnalizar").prop("disabled", true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Consultando INEI y SUNAT...');
    fnMD.llamar("POST", "/api/v1/analisis/zona", cuerpo, function (r) {
      $(".preloader").fadeOut();
      $("#btnAnalizar").prop("disabled", false).html('<i class="fas fa-play mr-1"></i> Analizar zona');
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      pintar(r.analisis);
      if (window.history && history.replaceState && r.analisis.idAnalisisZona) {
        history.replaceState(null, "", "?id=" + r.analisis.idAnalisisZona);
      }
    });
  }

  /** Un análisis guardado tiene otra forma: se arma igual que el resultado en línea */
  function mostrarGuardado(id) {
    $(".preloader").fadeIn();
    fnMD.llamar("GET", "/api/v1/analisis/mostrar/" + encodeURIComponent(id), null, function (r) {
      $(".preloader").fadeOut();
      if (r.codigoRespuesta != "01") { fnCommon.mostrarError(r); return; }
      var g = r.analisis;
      var t = r.territorial ? $.extend({}, r.territorial, { porcentajeUrbano: r.territorial.poblacionTotal ? Math.round(r.territorial.poblacionUrbana / r.territorial.poblacionTotal * 1000) / 10 : null }) : null;
      if (t) { t.poblacionTotal = g.poblacionTotal != null ? g.poblacionTotal : t.poblacionTotal; }
      var analisis = {
        idAnalisisZona: g.idAnalisisZona,
        fecha: g.fecha,
        guardado: true,
        usuario: g.usuario,
        zona: r.zona,
        seccionInteres: g.seccionInteres ? { codigo: g.seccionInteres, nombre: g.seccionInteresNombre } : null,
        estado: g.estado,
        avisos: g.observacion ? g.observacion.split(" | ") : [],
        indicadores: {
          empresasPorMil: g.empresasPorMil, habitantesPorEmpresa: g.habitantesPorEmpresa, empresasRubro: g.empresasRubro,
          indiceDemanda: g.indiceDemanda, indiceCompetencia: g.indiceCompetencia, indicePoderAdquisitivo: g.indicePoderAdquisitivo,
          indiceAtractivo: g.indiceAtractivo, nivelAtractivo: g.nivelAtractivo, sectorPredominante: g.sectorPredominante,
          sectorPredominanteNombre: g.sectorPredominanteNombre
        },
        territorial: { origen: g.origenTerritorial, tiempoMs: g.tiempoTerritorialMs, datos: g.origenTerritorial == "ERROR" ? null : t },
        empresarial: {
          origen: g.origenEmpresarial, tiempoMs: g.tiempoEmpresarialMs,
          datos: g.origenEmpresarial == "ERROR" ? null : { totalEmpresas: g.totalEmpresas, empresasActivas: g.empresasActivas, sectores: g.sectores || [], muestra: r.muestra || [] }
        },
        tiempoTotalMs: g.tiempoTotalMs,
        trazabilidad: null
      };
      pintar(analisis);
      if (r.zona) fnMD.seleccionarUbigeo("#cboDepartamento", "#cboProvincia", "#cboDistrito", r.zona.ubigeo);
    });
  }

  function fila(etiqueta, valor) { return "<tr><td>" + etiqueta + "</td><td>" + valor + "</td></tr>"; }

  function pintar(a) {
    actual = a;
    var t = a.territorial.datos, e = a.empresarial.datos, ind = a.indicadores || {};
    $("#sinResultado").hide();
    $("#resultado").show();

    //-- Cabecera
    $("#lblNivel").text(a.zona.nivel + " · UBIGEO " + a.zona.ubigeo);
    $("#lblZona").text(a.zona.nombreZona);
    $("#lblEstado").html(fnMD.badge(a.estado, fnCommon.MT_ESTADO_ANALISIS) +
      (a.seccionInteres ? " <span class='md-chip ml-1'><i class='fas fa-crosshairs mr-1'></i>Rubro: " + esc(a.seccionInteres.nombre) + "</span>" : "") +
      (ind.sectorPredominanteNombre ? " <span class='md-chip ml-1'>Predomina: " + esc(ind.sectorPredominanteNombre) + "</span>" : ""));
    $("#lblMeta").html((a.idAnalisisZona ? "Análisis N° " + a.idAnalisisZona + " · " : "") + fnCommon.formatoFecha(a.fecha, true) +
      (a.usuario ? " · " + esc(a.usuario) : "") + " · " + num(a.tiempoTotalMs) + " ms" + (a.guardado ? " · <i>guardado (no se volvió a consultar)</i>" : ""));
    $("#lblIndice").html(ind.indiceAtractivo != null ? num(ind.indiceAtractivo, 1) + " <small>/100</small>" : "-");
    $("#lblNivelIndice").html(ind.nivelAtractivo ? fnMD.badge(ind.nivelAtractivo, fnCommon.MT_NIVEL_ATRACTIVO) : "<span class='md-ayuda'>sin índice</span>");
    $("#btnComparar").attr("href", "comparar-zonas.html" + (a.idAnalisisZona ? "?ids=" + a.idAnalisisZona : ""));

    //-- Avisos (fallas controladas, caché vencida)
    var avisos = (a.avisos || []).filter(function (x) { return x; });
    $("#cajaAvisos").toggle(avisos.length > 0).html("<i class='fas fa-exclamation-triangle mr-1'></i> " + avisos.map(esc).join("<br>"));

    //-- KPIs
    $("#kpiPoblacion").text(t ? num(t.poblacionTotal) : "-");
    $("#kpiDensidad").text(t ? num(t.densidadHabKm2, 0) : "-");
    $("#kpiPobreza").text(t && t.tasaPobreza != null ? num(t.tasaPobreza, 1) + " %" : "-");
    $("#kpiEmpresas").text(e ? num(e.empresasActivas) : "-");
    $("#kpiPorMil").text(ind.empresasPorMil != null ? num(ind.empresasPorMil, 1) : "-");
    $("#kpiRubro").text(a.seccionInteres && ind.empresasRubro != null ? num(ind.empresasRubro) : "-")
      .closest(".col-6").toggle(!!a.seccionInteres);

    pintarDesglose(a, ind);
    pintarSectores(e, a.seccionInteres);
    pintarTerritorial(t, a.territorial);
    pintarEmpresarial(e, a.empresarial, ind);
    pintarMuestra(e);
    pintarTraza(a);
  }

  function barra(titulo, valor, peso, ayuda) {
    var v = valor == null ? 0 : valor;
    return "<div class='md-barra'><div class='md-barra-cab'><span>" + titulo + (peso ? " <span class='md-ayuda'>(peso " + peso + "%)</span>" : "") +
      "</span><b>" + (valor == null ? "-" : num(valor, 1)) + "</b></div>" +
      "<div class='progress'><div class='progress-bar' role='progressbar' style='width: " + v + "%' aria-valuenow='" + v + "' aria-valuemin='0' aria-valuemax='100'></div></div>" +
      "<div class='md-ayuda mt-1'>" + ayuda + "</div></div>";
  }

  function pintarDesglose(a, ind) {
    var p = function (c, d) { return fnCommon.parametro(c, d); };
    var rubro = a.seccionInteres ? " del rubro " + esc(a.seccionInteres.nombre) : "";
    var html =
      barra("Demanda", ind.indiceDemanda, p("PESO_DEMANDA", 40), "Tamaño del mercado: población y densidad (INEI).") +
      barra("Competencia", ind.indiceCompetencia, p("PESO_COMPETENCIA", 35),
        "Más alto = mercado menos saturado. Empresas activas" + rubro + " por mil habitantes frente a la referencia" +
        (ind.ratioCompetencia != null ? " (" + num(ind.ratioCompetencia, 2) + " veces lo normal)" : "") + " (SUNAT).") +
      barra("Poder adquisitivo", ind.indicePoderAdquisitivo, p("PESO_PODER_ADQUISITIVO", 25), "100 menos el % de población en pobreza (INEI).");
    if (ind.indiceAtractivo == null) html += "<div class='alert alert-secondary mb-0 py-2'>El índice necesita las dos fuentes; esta vez no se calculó.</div>";
    $("#desgloseIndice").html(html);
  }

  function pintarSectores(e, rubro) {
    if (!e || !e.sectores || !e.sectores.length) { fnMD.barras("graficoSectores", [], [], "Empresas"); return; }
    var lista = e.sectores.slice(0, 12);
    fnMD.barras("graficoSectores",
      lista.map(function (s) { return s.sector || s.seccionCiiu; }),
      lista.map(function (s) { return s.activas; }),
      "Empresas activas",
      { ayudas: lista.map(function (s) { return (s.sector || s.seccionCiiu) + " · " + num(s.porcentaje, 1) + " % de la zona" + (s.porMilHabitantes != null ? " · " + num(s.porMilHabitantes, 2) + " por mil hab." : ""); }) });
  }

  function origen(r) {
    return fnMD.badge(r.origen, fnCommon.MT_ORIGEN_DATO) + (r.tiempoMs != null ? " <span class='md-chip ml-1'>" + num(r.tiempoMs) + " ms</span>" : "");
  }

  function pintarTerritorial(t, r) {
    $("#origenT").html(origen(r));
    if (!t) { $("#tablaTerritorial tbody").html("<tr><td colspan='2' class='md-vacio'>" + esc(r.error || "El INEI no respondió") + "</td></tr>"); return; }
    $("#tablaTerritorial tbody").html(
      fila("Población total", num(t.poblacionTotal)) +
      fila("Urbana / rural", num(t.poblacionUrbana) + " / " + num(t.poblacionRural) + (t.porcentajeUrbano != null ? " <span class='md-ayuda'>(" + num(t.porcentajeUrbano, 1) + " % urbana)</span>" : "")) +
      fila("Hombres / mujeres", num(t.poblacionHombres) + " / " + num(t.poblacionMujeres)) +
      fila("Hogares", num(t.hogares)) +
      fila("Superficie", num(t.superficieKm2, 2) + " km²") +
      fila("Densidad", num(t.densidadHabKm2, 1) + " hab/km²") +
      fila("Edad promedio", num(t.edadPromedio, 1) + " años") +
      fila("Pobreza", num(t.tasaPobreza, 1) + " %") +
      fila("Población económicamente activa", num(t.pea)) +
      fila("Fuente", "<span class='md-ayuda'>" + esc(t.fuente || "INEI") + (t.anioReferencia ? " · " + t.anioReferencia : "") + "</span>"));
  }

  function pintarEmpresarial(e, r, ind) {
    $("#origenE").html(origen(r));
    if (!e) { $("#tablaEmpresarial tbody").html("<tr><td colspan='2' class='md-vacio'>" + esc(r.error || "La SUNAT no respondió") + "</td></tr>"); return; }
    var html = fila("Contribuyentes registrados", num(e.totalEmpresas)) + fila("Activos", num(e.empresasActivas));
    if (e.empresasHabidas != null) html += fila("Habidos", num(e.empresasHabidas)) + fila("Dados de baja", num(e.empresasBaja));
    html += fila("Empresas por mil habitantes", ind.empresasPorMil != null ? num(ind.empresasPorMil, 2) : "-") +
      fila("Habitantes por empresa", ind.habitantesPorEmpresa != null ? num(ind.habitantesPorEmpresa, 1) : "-") +
      fila("Sector predominante", esc(ind.sectorPredominanteNombre || "-")) +
      fila("Sectores con empresas", num((e.sectores || []).filter(function (s) { return s.activas > 0; }).length));
    $("#tablaEmpresarial tbody").html(html);
  }

  function pintarMuestra(e) {
    var lista = e && e.muestra ? e.muestra : [];
    if (!lista.length) { $("#tablaMuestra tbody").html("<tr><td colspan='6' class='text-center md-ayuda py-3'>Sin empresas de ejemplo</td></tr>"); return; }
    $("#tablaMuestra tbody").html(lista.map(function (c) {
      return "<tr><td><a href='consulta-ruc.html?ruc=" + esc(c.ruc) + "'>" + esc(c.ruc) + "</a></td><td>" + esc(c.razonSocial) + "</td><td>" + esc(c.sector || c.seccionCiiu || "-") +
        "</td><td><span class='md-ayuda'>" + esc(c.ciiu || "") + "</span> " + esc(c.actividadEconomica || "") + "</td><td class='text-center'>" +
        fnMD.badge(c.estado, fnCommon.MT_ESTADO_CONTRIBUYENTE) + "</td><td class='text-center'>" + fnMD.badge(c.condicion, fnCommon.MT_CONDICION_DOMICILIO) + "</td></tr>";
    }).join(""));
  }

  function servicio(nombre, protocolo, r) {
    return "<div class='col-sm-6 mb-2'><div class='md-servicio'><div class='md-servicio-cab'><b>" + nombre + "</b><span class='md-chip'>" + protocolo + "</span></div>" +
      "<div>" + fnMD.badge(r.origen, fnCommon.MT_ORIGEN_DATO) + "</div>" +
      "<div class='md-ayuda mt-1'>Tiempo: " + fnMD.ms(r.tiempoMs) + (r.intentos != null ? " · Intentos: " + r.intentos : "") + "</div>" +
      (r.error ? "<div class='text-danger small mt-1'>" + esc(r.error) + "</div>" : "") + "</div></div>";
  }

  function pintarTraza(a) {
    $("#cajaServicios").html(
      servicio("Servicio Territorial · INEI", "REST / JSON", a.territorial) +
      servicio("Servicio Empresarial · SUNAT", "SOAP / XML", a.empresarial) +
      "<div class='col-12 md-ayuda mt-1'>Ambos se ejecutan en paralelo: el tiempo total (" + num(a.tiempoTotalMs) + " ms) es cercano al del servicio más lento. " +
      "Origen \"Caché MySQL\" = el dato ya estaba guardado y vigente.</div>");
    if (!a.trazabilidad) {
      $("#listaTraza").html("<li><div class='md-paso'>Análisis guardado</div><div class='md-detalle'>Se muestra desde MySQL. Usa \"Volver a analizar\" para ver la orquestación paso a paso.</div></li>");
      return;
    }
    $("#listaTraza").html(a.trazabilidad.map(function (p) {
      var error = /ERROR/.test(p.detalle || "");
      return "<li" + (error ? " class='md-error'" : "") + "><span class='md-ms'>" + num(p.ms) + " ms</span><div class='md-paso'>" + esc(p.paso) + "</div><div class='md-detalle'>" + esc(p.detalle) + "</div></li>";
    }).join(""));
  }

  return { analizar: analizar, mostrarGuardado: mostrarGuardado, actual: function () { return actual; } };
}();
