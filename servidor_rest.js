var express = require("express");
var conexion = require("./conexion_mysql.js");
var jwt = require('jwt-simple'); // PRÁCTICA 3 - PARTE 2 (como en el ejemplo JWT del profesor)
var clave = 'miSecretoMasOscuro'; // clave para codificar / decodificar el token
var app = express();

app.use(express.json());
app.use("/appCliente", express.static("Cliente_rest"));


// PRÁCTICA 3 - PARTE 2: antes de este use, los servicios son públicos (no necesitan token)

// Da de alta un gestor nuevo
app.post("/api/gestores", function (req, res) {

    var datos = req.body;
    var consulta = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
    var parametros = [datos.nombre, datos.apellidos, datos.usuario, datos.password];

    conexion.query(consulta, parametros, function (err, resultado) {
        if (err) {
            console.log("Fallo al dar de alta el gestor");
            res.status(500).json("Error al registrar el gestor");
        } else {
            console.log("Gestor creado:", resultado);
            res.status(201).json(resultado.insertId);
        }
    });
});

// Valida las credenciales y retorna el token si es correcto
app.post("/api/gestores/login", function (req, res) {

    var consulta = "SELECT id FROM gestores WHERE usuario = ? AND password = ?";
    var parametros = [req.body.login, req.body.password];

    conexion.query(consulta, parametros, function (err, filas) {
        if (err) {
            console.log("Fallo en el login", err);
            res.status(500).json("Error al iniciar sesión");
        } else if (filas.length == 1) {
            // Crear un token
            var contenido = { // contenido del token (se puede incluir la información que necesitemos)
                usuario: filas[0].id,
                expira: Date.now() + 60 * 60 * 1000 // expira dentro de 1 hora (en ms)
            };
            var token = jwt.encode(contenido, clave);
            console.log("Login correcto, gestor:", filas[0].id);
            res.status(200).json(token);
        } else { // fallo
            res.status(301).json("Usuario Incorrecto");
        }
    });
});


// Con esta función intermedia validamos el token. Si no es correcto terminamos con un error. Si es correcto continuamos.
app.use("/api", function (req, res, next) {
    var token = req.query.token; // obtengo el token de una query de la URL: http://MI_SERVIDOR/MI_RUTA?token=XXXXXXXX
    if (!token) { // no se ha pasado un token
        res.status(301).json("No se ha encontrado token");
        return;
    }

    // Decodificar el token
    try { // capturamos el error por si el token no es correcto
        var contenidoToken = jwt.decode(token, clave); // decodificamos el token para obtener su contenido con la misma clave que se codificó
    } catch (error) {
        res.status(301).json("El token es incorrecto");
        return;
    }
    console.log("El contenido del token es:", contenidoToken);

    // Validar el token
    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) { // validamos el formato del token
        res.status(301).json("El formato del token no es adecuado");
        return;
    }

    // Comprobar la fecha de expiración
    if (contenidoToken.expira < Date.now()) {
        res.status(301).json("El token ha expirado");
        return;
    }
    // Todo ha ido bien. con next hago que express continue con el procesado
    next();
});
// Después de este use, los servicios son privados (necesitan el token)



/* ---------- CATÁLOGOS ---------- */

// Devuelve el listado de ubicaciones
app.get("/api/ubicaciones", function (req, res) {

    conexion.query("SELECT * FROM ubicaciones", function (err, listaUbicaciones) {
        if (err) {
            console.log("Fallo en la consulta de ubicaciones", err);
            res.status(500).json("Error al cargar la lista de ubicaciones");
        } else {
            console.log("Ubicaciones encontradas:", listaUbicaciones);
            res.status(200).json(listaUbicaciones);
        }
    });
});


// Devuelve el listado de modelos
app.get("/api/modelos", function (req, res) {

    conexion.query("SELECT * FROM modelos", function (err, listaModelos) {
        if (err) {
            console.log("Fallo en la consulta de modelos", err);
            res.status(500).json("Error al cargar la lista de modelos");
        } else {
            console.log("Modelos encontrados:", listaModelos);
            res.status(200).json(listaModelos);
        }
    });
});


