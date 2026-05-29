const http = require("http");
const url = require("url");
const Calculator = require("./calculator");

const calculator = new Calculator();
const PORT = process.env.PORT || 3000;

function requestHandler(req, res) {
  // 1. Positionner les headers CORS sur toutes les réponses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // 2. Si méthode OPTIONS → répondre 204 vide et stopper
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 3. Si méthode ≠ GET → répondre 405 avec header Allow
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Méthode non autorisée. Utiliser GET." }));
    return;
  }

  // 4. Si pathname ≠ /calculate → répondre 404
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  if (pathname !== "/calculate") {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Route introuvable." }));
    return;
  }

  // 5. Si operation, a ou b sont absents de la query string → répondre 400
  const query = parsedUrl.query;
  if (query.operation === undefined || query.a === undefined || query.b === undefined) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Paramètres attendus : operation, a, b" }));
    return;
  }

  // 6. Convertir a et b en Number ; si NaN → répondre 400
  const numA = Number(query.a);
  const numB = Number(query.b);
  if (
    isNaN(numA) ||
    isNaN(numB) ||
    (typeof query.a === "string" && query.a.trim() === "") ||
    (typeof query.b === "string" && query.b.trim() === "")
  ) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Les paramètres a et b doivent être des nombres." }));
    return;
  }

  // 7 & 8. Exécuter l'opération via Calculator dans un try/catch / Si opération inconnue → répondre 400
  const operation = query.operation;
  const allowedOperations = ["add", "subtract", "multiply", "divide"];
  if (!allowedOperations.includes(operation)) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Opération inconnue. Utiliser : add, subtract, multiply, divide" }));
    return;
  }

  try {
    let result;
    switch (operation) {
      case "add":
        result = calculator.add(numA, numB);
        break;
      case "subtract":
        result = calculator.subtract(numA, numB);
        break;
      case "multiply":
        result = calculator.multiply(numA, numB);
        break;
      case "divide":
        result = calculator.divide(numA, numB);
        break;
    }

    // 9. Répondre 200 avec { operation, a, b, result }
    res.writeHead(200);
    res.end(JSON.stringify({
      operation,
      a: numA,
      b: numB,
      result
    }));
  } catch (err) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: err.message }));
  }
}

const server = http.createServer(requestHandler);

/* istanbul ignore next */
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

module.exports = { requestHandler, server };
