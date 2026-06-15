const http = require("http");
const url = require("url");
const Calculator = require("./calculator");

const calculator = new Calculator();
const PORT = process.env.PORT || 3000;

function requestHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Méthode non autorisée. Utiliser GET." }));
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  if (pathname !== "/calculate") {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Route introuvable." }));
    return;
  }

  const query = parsedUrl.query;
  if (query.operation === undefined || query.a === undefined || query.b === undefined) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Paramètres attendus : operation, a, b" }));
    return;
  }

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

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

module.exports = { requestHandler, server };
