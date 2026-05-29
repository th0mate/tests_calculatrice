const http = require("http");

/**
 * Envoie une requête HTTP à une instance de serveur de test.
 * @param {http.Server} server - Instance déjà en écoute
 * @param {string} path - Chemin + query string
 * @param {string} method - Méthode HTTP (défaut : "GET")
 * @returns {Promise<{status, headers, body, duration}>}
 */
function request(server, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const start = Date.now();
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: addr.port,
        path,
        method,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            duration: Date.now() - start,
          })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}

module.exports = { request };
