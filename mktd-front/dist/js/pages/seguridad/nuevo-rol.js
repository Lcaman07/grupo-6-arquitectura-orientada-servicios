var idRol = 0;
var modificar = false;

$(document).ready(function () {
    $("#navBar").load("../../pages/seguridad/nav.html");
    $("#footerBar").load("../../pages/seguridad/footer.html");

    var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    idRol = parseInt(id);
    if(id!=null){
        modificar = true;
        $("#titulo").html("Editar Rol");
        $("#detalleTitulo").html("Editar Rol");
        $("#subtitulo").html("Editar Datos");
        fnNewRol.init(modificar,usuarioSesion);
    }else{
        $("#titulo").html("Nuevo Rol");
        $("#detalleTitulo").html("Nuevo Rol");
        $("#subtitulo").html("Ingrese Datos");
        fnNewRol.init(modificar,usuarioSesion);
    }
   
});

var fnNewRol = function () {

    function init(flag,usuarioSesion){
        
        if(flag){
            fnMostrarRol(usuarioSesion);
        }else{
            fnNewRol.fnListarAccesos(usuarioSesion);
        }
        
        //utils();
    }

    function fnRoles() {
      var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
      $(".preloader").fadeIn();
      if(modificar){
        if ($("#nombre").val() != '') {
            if ($("#flkactivo").prop('checked')) {
              var resultado = 1;
            } else {
              var resultado = 0;
            }
            var request = {
              "idrol": idRol,
              "nombre": $("#nombre").val(),
              "flkactivo": resultado
            }
            var jsonData = JSON.stringify(request);
            jsonData = $.parseJSON(jsonData);
            console.log(jsonData);
     
            fnCommon.consultarAjaxJWT(
              usuarioSesion,
              "POST",
              fnCommon.URL_BACK + "/api/v1/roles/modificar",
              JSON.stringify(request),
              function (respuesta) {
                if (respuesta.codigoRespuesta == "01") {
                  //-- Cabecera
                  var rolId = respuesta.id;
                  var List = {"id" : [], "dataid" : [], "text" : []};
                  $("#treeview").hummingbird("getChecked",{list:List,onlyEndNodes:true,onlyParents:false,fromThis:false});
                  //console.log(List);
                  var lista = [];
                  $.each(List.id, function (i, item) {
                    lista.push({"idrol" : parseInt(rolId), "idacceso" : parseInt(item)});
                  });
                  var requestAccesoRol = {
                      lista : lista
                  } 
                  console.log(requestAccesoRol);
                  fnCommon.consultarAjaxJWT(
                      usuarioSesion,
                      "POST",
                      fnCommon.URL_BACK + "/api/v1/accesoRol/modificar",
                      JSON.stringify(requestAccesoRol),
                      function(respuestaAcceso){
                          if(respuestaAcceso.codigoRespuesta == "01"){
                            Swal.fire({
                                title: respuesta.mensajeRespuesta,
                                icon: 'success',
                                showCancelButton: false,
                                confirmButtonText: 'Ok',
                                allowOutsideClick: false
                              }).then((result) => {
                                if (result.value) {
                                  fnCommon.opcionesEstaticas(4);
                                }
                              })
                            $(".preloader").fadeOut();
                          }else{
                            Swal.fire(respuestaAcceso.mensajeRespuesta, "", "error");
                            $(".preloader").fadeOut();
                          }
                      }
                  );
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
      }else{
        if ($("#nombre").val() != '') {
            if ($("#flkactivo").prop('checked')) {
              var resultado = 1;
            } else {
              var resultado = 0;
            }
            var request = {
              "nombre": $("#nombre").val(),
              "flkactivo": resultado
            }
            var jsonData = JSON.stringify(request);
            jsonData = $.parseJSON(jsonData);
            console.log(jsonData);
     
            fnCommon.consultarAjaxJWT(
              usuarioSesion,
              "POST",
              fnCommon.URL_BACK + "/api/v1/roles/registros",
              JSON.stringify(request),
              function (respuesta) {
                if (respuesta.codigoRespuesta == "01") {
                  //-- Cabecera
                  var rolId = respuesta.id;
                  var List = {"id" : [], "dataid" : [], "text" : []};
                  $("#treeview").hummingbird("getChecked",{list:List,onlyEndNodes:true,onlyParents:false,fromThis:false});
                  //console.log(List);
                  var lista = [];
                  $.each(List.id, function (i, item) {
                    lista.push({"idrol" : parseInt(rolId), "idacceso" : parseInt(item)});
                  });
                  var requestAccesoRol = {
                      lista : lista
                  }
                  console.log(requestAccesoRol);
                  fnCommon.consultarAjaxJWT(
                      usuarioSesion,
                      "POST",
                      fnCommon.URL_BACK + "/api/v1/accesoRol/registros",
                      JSON.stringify(requestAccesoRol),
                      function(respuestaAcceso){
                          if(respuestaAcceso.codigoRespuesta == "01"){
                            Swal.fire({ icon: "success" , title: respuestaAcceso.mensajeRespuesta,  allowOutsideClick: false , confirmButtonText:  '<a href="javascript: fnCommon.opcionesEstaticas(4);" style="color: white;">OK'});                    
                             $(".preloader").fadeOut();
                          }else{
                            Swal.fire(respuestaAcceso.mensajeRespuesta, "", "error");
                            $(".preloader").fadeOut();
                          }
                      }
                  );
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

      
  
    }
    function fnListarAccesos(usuarioSesion) {

        var usuarioSesion = JSON.parse(localStorage.getItem("usuarioSesion"));
        fnCommon.inicializarSesion(usuarioSesion);

        fnCommon.consultarAjaxJWT(
        usuarioSesion,
        "GET",
        fnCommon.URL_BACK + "/api/v1/acceso/accesos",
        null,
            function (respuesta) {
                if (respuesta.codigoRespuesta == "01") {
                //var jsonData = JSON.stringify(respuesta.lista);
                console.log(respuesta.lista);
                var menulista = [];
                $.each(respuesta.lista, function (i, item) {
                menulista.push(item.nombreMenu);
                });
                var menus = menulista.filter(function(item, index, array) {
                return array.indexOf(item) === index;
                })
                console.log(menus);
                var new_children = {};
                $.each(menus, function (i, nombreMenu) {

                    $.each(respuesta.lista, function (j, item) {
                        if(item.nombreMenu == nombreMenu){
                            new_children[item.nombreAcceso] = {id:item.idAcceso,data_id:item.idAcceso,text:item.nombreAcceso};
                        }
                    });
                    if(i==0){
                        $("#treeview").hummingbird('addNode',{pos:'after',anchor_attr:'text',anchor_name:'Menu',
                        text:nombreMenu,the_id: i,data_id: i,end_node:false,children:new_children});
                    }else{
                        $("#treeview").hummingbird('addNode',{pos:'after',anchor_attr:'text',anchor_name:menus[i-1],
                        text:nombreMenu,the_id: i,data_id: i,end_node:false,children:new_children});
                    }
                    new_children = {};
                });
                //console.log(new_children);
                $("#treeview").hummingbird('removeNode',{attr:'id',name:'base'});
                //$("#treeview").hummingbird("checkNode",{attr:"data-id",name: '3',expandParents:false});
                $("#treeview").hummingbird();
                $("#treeview").hummingbird("collapseAll");
                
                } else {}
            }
        );

    }
    function fnMostrarRol(usuarioSesion){
        $(".preloader").fadeIn();
        const id = idRol;
        console.log(id);
        console.log(usuarioSesion);
        //$("#treeview").hummingbird("checkNode",{attr:"data-id",name: '3',expandParents:false});
        //$("#treeview").hummingbird();
        fnCommon.consultarAjaxJWT(
            usuarioSesion,
            "GET",
            fnCommon.URL_BACK + "/api/v1/roles/mostrar/" + id,
            null,
                function (respuestaMostrar) {
                    if (respuestaMostrar.codigoRespuesta == "01") {
                    //var jsonData = JSON.stringify(respuesta.lista);
                    $("#nombre").val(respuestaMostrar.nombre);
                    if(respuestaMostrar.flkactivo){
                        $('#flkactivo').prop('checked', true);
                    }else{
                        $('#flkactivo').prop('checked', false);
                    }
                    fnCommon.consultarAjaxJWT(
                        usuarioSesion,
                        "GET",
                        fnCommon.URL_BACK + "/api/v1/acceso/accesos",
                        null,
                            function (respuesta) {
                                if (respuesta.codigoRespuesta == "01") {
                                //var jsonData = JSON.stringify(respuesta.lista);
                                    fnCommon.consultarAjaxJWT(
                                        usuarioSesion,
                                        "GET",
                                        fnCommon.URL_BACK + "/api/v1/accesoRol/listaAccesoRol/" + id,
                                        null,
                                            function (respuestaAccesoRol) {
                                                if(respuestaAccesoRol.codigoRespuesta == "01"){
                                                    console.log(respuestaAccesoRol.lista);
                                                    var menulista = [];
                                                    $.each(respuesta.lista, function (i, item) {
                                                    menulista.push(item.nombreMenu);
                                                    });
                                                    var menus = menulista.filter(function(item, index, array) {
                                                    return array.indexOf(item) === index;
                                                    })
                                                    console.log(menus);
                                                    var new_children = {}; var idMenu = '';
                                                    $.each(menus, function (i, nombreMenu) {
                                    
                                                        $.each(respuesta.lista, function (j, item) {
                                                            if(item.nombreMenu == nombreMenu){
                                                                new_children[item.nombreAcceso] = {id:item.idAcceso,data_id:item.idAcceso,text:item.nombreAcceso};
                                                                idMenu = 'm' + item.idMenu;
                                                            }
                                                        });
                                                        if(i==0){
                                                            $("#treeview").hummingbird('addNode',{pos:'after',anchor_attr:'text',anchor_name:'Menu',
                                                            text:nombreMenu,the_id: idMenu,data_id: idMenu,end_node:false,children:new_children});
                                                        }else{
                                                            $("#treeview").hummingbird('addNode',{pos:'after',anchor_attr:'text',anchor_name:menus[i-1],
                                                            text:nombreMenu,the_id: idMenu,data_id: idMenu,end_node:false,children:new_children});
                                                        }
                                                        new_children = {};
                                                    });
                                                    //console.log(new_children);
                                                    $("#treeview").hummingbird('removeNode',{attr:'id',name:'base'});
                                                    var idMenu2 = '';
                                                    var countforMenu = [];
                                                    $.each(respuesta.lista, function (i, item) {
                                                        countforMenu.push(item.idMenu);
                                                    });
                                                    console.log(countforMenu);
                                                    countforMenu.push(-1);
                                                    //uniqueCount = ["a","b","c","d","d","e","a","b","c","f","g","h","h","h","e","a"];
                                                    var count = [];var conta = 0;var id = 0;
                                                    countforMenu.forEach(function(i) { 
                                                        if(id!=i&&id!=0){
                                                            count.push({id: id, cont: conta});
                                                            conta=0;
                                                        }
                                                        conta++;
                                                        id = i;
                                                    });
                                                    console.log(respuestaAccesoRol.lista);
                                                    console.log(count);
                                                    //var b = Object.entries(count);
                                                    //console.log(b[0] + b[1]);
                                                    $.each(menus, function (i, nombreMenu) {
                                                        var contador = 0;
                                                        $.each(respuestaAccesoRol.lista, function (j, item) {
                                                            if(item.nombreMenu == nombreMenu){
                                                                $("#treeview").hummingbird("checkNode",{attr:"data-id",name: item.idAcceso,expandParents:false});
                                                                idMenu2 = 'm' + item.idMenu;
                                                                contador++;
                                                            }
                                                        });
                                                        console.log(count);
                                                        $.each(respuestaAccesoRol.lista, function (j, item) {
                                                            var a = count[i];
                                                            //console.log("b :" + b[0] + "| idMenu: " + item.idMenu);
                                                            if(a.id==item.idMenu){
                                                                if(a.cont==contador){
                                                                    //console.log("entro");
                                                                    $("#treeview").hummingbird("checkNode",{attr:"data-id",name: 'm' + item.idMenu,expandParents:false});
                                                                }
                                                            }
                                                        });
                                                        console.log("i :"+i);
                                                        contador=0;
                                                    });

                                                    $("#treeview").hummingbird();
                                                    $(".preloader").fadeOut();
                                                    //$("#treeview").hummingbird("collapseAll");
                                                }
                                            }
                                    );
                                } else {
                                    Swal.fire(respuesta.mensajeRespuesta, "", "error");
                                    $(".preloader").fadeOut();
                                }
                            }
                        );
                    
                    } else {
                        Swal.fire(respuestaMostrar.mensajeRespuesta, "", "error");
                        $(".preloader").fadeOut();
                    }
                }
            );
    
    }
    return {
        init            :   init,
        fnRoles         :   fnRoles,
        fnListarAccesos :   fnListarAccesos,
        fnMostrarRol    :   fnMostrarRol
    }
  }();

