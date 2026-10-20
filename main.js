        var seccionActual="inicio"; //inicia la seccion actual en el login
        var esNuevoRegistro=true;
        var gestorLogueado=null;
        var todasLasCategorias=[];
        var todosLosModelos=[];
        var todasLasUbicaciones=[];
        var todosLosRecursos=[];
        var recursoActualId=null;
        var esNuevoRecurso=false;
        var conexionWS = null;
        var avisos = [];

        // web socket 
        function abrirWSGestor(gestor) {
            conexionWS = new WebSocket("ws://localhost:4444", "avisos");

            // Evento al establecer la conexión: enviar datos de identificación del gestor
            conexionWS.addEventListener("open", function () {
                conexionWS.send(JSON.stringify({
                    operacion: "identificar",
                    tipo: "gestor",
                    idUsuario: gestor.id,
                    nombre: gestor.nombre + " " + gestor.apellidos
                }));
            });

            // Evento al recibir un mensaje: procesar aviso y añadirlo a la tabla
            conexionWS.addEventListener("message", function (msg) {
                var aviso = JSON.parse(msg.data);

                // Solo procesar si es un aviso válido
                if (aviso.operacion === "aviso") {
                    avisos.push(aviso);  // Agregar aviso al array
                    pintarAvisos();       // Actualizar tabla de avisos en pantalla
                }
            });

            conexionWS.addEventListener("close", function () {
                console.log("WebSocket gestor cerrado");
            });

            conexionWS.addEventListener("error", function (error) {
                console.log("Error WebSocket gestor", error);
            });
        }

        // Cerrar conexión WebSocket y limpiar referencia
        function cerrarWS() {
            if (conexionWS != null) {
                conexionWS.close();
                conexionWS = null;
            }
        }

        // Enviar un objeto JSON al servidor a través del WebSocket
        // Verifica que la conexión esté abierta antes de enviar
        function enviarWS(objeto) {
            if (conexionWS != null && conexionWS.readyState === WebSocket.OPEN) {
                conexionWS.send(JSON.stringify(objeto));
            }
        }

        function pintarAvisos() {
            var tbody = document.getElementById("tabla_avisos_body");

            if (tbody == null) {
                return;
            }

            tbody.innerHTML = "";

            // Recorrer array de avisos y crear una fila para cada uno
            for (var i = 0; i < avisos.length; i++) {
                var tr = document.createElement("tr");

                // Asignar color de fondo según el tipo de aviso
                if (avisos[i].color === "rojo") {
                    tr.style.backgroundColor = "#ffcccc";
                }

                if (avisos[i].color === "azul") {
                    tr.style.backgroundColor = "#cce5ff";
                }

                if (avisos[i].color === "verde") {
                    tr.style.backgroundColor = "#ccffcc";
                }

                tr.innerHTML =
                    "<td>" + avisos[i].fecha + "</td>" +
                    "<td>" + avisos[i].origen + "</td>" +
                    "<td>" + avisos[i].texto + "</td>";

                tbody.appendChild(tr);
            }
        }
    // Fin web socket

        function cambiarSeccion(seccion){  //permite cambiar entre las diferentes secciones
            document.getElementById(seccionActual).classList.remove("activa");
            document.getElementById(seccion).classList.add("activa");
            seccionActual=seccion;
        }
        function llenarSelect(selectId, opciones, agregarTodos){
            var select = document.getElementById(selectId);
            if (agregarTodos) { // se agrega la opcion Todos solo en los select de filtros, no en el formulario de informacion
                select.innerHTML = "<option value='todos'>Todos</option>";
            } 
            else {
                select.innerHTML = "";
            }
            for (var i = 0; i < opciones.length; i++) {
                var option = document.createElement("option"); //crea elemento option, se le asigna el id y pone el nombre del objeto
                option.value = opciones[i].id; 
                option.textContent = opciones[i].nombre;
                select.appendChild(option);
            }
        }
        //busca el nombre de un elemento en una lista por su id, y devuelve el valor de los campos indicados 
        // Busca un elemento en una lista por su id y devuelve uno o varios campos
        // campos: array con los nombres de las propiedades a extraer (ej: ["nombre", "apellidos"])
        function buscarNombre(lista, id, campos){
            for(var i = 0; i < lista.length; i++){
                if(lista[i].id == id){
                    // Si solo se pidió un campo, devuelve ese valor directamente
                    if(campos.length == 1) return lista[i][campos[0]];
                    // Si se pidieron varios campos, usa map para obtener todos los valores
                    // y join para unirlos en un solo texto separado por espacios
                    return campos.map(function(c){ return lista[i][c]; }).join(" ");
                }
            }
            return "Desconocido";
        }
        
        function formatearFecha(fechaStr){
            var fecha = new Date(fechaStr);
            return fecha.toLocaleDateString() + " " + fecha.toLocaleTimeString();// Formatea la fecha en formato local con fecha y hora
        }
        
        function obtenerEstadoTexto(estado){
            if(estado == 0) return "Operativo";
            if(estado == 1) return "De baja";
            if(estado == 2) return "En mantenimiento";
            return "";
        }
        
        function cargarSelectsFormularioRecurso(){
            llenarSelect("categoria_info", todasLasCategorias, false);
            llenarSelect("ubicacion_info", todasLasUbicaciones, false);
            cargarModelosFormulario(); // Filtrar modelos según categoría seleccionada
        }
        function crear_area(){
            var datos= {
                codigo_postal: document.getElementById("codigo_postal").value,
                nombre: document.getElementById("nombre_area").value,
                gestor: gestorLogueado.id,
                sanitario: idSanitarioLogueado


            }
            rest.post("/api/area_salud",datos,function (estado,respuesta){
                    if(estado==200){
                        alert("Area creada con éxito")
                        
                    }
                    else{
                        
                        alert("Error al crear el área")
                    }
                });
        }
        function entrar(){
            var login = { //se guarda la informacion del login en un objeto
                login: document.getElementById("usuario_log").value,
                password: document.getElementById("contraseña_log").value
            };

            rest.token = null; // PRÁCTICA 3: por si quedaba el token de una sesión anterior
            rest.post("/api/gestores/login", login, function (estado, respuesta){ //se hace un post al servidor para comprobar que es correcto
                if(estado == 200){ //el login es correcto
                    // PRÁCTICA 3 - PARTE 2: el servidor ahora devuelve el TOKEN.
                    // Lo guardamos en rest.token y rest.js lo añadirá a todas las peticiones.
                    rest.token = respuesta;
                    // El id del gestor va dentro del token, en la parte del medio (codificada en base64)
                    var contenidoToken = JSON.parse(atob(respuesta.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
                    var gestorId = contenidoToken.usuario; // id del gestor logueado
                    // Obtener datos del gestor
                    rest.get("/api/gestores/" + gestorId, function(estado, datosGestor){
                        if(estado == 200){
                            gestorLogueado = datosGestor; //se guardan los datos del gestor logueado en memoria
                            abrirWSGestor(gestorLogueado); // Se abre la conexión WebSocket para recibir avisos en tiempo real
                            document.getElementById("nombre_bienvenida").textContent = datosGestor.nombre + " " + datosGestor.apellidos; //se muestra el nombre del gestor en la pantalla principal
                            rest.get("/api/categorias", function (estado, respuesta) { //se hacen peticiones para obtener las categorias, modelos, ubicaciones y recursos, y se guardan en memoria para no tener que volver a hacer peticiones cada vez que se necesiten
                                if (estado == 200) {
                                    todasLasCategorias = respuesta;
                                    llenarSelect("categoria", respuesta, true);
                                    cargarModelos(); // Cargar modelos para la categoría seleccionada (inicialmente "todos")
                                }
                            });
                            
                            rest.get("/api/modelos", function (estado, respuesta) {
                                if (estado == 200) todosLosModelos = respuesta;
                            });
                            
                            rest.get("/api/ubicaciones", function (estado, respuesta) {
                                if (estado == 200) {
                                    todasLasUbicaciones = respuesta;
                                    llenarSelect("ubicacion", respuesta, true);
                                }
                            });
                            
                            rest.get("/api/recursos", function (estado, respuesta) {
                                if (estado == 200) todosLosRecursos = respuesta;
                            });

                            cargarRankingAreas(); // PRÁCTICA 3 - PARTE 1: ranking en la vista principal
                            
                            cambiarSeccion("principal");
                            pintarAvisos();
                        }
                        else{
                            alert("Error al obtener datos del gestor");
                        }
                    });
                }
                else{
                    alert("usuario o contraseña incorrecta");
                }
            });
        }
        
        function cargarModelos(){
            var categoriaSeleccionada = document.getElementById("categoria").value; //lee la categoria seleccionada
            var modelosFiltrados;
            if (categoriaSeleccionada == 'todos') { //si la categoria seleccionada es "todos", se muestran todos los modelos, sino se filtran por categoria
                modelosFiltrados = todosLosModelos;
            } else {
                modelosFiltrados = todosLosModelos.filter(function(m){ return m.categoria == categoriaSeleccionada; }); // recorre un array con todos los modelos y devuelve solo los que coinciden con la categoria seleccionada
            } // m=cada modelo individual
            llenarSelect("modelo", modelosFiltrados, true);
        }
        
        function cargarModelosFormulario(){
            var categoriaSeleccionada = document.getElementById("categoria_info").value;
            var modelosFiltrados = todosLosModelos.filter(function(m){ return m.categoria == categoriaSeleccionada;});
            llenarSelect("modelo_info", modelosFiltrados, false);
        }
        
        function actualizarRecursos(){
            rest.get("/api/recursos", function (estado, respuesta) { // Se vuelve a cargar la lista completa de recursos para actualizar los datos en memoria
                if (estado == 200) {
                    todosLosRecursos = respuesta;
                    buscar(); // Refrescar la tabla con los filtros actuales
                }
            });
        }
        
        function buscar(){ //lee los filtros seleccionados
            var categoria = document.getElementById("categoria").value; //guarda los valores de los filtros en variables
            var modelo = document.getElementById("modelo").value;
            var ubicacion = document.getElementById("ubicacion").value;
            var estado = document.getElementById("estado").value;
            
            var resultados = todosLosRecursos.filter(function(recurso){
                var cumpleModelo = modelo == 'todos' || recurso.modelo == modelo;  //si el filtro de modelo es "todos" se cumple, sino solo se cumple si el modelo del recurso coincide con el filtro
                var cumpleUbicacion = ubicacion == 'todos' || recurso.ubicacion == ubicacion;
                var cumpleEstado = estado == 'todos' || recurso.estado == estado;
                
                var cumpleCategoria = categoria == 'todos';
                if(categoria != 'todos'){
                    var modeloRecurso = todosLosModelos.find(function(m){ return m.id == recurso.modelo; });
                    cumpleCategoria = modeloRecurso && modeloRecurso.categoria == categoria;
                }
                
                return cumpleCategoria && cumpleModelo && cumpleUbicacion && cumpleEstado;
            });
            mostrarResultados(resultados);
        }
        
        function mostrarResultados(resultados){
            var tbody = document.getElementById("tabla_recursos_body");
            tbody.innerHTML = "";
            
            if(resultados.length == 0){
                tbody.innerHTML = "<tr><td colspan='7'>No se encontraron recursos</td></tr>"; //sin recursos
                return;
            }
            
            for(var i = 0; i < resultados.length; i++){
                var recurso = resultados[i];
                var modelo = todosLosModelos.find(function(m){ return m.id == recurso.modelo; }); // Busca el modelo del recurso para mostrar su nombre y categoría
                var nombreModelo;
                if (modelo) {
                    nombreModelo = modelo.nombre;
                } else {
                    nombreModelo = "";
                }
                var nombreCategoria;
                if (modelo) {
                    nombreCategoria = buscarNombre(todasLasCategorias, modelo.categoria, ["nombre"]); // Busca el nombre de la categoría del modelo
                } else {
                    nombreCategoria = "";
                }
                var nombreUbicacion = buscarNombre(todasLasUbicaciones, recurso.ubicacion, ["nombre"]);
                
                var tr = document.createElement("tr"); //crea un elemento tr, y se le asigna el contenido con los datos del recurso, y dos botones para ver el recurso o eliminarlo
                tr.innerHTML = "<td>" + nombreModelo + "</td>" +
                               "<td>" + nombreCategoria + "</td>" +
                               "<td>" + nombreUbicacion + "</td>" +
                               "<td>" + recurso.numero_serie + "</td>" +
                               "<td>" + obtenerEstadoTexto(recurso.estado) + "</td>" +
                               "<td><button onclick='verRecurso(" + recurso.id + ")'>Ver</button></td>" +
                               "<td><button onclick='eliminar(" + recurso.id + ")'>X</button></td>";
                tbody.appendChild(tr); //se añade el elemento tr al tbody de la tabla
            }
        }
        function mostrarResultados_resenyas(resultados){
            var tbody = document.getElementById("tabla_resenyas_body");
            tbody.innerHTML = "";
            
            if(resultados.length == 0){
                tbody.innerHTML = "<tr><td colspan='4'>No hay reseñas para este recurso</td></tr>";
                return;
            }
            // Mostrar cada reseña obteniendo el sanitario 
            for(var i = 0; i < resultados.length; i++){
                (function(resenya){  //funcion autoejecutable para mantener el valor de cada reseña en la petición asíncrona
                    var tr = document.createElement("tr");
                    // Hacer petición para obtener datos del sanitario
                    rest.get("/api/sanitarios/" + resenya.sanitario, function(estado, sanitario){  //obtiene el nombre del sanitario
                        var nombreCompleto = "Desconocido";
                        if(estado == 200){
                            nombreCompleto = sanitario.nombre + " " + sanitario.apellidos;
                        }
                        tr.innerHTML = "<td>" + new Date(resenya.fecha).toLocaleDateString() + "</td>" +
                                       "<td>" + nombreCompleto + "</td>" +
                                       "<td>" + resenya.valor + "/5</td>" +
                                       "<td>" + resenya.descripcion + "</td>";
                    });
                    
                    tbody.appendChild(tr);
                })(resultados[i]); // Se usa una función autoejecutable para mantener el valor de cada reseña en la petición asíncrona
            }
        }
        
        function mostrarResultados_reservas(resultados){
            var tbody = document.getElementById("tabla_reservas_body");
            tbody.innerHTML = "";
            
            if(resultados.length == 0){
                tbody.innerHTML = "<tr><td colspan='5'>No hay reservas para este recurso</td></tr>";
                return;
            }
            var ahora = new Date();
            // Mostrar cada reserva obteniendo el sanitario directamente
            for(var i = 0; i < resultados.length; i++){
                (function(reserva){
                    // Determinar estado
                    var claseEstado = "";
                    if(reserva.fecha_fin){ //cambio de clase dependiendo del estado de la reserva
                        claseEstado = "reserva-finalizada"; 
                    } else if(!reserva.fecha_inicio){
                        claseEstado = "reserva-pendiente"; // Si no hay fecha_inicio, la reserva está pendiente
                    } else {
                        var fecha_inicio = new Date(reserva.fecha_inicio);
                        var fecha_fin_estimada = new Date(fecha_inicio.getTime() + (reserva.horas_estimadas * 60 * 60 * 1000));
                        
                        if(ahora < fecha_inicio){
                            claseEstado = "reserva-pendiente";
                        } else if(ahora < fecha_fin_estimada){
                            claseEstado = "reserva-enuso";
                        } else {
                            claseEstado = "reserva-pasada";
                        }
                    }
                    var tr = document.createElement("tr");
                    tr.className = claseEstado;
                    
                    // Hacer petición para obtener datos del sanitario
                    rest.get("/api/sanitarios/" + reserva.sanitario, function(estado, sanitario){ 
                        var nombreCompleto = "Desconocido";
                        if(estado == 200){
                            nombreCompleto = sanitario.nombre + " " + sanitario.apellidos;
                        }
                        
                        var fechaInicioTexto;
                        if (reserva.fecha_inicio) {
                            fechaInicioTexto = formatearFecha(reserva.fecha_inicio);
                        } else {
                            fechaInicioTexto = "-";
                        }
                        
                        var fechaFinTexto;
                        if (reserva.fecha_fin) {
                            fechaFinTexto = formatearFecha(reserva.fecha_fin);
                        } else {
                            fechaFinTexto = "-";
                        }
                        
                        tr.innerHTML = "<td>" + nombreCompleto + "</td>" +
                                       "<td>" + reserva.horas_estimadas + " horas</td>" +
                                       "<td>" + formatearFecha(reserva.fecha_peticion) + "</td>" +
                                       "<td>" + fechaInicioTexto + "</td>" +
                                       "<td>" + fechaFinTexto + "</td>";
                    });
                    
                    tbody.appendChild(tr);
                })(resultados[i]);
            }
        }
        function registrar(){
            esNuevoRegistro=true; // Viene de inicio
            // Limpiar campos para nuevo registro
            document.getElementById("nombre_reg").value = "";
            document.getElementById("apellidos").value = "";
            document.getElementById("usuario_reg").value = "";
            document.getElementById("contraseña_reg").value = "";
            cambiarSeccion("registro");
        }
    
        function  guardar(){
            // se guarda la información del formulario en un objeto
            var user={nombre:document.getElementById("nombre_reg").value, 
            apellidos:document.getElementById("apellidos").value, 
            usuario:document.getElementById("usuario_reg").value, 
            password:document.getElementById("contraseña_reg").value}

            if(esNuevoRegistro){
                // POST para crear nuevo gestor
                rest.post("/api/gestores",user,function (estado,respuesta){
                    if(estado==201){
                        console.log("Gestor creado");
                        cambiarSeccion("inicio");
                    }
                    else{
                        alert("Error al crear gestor")
                    }
                });
            }
            else{
                // PUT para actualizar gestor existente
                rest.put("/api/gestores/" + gestorLogueado.id, user, function (estado,respuesta){
                    if(estado==200){
                        console.log("Gestor actualizado");
                        // Actualizar datos en memoria
                        gestorLogueado.nombre = user.nombre;
                        gestorLogueado.apellidos = user.apellidos;
                        gestorLogueado.usuario = user.usuario;
                        document.getElementById("nombre_bienvenida").textContent = user.nombre + " " + user.apellidos;
                        cambiarSeccion("principal");
                        pintarAvisos();
                    }
                    else{
                        alert("Error al actualizar gestor")
                    }
                });
            }
        }
        function cancelar(){
            if(esNuevoRegistro){
                cambiarSeccion("inicio"); //vuelve al inicio para iniciar sesion con la nueva cuenta
            }
            else{
                cambiarSeccion("principal");
                pintarAvisos();
            }
        }
        function editar_datos(){
            esNuevoRegistro=false; // Viene de principal
            // Llenar campos con datos del gestor logueado
            document.getElementById("nombre_reg").value = gestorLogueado.nombre;
            document.getElementById("apellidos").value = gestorLogueado.apellidos;
            document.getElementById("usuario_reg").value = gestorLogueado.usuario;
            document.getElementById("contraseña_reg").value = ""; // Contraseña vacía por seguridad
            cambiarSeccion("registro");
        }
        function añadir_recurso(){
            esNuevoRecurso = true;
            recursoActualId = null;
            
            cargarSelectsFormularioRecurso();
            
            // Pre-rellenar con los valores de los filtros
            var filtros = {
                categoria: document.getElementById("categoria").value,
                modelo: document.getElementById("modelo").value,
                ubicacion: document.getElementById("ubicacion").value,
                estado: document.getElementById("estado").value
            };
            //rellenar los selects
            if(filtros.modelo != 'todos') {
                var modelo = todosLosModelos.find(function(m){ return m.id == filtros.modelo; });
                if(modelo) {
                    document.getElementById("categoria_info").value = modelo.categoria;
                    cargarModelosFormulario(); // Filtrar modelos por categoría
                    document.getElementById("modelo_info").value = filtros.modelo;
                }
            } else if(filtros.categoria != 'todos') {
                document.getElementById("categoria_info").value = filtros.categoria;
                cargarModelosFormulario(); // Filtrar modelos por categoría
            }
            
            if(filtros.ubicacion != 'todos') {
                document.getElementById("ubicacion_info").value = filtros.ubicacion;
            }
            
            if (filtros.estado != 'todos') {
                document.getElementById("estado_info").value = filtros.estado;
            } else {
                document.getElementById("estado_info").value = "0";
            }
            document.getElementById("numero_serie_info").value = "";
            cambiarSeccion("informacion");
        }
        
        function salir(){
            rest.token = null;      // PRÁCTICA 3 - PARTE 2: al salir se olvida el token
            gestorLogueado = null;
            cerrarWS();
            avisos = [];
            pintarAvisos();
            cambiarSeccion("inicio");
        }
        
        function volver(){
            cambiarSeccion("principal");
            pintarAvisos();
        }
        
        function verRecurso(id){
            esNuevoRecurso = false;
            recursoActualId = id;
            datos_recurso(id);
            
            rest.get("/api/recursos/" + id + "/reservas", function(estado, respuesta){ // obtienes las reservas del recurso para mostrarlas en la sección de información
                if (estado == 200) {
                    mostrarResultados_reservas(respuesta);
                } else {
                    mostrarResultados_reservas([]);
                }
            });
            
            rest.get("/api/recursos/" + id + "/resenyas", function(estado, respuesta){ //obtiene las reseñas
                if (estado == 200) {
                    mostrarResultados_resenyas(respuesta);
                } else {
                    mostrarResultados_resenyas([]);
                }
            });
        
            cambiarSeccion("informacion");
        }
        
        function eliminar(id){
            rest.delete("/api/recursos/" + id, function(estado, respuesta){ //elimina un recurso
                if(estado == 200){
                    console.log("Recurso eliminado");
                    actualizarRecursos();
                }
                else{
                    alert("Error al eliminar recurso");
                }
            });
        }
        
        function datos_recurso(id){
            rest.get("/api/recursos/" + id, function (estado, respuesta) { //obtiene los datos de un recurso para mostrarlos en la sección de información
                if (estado == 200) {
                    cargarSelectsFormularioRecurso(); // Cargar categorías, modelos y ubicaciones en el formulario
                    // Seleccionar categoría basándose en el modelo
                    var modelo = todosLosModelos.find(function(m){ return m.id == respuesta.modelo; });
                    if(modelo) {
                        document.getElementById("categoria_info").value = modelo.categoria;
                        cargarModelosFormulario(); // Filtrar modelos por categoría
                    }
                    
                    // Seleccionar valores del recurso
                    document.getElementById("modelo_info").value = respuesta.modelo;
                    document.getElementById("ubicacion_info").value = respuesta.ubicacion;
                    document.getElementById("numero_serie_info").value = respuesta.numero_serie;
                    document.getElementById("estado_info").value = respuesta.estado;
                }
                else {
                    alert("Error al cargar el recurso");
                }
            });
        }
        
        function guardar_recurso(){
            var numeroSerie = document.getElementById("numero_serie_info").value;
            
            // Validar que el número de serie no esté vacío y sea un número
            if(!numeroSerie || numeroSerie.trim() === ""){
                alert("El número de serie es obligatorio");
                return;
            }
            
            if(isNaN(numeroSerie) || numeroSerie <= 0){
                alert("El número de serie debe ser un número válido mayor que 0");
                return;
            }
            
            var recursoActual = { //guardar la información del recurso en un objeto
                modelo: document.getElementById("modelo_info").value,
                ubicacion: document.getElementById("ubicacion_info").value,
                numero_serie: numeroSerie,
                estado: document.getElementById("estado_info").value
            };
            
            if(esNuevoRecurso){
                rest.post("/api/recursos", recursoActual, function(estado, respuesta){
                    if(estado == 201){
                        console.log("Recurso creado");

                        enviarWS({
                            operacion: "recursoCreado",
                            idRecurso: respuesta.id
                        });

                        actualizarRecursos();
                    }
                    else{
                        alert("Error al crear recurso");
                    }
                });
            }
            else{
                rest.put("/api/recursos/" + recursoActualId, recursoActual, function(estado, respuesta){
                    if(estado == 200){
                        console.log("Recurso actualizado");
                        actualizarRecursos();
                    }
                    else{
                        alert("Error al actualizar recurso");
                    }
                });
            }
        }


        /* =====================================================================
           PRÁCTICA 3 - PARTE 2: SESIÓN NO VÁLIDA
           Si cualquier petición devuelve 301 (sin token, token falso o
           caducado) se avisa y se vuelve a la pantalla de login.
           ===================================================================== */
        rest.onNoAutorizado = function (mensaje) {
            if (gestorLogueado == null) return; // todavía no había sesión iniciada
            alert("Tu sesión no es válida (" + mensaje + "). Vuelve a iniciar sesión.");
            salir();
        };


        /* =====================================================================
           PRÁCTICA 3 - PARTE 1: SERVICIO DEL MINISTERIO DE SANIDAD
           - enviarReservasMinisterio(): junta todas nuestras reservas
           - subirAlMinisterio(envio):   las manda con POST
           - cargarRankingAreas():       pide al Ministerio los datos de todas las áreas (GET)
           - pintarTablaRanking(ranking): dibuja la tabla
           ===================================================================== */
        var URL_MINISTERIO = "https://undefined.ua.es/telemedicina/api/datos";
        var ID_AREA = 6; // nuestra área médica (asignada por el profesor)
        var NOMBRES_AREAS = ["", "Alergología", "Anestesiología", "Cardiología", "Cirugía General",
            "Dermatología", "Aparato Digestivo", "Endocrinología", "Ginecología", "Hematología",
            "Medicina Interna", "Neumología", "Neurología", "Oftalmología", "Oncología",
            "Pediatría", "Psiquiatría", "Traumatología", "Urología"];

        // Recoge TODAS las reservas de nuestro hospital y monta el objeto que pide el Ministerio.
        // Las reservas se piden recurso a recurso (/api/recursos/:id/reservas) y el nombre de cada
        // sanitario con /api/sanitarios/:id. La categoría se saca de los modelos y categorías
        // que ya tenemos cargados en memoria desde el login.
        function enviarReservasMinisterio(){
            if (!confirm("¿Enviar todas las reservas al Ministerio de Sanidad?")) return;

            var reservas = [];
            var recursosPendientes = todosLosRecursos.length;

            if (recursosPendientes == 0) {
                alert("No hay recursos cargados");
                return;
            }

            // 1) Reservas de cada recurso
            for (var i = 0; i < todosLosRecursos.length; i++) {
                (function (recurso) {
                    rest.get("/api/recursos/" + recurso.id + "/reservas", function (estado, lista) {
                        if (estado == 200) {
                            for (var j = 0; j < lista.length; j++) {
                                // categoría del recurso: recurso -> modelo -> categoría
                                var modelo = todosLosModelos.find(function (m) { return m.id == recurso.modelo; });
                                lista[j].categoria = modelo ? buscarNombre(todasLasCategorias, modelo.categoria, ["nombre"]) : "";
                                reservas.push(lista[j]);
                            }
                        }
                        recursosPendientes--;
                        if (recursosPendientes == 0) pedirSanitarios(); // ya tenemos todas las reservas
                    });
                })(todosLosRecursos[i]);
            }

            // 2) Nombre y apellidos de cada sanitario que aparece en las reservas
            function pedirSanitarios(){
                var sanitarios = {};
                var ids = [];
                for (var i = 0; i < reservas.length; i++) {
                    if (ids.indexOf(reservas[i].sanitario) == -1) ids.push(reservas[i].sanitario);
                }
                var sanitariosPendientes = ids.length;
                if (sanitariosPendientes == 0) {
                    alert("No hay reservas que enviar");
                    return;
                }

                for (var k = 0; k < ids.length; k++) {
                    (function (idSanitario) {
                        rest.get("/api/sanitarios/" + idSanitario, function (estado, sanitario) {
                            if (estado == 200) sanitarios[idSanitario] = sanitario;
                            sanitariosPendientes--;
                            if (sanitariosPendientes == 0) montarEnvio(sanitarios);
                        });
                    })(ids[k]);
                }
            }

            // 3) Objeto con el formato EXACTO del enunciado
            function montarEnvio(sanitarios){
                reservas.sort(function (a, b) { return a.id - b.id; });

                var hoy = new Date();
                var fecha = hoy.getFullYear() + "-" +
                            String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
                            String(hoy.getDate()).padStart(2, "0"); // YYYY-MM-DD

                var envio = { "id_area": ID_AREA, "fecha": fecha, "datos": [] };

                for (var i = 0; i < reservas.length; i++) {
                    var sanitario = sanitarios[reservas[i].sanitario] || { nombre: "", apellidos: "" };
                    envio.datos.push({
                        "nombre": sanitario.nombre,
                        "apellidos": sanitario.apellidos,
                        "categoría": reservas[i].categoria,
                        "horas_estimadas": reservas[i].horas_estimadas,
                        "fec_pet": reservas[i].fecha_peticion,
                        "fec_ini": reservas[i].fecha_inicio,
                        "fecha_fin": reservas[i].fecha_fin
                    });
                }

                subirAlMinisterio(envio);
            }
        }

        // POST al Ministerio con nuestras reservas
        function subirAlMinisterio(envio){
            console.log("Enviando al Ministerio:", envio);

            rest.post(URL_MINISTERIO, envio, function (estado, respuesta) {
                if (estado >= 200 && estado < 300) {
                    alert("Se han enviado " + envio.datos.length + " reservas al Ministerio (id_area " + envio.id_area + ")");
                    cargarRankingAreas(); // el ranking cambia después de enviar
                } else if (estado == 0) {
                    alert("No se ha podido contactar con el Ministerio");
                } else {
                    alert("El Ministerio ha rechazado el envío (código " + estado + ")");
                }
            });
        }

        // GET al Ministerio: devuelve lo que han enviado todos los hospitales.
        // Contamos cuántas reservas hay de cada área y las ordenamos.
        function cargarRankingAreas(){
            rest.get(URL_MINISTERIO, function (estado, respuesta) {
                if (estado != 200) {
                    document.getElementById("tabla_ranking_body").innerHTML =
                        "<tr><td colspan='3'>No se ha podido conectar con el Ministerio</td></tr>";
                    return;
                }

                // Un contador por área (posiciones 1 a 18)
                var ranking = [];
                for (var id = 1; id < NOMBRES_AREAS.length; id++) {
                    ranking.push({ id_area: id, nombre: NOMBRES_AREAS[id], reservas: 0 });
                }

                // Cada elemento es un envío {id_area, fecha, datos:[...]}.
                // Si en vez de eso viniera una reserva suelta con su id_area, cuenta como 1.
                var envios = Array.isArray(respuesta) ? respuesta : [];
                for (var i = 0; i < envios.length; i++) {
                    var area = ranking.find(function (a) { return a.id_area == envios[i].id_area; });
                    if (!area) continue;

                    var lista = Array.isArray(envios[i].datos) ? envios[i].datos : [envios[i]];
                    area.reservas += lista.length;
                }

                // De más reservas a menos
                ranking.sort(function (a, b) { return b.reservas - a.reservas; });

                pintarTablaRanking(ranking);
            });
        }

        // Dibuja la tabla del ranking en la vista principal (nuestra área resaltada)
        function pintarTablaRanking(ranking){
            var tbody = document.getElementById("tabla_ranking_body");
            tbody.innerHTML = "";

            for (var i = 0; i < ranking.length; i++) {
                var tr = document.createElement("tr");
                if (ranking[i].id_area == ID_AREA) {
                    tr.style.backgroundColor = "#e0f2fe";
                    tr.style.fontWeight = "bold";
                }
                tr.innerHTML = "<td>" + (i + 1) + "º</td>" +
                               "<td>" + ranking[i].id_area + " - " + ranking[i].nombre + "</td>" +
                               "<td>" + ranking[i].reservas + "</td>";
                tbody.appendChild(tr);
            }
        }
