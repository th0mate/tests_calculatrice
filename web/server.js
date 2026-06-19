/**
 * Serveur web du monorepo.
 *
 * Sert le frontend statique (dossier ../public) ET délègue les appels
 * /calculate au requestHandler de l'API existante (src/server.js).
 */
const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");
const {requestHandler} = require("../src/server");

const PORT = process.env.WEB_PORT || process.env.PORT || process.argv[2] || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".json": "application/json; charset=utf-8",
    ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
            res.end("404 — fichier introuvable");
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
            "Cache-Control": "no-cache",
        });
        res.end(data);
    });
}

/**
 * Génère le fichier de configuration runtime consommé par le frontend.
 * Expose `window.__CALC_API__`, la base d'URL du backend choisi via le .env
 * (BACKEND_HOST + BACKEND_PORT). Vide => même origine : le serveur web délègue
 * alors lui-même /calculate à l'API Node embarquée (utile en local/CI).
 */
function sendConfig(res) {
    const host = process.env.BACKEND_HOST || "";
    const port = process.env.BACKEND_PORT || "";
    const base = host && port ? `http://${host}:${port}` : "";
    const body = `window.__CALC_API__ = ${JSON.stringify(base)};\n`;
    res.writeHead(200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-cache",
    });
    res.end(body);
}

function webHandler(req, res) {
    const pathname = url.parse(req.url).pathname;

    if (pathname === "/config.js") {
        return sendConfig(res);
    }

    if (pathname === "/calculate") {
        return requestHandler(req, res);
    }

    const relativePath = pathname === "/" ? "/index.html" : pathname;
    const safePath = path
        .normalize(relativePath)
        .replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, {"Content-Type": "text/plain; charset=utf-8"});
        res.end("403 — accès refusé");
        return;
    }

    sendFile(res, filePath);
}

const server = http.createServer(webHandler);

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Frontend + API disponibles sur http://localhost:${PORT}`);
    });
}

module.exports = {webHandler, server};
