const express = require("express");
const path = require("path");
const fs = require("fs");
const jwt = require("jwt-simple");
const { createClient } = require('@supabase/supabase-js');

const clave = "miSecretoMasOscuro";
const app = express();

const supabaseUrl = 'https://snawilkykpqlbpstmcwa.supabase.co';
const supabaseKey = 'sb_publishable_fipgHlQrUeFJvkChpXz6lA_SOvnxzKn';
const supabase = createClient(supabaseUrl, supabaseKey);

const carpetaCliente = fs.existsSync(path.join(__dirname, "Cliente_rest"))
    ? path.join(__dirname, "Cliente_rest")
    : path.join(__dirname, "cliente_rest");

app.use("/appCliente", express.static(carpetaCliente));
app.use(express.json());

app.get("/", function (req, res) {
    res.redirect("/appCliente/index.html");
});

app.post("/api/gestores", async function (req, res) {
    const datos = req.body;
    const { data, error } = await supabase
        .from("gestores")
        .insert({ nombre: datos.nombre, apellidos: datos.apellidos, usuario: datos.usuario, password: datos.password })
        .select("id")
        .single();

    if (error) {
        console.log("Fallo al dar de alta el gestor", error);
        res.status(500).json("Error al registrar el gestor");
    } else {
        res.status(201).json(data.id);
    }
});

app.post("/api/gestores/login", async function (req, res) {
    const { data: filas, error } = await supabase
        .from("gestores")
        .select("id")
        .eq("usuario", req.body.login)
        .eq("password", req.body.password);

    if (error) {
        console.log("Fallo en el login", error);
        res.status(500).json("Error al iniciar sesión");
    } else if (filas.length == 1) {
        const contenido = {
            usuario: filas[0].id,
            expira: Date.now() + 60 * 60 * 1000
        };
        const token = jwt.encode(contenido, clave);
        res.status(200).json(token);
    } else {
        res.status(301).json("Usuario Incorrecto");
    }
});

app.use("/api", function (req, res, next) {
    const token = req.query.token;
    if (!token) {
        res.status(301).json("No se ha encontrado token");
        return;
    }

    let contenidoToken;
    try {
        contenidoToken = jwt.decode(token, clave);
    } catch (error) {
        res.status(301).json("El token es incorrecto");
        return;
    }

    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) {
        res.status(301).json("El formato del token no es adecuado");
        return;
    }

    if (contenidoToken.expira < Date.now()) {
        res.status(301).json("El token ha expirado");
        return;
    }

    next();
});

app.get("/api/ubicaciones", async function (req, res) {
    const { data, error } = await supabase.from("ubicaciones").select("*");

    if (error) {
        console.log("Fallo en la consulta de ubicaciones", error);
        res.status(500).json("Error al cargar la lista de ubicaciones");
    } else {
        res.status(200).json(data);
    }
});

app.get("/api/modelos", async function (req, res) {
    const { data, error } = await supabase.from("modelos").select("*");

    if (error) {
        console.log("Fallo en la consulta de modelos", error);
        res.status(500).json("Error al cargar la lista de modelos");
    } else {
        res.status(200).json(data);
    }
});

app.get("/api/categorias", async function (req, res) {
    const { data, error } = await supabase.from("categorias").select("*");

    if (error) {
        console.log("Fallo en la consulta de categorias", error);
        res.status(500).json("Error al cargar la lista de categorías");
    } else {
        res.status(200).json(data);
    }
});

app.get("/api/sanitarios/:id", async function (req, res) {
    const { data: filas, error } = await supabase
        .from("sanitarios")
        .select("id, nombre, apellidos, usuario")
        .eq("id", req.params.id);

    if (error) {
        console.log("Fallo al buscar el sanitario", error);
        res.status(500).json("Error al recuperar la información del sanitario");
    } else if (filas.length !== 1) {
        res.status(404).json("Sanitario no encontrado");
    } else {
        res.status(200).json(filas[0]);
    }
});

app.get("/api/gestores/:id", async function (req, res) {
    const { data: filas, error } = await supabase
        .from("gestores")
        .select("id, nombre, apellidos, usuario")
        .eq("id", req.params.id);

    if (error) {
        console.log("Fallo al buscar el gestor", error);
        res.status(500).json("Error al recuperar la información del gestor");
    } else if (filas.length !== 1) {
        res.status(404).json("Gestor no encontrado");
    } else {
        res.status(200).json(filas[0]);
    }
});

