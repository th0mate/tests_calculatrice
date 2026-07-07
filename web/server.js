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

/**
 * Charge le .env à la racine du repo (s'il existe) dans process.env, sans
 * écraser les variables déjà définies (Docker `env_file`, CI, ligne de
 * commande...). En local, `npm start` ne passe par aucun outil qui lit le
 * .env : sans ça, BACKEND_HOST/BACKEND_PORT restent vides et le frontend
 * appelle sa propre origine (port 3000) au lieu du backend choisi.
 */
function loadEnv() {
    let content;
    try {
        content = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    } catch {
        return;
    }
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (key && !(key in process.env)) {
            process.env[key] = value;
        }
    }
}

loadEnv();

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
 * Catalogue des backends disponibles. Les ports sont figés par docker-compose
 * (backend-node : 3000, backend-php : 3001, backend-java : 3002) et tournent
 * tous en parallèle. Le frontend bascule de l'un à l'autre À CHAUD : plus besoin
 * de rebuild. Le .env (BACKEND_PORT) ne fait plus que choisir le backend
 * présélectionné au premier chargement.
 */
const BACKENDS = [
    {id: "node", label: "Node.js", port: 3000},
    {id: "php", label: "PHP", port: 3001},
    {id: "java", label: "Java", port: 3002},
];

/**
 * Génère la config runtime consommée par le frontend : le catalogue des
 * backends (`window.__CALC_BACKENDS__`) et l'identifiant du backend par défaut
 * (`window.__CALC_DEFAULT__`), déduit du BACKEND_PORT du .env.
 */
function sendConfig(res) {
    const envPort = String(process.env.BACKEND_PORT || "");
    const fallback = BACKENDS.find((b) => String(b.port) === envPort);
    const defaultId = fallback ? fallback.id : BACKENDS[0].id;
    const body =
        `window.__CALC_BACKENDS__ = ${JSON.stringify(BACKENDS)};\n` +
        `window.__CALC_DEFAULT__ = ${JSON.stringify(defaultId)};\n`;
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