// Devuelve el listado de categorías
app.get("/api/categorias", function (req, res) {

    conexion.query("SELECT * FROM categorias", function (err, listaCategorias) {
        if (err) {
            console.log("Fallo en la consulta de categorias", err);
            res.status(500).json("Error al cargar la lista de categorías");
        } else {
            console.log("Categorias encontradas:", listaCategorias);
            res.status(200).json(listaCategorias);
        }
    });
});


/* ---------- SANITARIOS ---------- */

// Datos de un sanitario a partir de su id
app.get("/api/sanitarios/:id", function (req, res) {

    var idSanitario = req.params.id;
    var consulta = "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = " + idSanitario;

    conexion.query(consulta, function (err, filas) {
        if (err) {
            console.log("Fallo al buscar el sanitario");
            res.status(500).json("Error al recuperar la información del sanitario");
        } else if (filas.length !== 1) {
            console.log("No hay ningun sanitario con id ", idSanitario);
            res.status(404).json("Sanitario no encontrado");
        } else {
            console.log("Sanitario encontrado: ", filas[0]);
            res.status(200).json(filas[0]);
        }
    });
});


/* ---------- GESTORES ---------- */

// Datos de un gestor a partir de su id
app.get("/api/gestores/:id", function (req, res) {

    var idGestor = req.params.id;
    var consulta = "SELECT id, nombre, apellidos, usuario FROM gestores WHERE id = " + idGestor;

    conexion.query(consulta, function (err, filas) {
        if (err) {
            console.log("Fallo al buscar el gestor");
            res.status(500).json("Error al recuperar la información del gestor");
        } else if (filas.length !== 1) {
            console.log("No hay ningun gestor con id ", idGestor);
            res.status(404).json("Gestor no encontrado");
        } else {
            console.log("Gestor encontrado: ", filas[0]);
            res.status(200).json(filas[0]);
        }
    });
});


// Modifica los datos de un gestor
app.put("/api/gestores/:id", function (req, res) {

    var datos = req.body;
    var consulta = "UPDATE gestores SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?";
    var parametros = [datos.nombre, datos.apellidos, datos.usuario, datos.password, req.params.id];

    conexion.query(consulta, parametros, function (err, resultado) {
        if (err) {
            console.log("Fallo al modificar el gestor");
            res.status(500).json("Error al modificar el gestor");
        } else if (resultado.affectedRows !== 1) {
            res.status(404).json("Gestor no encontrado");
        } else {
            console.log("Gestor modificado correctamente");
            res.status(200).json("El gestor se ha modificado correctamente");
        }
    });
});


app.post("/api/area_salud", function (req, res) {

    var datos = req.body;
    var consulta = "INSERT INTO area_salud (codigo_postal, nombre, gestor, sanitario) VALUES (?, ?, ?, ?)";
    var parametros = [datos.codigo_postal, datos.nombre, datos.gestor, datos.sanitario];

    conexion.query(consulta, parametros, function (err, resultado) {
        if (err) {
            console.log("Fallo al dar de alta el gestor");
            res.status(500).json("Error al registrar el gestor");
        } else {
            console.log("area creada:", resultado);
            res.status(200).json(resultado);
        }
    });
});

/* ---------- RECURSOS ---------- */

// Lista de recursos, con filtros opcionales por la URL
app.get("/api/recursos", function (req, res) {

    var categoriaFiltro = req.query.categoria;
    var modeloFiltro = req.query.modelo;
    var ubicacionFiltro = req.query.ubicacion;
    var estadoFiltro = req.query.estado;

    var sql = "SELECT recurso.* FROM recurso JOIN modelos ON recurso.modelo = modelos.id";

    var hayFiltro = false;

    if(categoriaFiltro){
        sql += " WHERE modelos.categoria = " + categoriaFiltro;
        hayFiltro = true;
    }

    if(modeloFiltro){
        if(hayFiltro){
            sql += " AND recurso.modelo = " + modeloFiltro;
        }
        else{
            sql += " WHERE recurso.modelo = " + modeloFiltro;
            hayFiltro = true;
        }
    }

    if(ubicacionFiltro){
        if(hayFiltro){
            sql += " AND recurso.ubicacion = " + ubicacionFiltro;
        }
        else{
            sql += " WHERE recurso.ubicacion = " + ubicacionFiltro;
            hayFiltro = true;
        }
    }

    if(estadoFiltro){
        if(hayFiltro){
            sql += " AND recurso.estado = '" + estadoFiltro + "'";
        }
        else{
            sql += " WHERE recurso.estado = '" + estadoFiltro + "'";
            hayFiltro = true;
        }
    }

    conexion.query(sql, function(err, recursos) {

        if(err){
            console.log("Error al realizar la consulta de recursos", err);
            res.status(500).json("Error al recuperar los recursos");
        }
        else{
            console.log("Recursos:", recursos);
            res.status(200).json(recursos);
        }
    });
});


