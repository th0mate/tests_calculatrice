/**
 * Serveur web du monorepo.
 *
 * Sert le frontend statique (dossier ../public) ET délègue les appels
 * /calculate au requestHandler de l'API existante (src/server.js).
 * Tout vit ainsi sur une seule origine : pas de souci de CORS côté navigateur,
 * et `npm start` lance frontend + backend ensemble.
 *
 * Le requestHandler de l'API n'est volontairement PAS modifié : son contrat
 * (404 sur /, JSON partout, etc.) reste couvert par les tests d'intégration.
 */
const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");
const {requestHandler} = require("../src/server");

const PORT = process.env.WEB_PORT || process.env.PORT || 3000;
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

function webHandler(req, res) {
    const pathname = url.parse(req.url).pathname;

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