app.put("/api/gestores/:id", async function (req, res) {
    const datos = req.body;
    const { data: filas, error } = await supabase
        .from("gestores")
        .update({ nombre: datos.nombre, apellidos: datos.apellidos, usuario: datos.usuario, password: datos.password })
        .eq("id", req.params.id)
        .select();

    if (error) {
        console.log("Fallo al modificar el gestor", error);
        res.status(500).json("Error al modificar el gestor");
    } else if (filas.length !== 1) {
        res.status(404).json("Gestor no encontrado");
    } else {
        res.status(200).json("El gestor se ha modificado correctamente");
    }
});

app.post("/api/area_salud", async function (req, res) {
    const datos = req.body;
    const { data, error } = await supabase
        .from("area_salud")
        .insert({ codigo_postal: datos.codigo_postal, nombre: datos.nombre, gestor: datos.gestor, sanitario: datos.sanitario })
        .select();

    if (error) {
        console.log("Fallo al dar de alta el area de salud", error);
        res.status(500).json("Error al registrar el area de salud");
    } else {
        res.status(200).json({ affectedRows: data.length, datos: data });
    }
});

app.get("/api/recursos", async function (req, res) {
    let consulta = supabase.from("recurso").select("*, modelos!inner(categoria)");

    if (req.query.categoria) consulta = consulta.eq("modelos.categoria", req.query.categoria);
    if (req.query.modelo) consulta = consulta.eq("modelo", req.query.modelo);
    if (req.query.ubicacion) consulta = consulta.eq("ubicacion", req.query.ubicacion);
    if (req.query.estado) consulta = consulta.eq("estado", req.query.estado);

    const { data, error } = await consulta;

    if (error) {
        console.log("Error al realizar la consulta de recursos", error);
        res.status(500).json("Error al recuperar los recursos");
    } else {
        const recursos = data.map(function (r) {
            delete r.modelos;
            return r;
        });
        res.status(200).json(recursos);
    }
});

app.get("/api/recursos/:id", async function (req, res) {
    const { data: filas, error } = await supabase
        .from("recurso")
        .select("*")
        .eq("id", req.params.id);

    if (error) {
        console.log("Fallo al buscar el recurso", error);
        res.status(500).json("Error al recuperar el recurso");
    } else if (filas.length !== 1) {
        res.status(404).json("Recurso no encontrado");
    } else {
        res.status(200).json(filas[0]);
    }
});

app.get("/api/recursos/:id/resenyas", async function (req, res) {
    const { data, error } = await supabase
        .from("resenyas")
        .select("*")
        .eq("recurso", req.params.id);

    if (error) {
        console.log("Fallo al buscar las reseñas", error);
        res.status(500).json("Error al recuperar las reseñas");
    } else {
        res.status(200).json(data);
    }
});

app.get("/api/recursos/:id/reservas", async function (req, res) {
    const { data, error } = await supabase
        .from("reservas")
        .select("*")
        .eq("recurso", req.params.id);

    if (error) {
        console.log("Fallo al buscar las reservas", error);
        res.status(500).json("Error al recuperar las reservas");
    } else {
        res.status(200).json(data);
    }
});

app.post("/api/recursos", async function (req, res) {
    const datos = req.body;
    const { data, error } = await supabase
        .from("recurso")
        .insert({ modelo: datos.modelo, ubicacion: datos.ubicacion, numero_serie: datos.numero_serie, estado: datos.estado })
        .select()
        .single();

    if (error) {
        console.log("Fallo al insertar el recurso", error);
        res.status(500).json("Error al registrar el recurso");
    } else {
        res.status(201).json({ insertId: data.id, affectedRows: 1, recurso: data });
    }
});

app.put("/api/recursos/:id", async function (req, res) {
    const datos = req.body;
    const { data: filas, error } = await supabase
        .from("recurso")
        .update({ modelo: datos.modelo, ubicacion: datos.ubicacion, numero_serie: datos.numero_serie, estado: datos.estado })
        .eq("id", req.params.id)
        .select();

    if (error) {
        console.log("Fallo al modificar el recurso", error);
        res.status(500).json("Error al modificar el recurso");
    } else if (filas.length !== 1) {
        res.status(404).json("Recurso no encontrado");
    } else {
        res.status(200).json("El recurso se ha modificado correctamente");
    }
});

app.delete("/api/recursos/:id", async function (req, res) {
    const { data: filas, error } = await supabase
        .from("recurso")
        .delete()
        .eq("id", req.params.id)
        .select();

    if (error) {
        console.log("Fallo al borrar el recurso", error);
        res.status(500).json("Error al eliminar el recurso");
    } else if (filas.length !== 1) {
        res.status(404).json("Recurso no encontrado");
    } else {
        res.status(200).json("El recurso se ha eliminado correctamente");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log("Servidor escuchando en el puerto " + PORT);
});