// Un recurso concreto a partir de su id
app.get("/api/recursos/:id", function (req, res) {

    var idRecurso = req.params.id;
    var consulta = "SELECT * FROM recurso WHERE id = " + idRecurso;

    conexion.query(consulta, function (err, filas) {
        if (err) {
            console.log("Fallo al buscar el recurso");
            res.status(500).json("Error al recuperar el recurso");
        } else if (filas.length !== 1) {
            console.log("No hay ningun recurso con id ", idRecurso);
            res.status(404).json("Recurso no encontrado");
        } else {
            console.log("Recurso encontrado: ", filas[0]);
            res.status(200).json(filas[0]);
        }
    });
});


// Reseñas asociadas a un recurso
app.get("/api/recursos/:id/resenyas", function (req, res) {

    var idRecurso = req.params.id;
    var consulta = "SELECT * FROM resenyas WHERE recurso = " + idRecurso;

    conexion.query(consulta, function (err, listaResenyas) {
        if (err) {
            console.log("Fallo al buscar las reseñas");
            res.status(500).json("Error al recuperar las reseñas");
        } else {
            console.log("Reseñas encontradas: ", listaResenyas);
            res.status(200).json(listaResenyas);
        }
    });
});


// Reservas asociadas a un recurso
app.get("/api/recursos/:id/reservas", function (req, res) {

    var idRecurso = req.params.id;
    var consulta = "SELECT * FROM reservas WHERE recurso = " + idRecurso;

    conexion.query(consulta, function (err, listaReservas) {
        if (err) {
            console.log("Fallo al buscar las reservas");
            res.status(500).json("Error al recuperar las reservas");
        } else {
            console.log("Reservas encontradas: ", listaReservas);
            res.status(200).json(listaReservas);
        }
    });
});


// Alta de un recurso
app.post("/api/recursos", function (req, res) {

    var datos = req.body;
    var consulta = "INSERT INTO recurso (modelo, ubicacion, numero_serie, estado) VALUES (?, ?, ?, ?)";
    var parametros = [datos.modelo, datos.ubicacion, datos.numero_serie, datos.estado];

    conexion.query(consulta, parametros, function (err, resultado) {
        if (err) {
            console.log("Fallo al insertar el recurso", err);
            res.status(500).json("Error al registrar el recurso");
        } else {
            console.log("Recurso creado:", resultado);
            res.status(201).json(resultado);
        }
    });
});


// Modificación de un recurso
app.put("/api/recursos/:id", function (req, res) {

    var datos = req.body;
    var consulta = "UPDATE recurso SET modelo = ?, ubicacion = ?, numero_serie = ?, estado = ? WHERE id = ?";
    var parametros = [datos.modelo, datos.ubicacion, datos.numero_serie, datos.estado, req.params.id];

    conexion.query(consulta, parametros, function (err, resultado) {
        if (err) {
            console.log("Fallo al modificar el recurso");
            res.status(500).json("Error al modificar el recurso");
        } else if (resultado.affectedRows !== 1) {
            res.status(404).json("Recurso no encontrado");
        } else {
            res.status(200).json("El recurso se ha modificado correctamente");
        }
    });
});


// Baja de un recurso
app.delete("/api/recursos/:id", function (req, res) {

    var consulta = "DELETE FROM recurso WHERE id = " + req.params.id;

    conexion.query(consulta, function (err, resultado) {
        if (err) {
            console.log("Fallo al borrar el recurso", err);
            res.status(500).json("Error al eliminar el recurso");
        } else if (resultado.affectedRows !== 1) {
            res.status(404).json("Recurso no encontrado");
        } else {
            console.log("Recurso eliminado de la base de datos");
            res.status(200).json("El recurso se ha eliminado correctamente");
        }
    });
});


/* ---------- ARRANQUE ---------- */

app.listen(3000, function () {
    console.log("Servidor escuchando en el puerto 3000");
    console.log("http://localhost:3000/appCliente/index.html");
});