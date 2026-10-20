(function () {
	function debug(...args) {
		if (rest.debug) console.log("REST", ...args);
	}

	function rest(method, url, data, callback) {
		method = method.toUpperCase(); // método en mayúsculas
		if (typeof data === "function") { // no se ha indicado data, pero si callback
			callback = data;
			data = null;
		}
		// PRÁCTICA 3 - PARTE 2: si ya tenemos token se añade solo a todas las peticiones a
		// NUESTRO servidor (las que empiezan por "/"), como parámetro de la URL:
		//   /api/recursos  ->  /api/recursos?token=XXXX
		// A otros servidores (el Ministerio) no se les manda nuestro token.
		if (rest.token && url.charAt(0) === "/") {
			url += (url.indexOf("?") === -1 ? "?" : "&") + "token=" + encodeURIComponent(rest.token);
		}

		var async = typeof callback === "function"; // es una petición asincrona?
		if (data && typeof data !== "string") data = JSON.stringify(data); // datos en texto formato JSON
		var xhr = new XMLHttpRequest();
		xhr.open(method, url, async);
		//xhr.responseType = 'json'; // el tipo de la respuesta que se espera es JSON
		if(data) xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8"); // el tipo de la petición es JSON
		debug(">>>", method, url, data);
		xhr.send(data); // Enviar datos
		function end() {
			debug("<<<", xhr.status, xhr.response);
			var response = xhr.response;
			if (response) {
				try { response = JSON.parse(response); } catch (e) { /* la respuesta no era JSON */ }
			}
			// PRÁCTICA 3 - PARTE 2: el servidor responde 301 si el token falta, es falso o ha caducado
			if (xhr.status === 301 && typeof rest.onNoAutorizado === "function") {
				rest.onNoAutorizado(response);
			}
			if (async) {
				callback(xhr.status, response);
			} else {
				return { status: xhr.status, response: response };
			}
		}
		if (async) {
			xhr.onload = end;
			xhr.onerror = end;
		} else {
			return end();
		}
	};

	rest.debug = false;
	rest.token = null;          // PRÁCTICA 3 - PARTE 2: aquí se guarda el token al hacer login
	rest.onNoAutorizado = null; // PRÁCTICA 3 - PARTE 2: qué hacer si el servidor responde 301 (token no válido)

	rest.get = function (url, callback) { return rest("GET", url, callback); };
	rest.post = function (url, data, callback) { return rest("POST", url, data, callback); };
	rest.put = function (url, data, callback) { return rest("PUT", url, data, callback); };
	rest.delete = function (url, callback) { return rest("DELETE", url, callback); };

	window.rest = rest;
})();
