const http = require("http");
const { requestHandler } = require("../src/server");
const { request } = require("./helpers/http");

describe("API /calculate", () => {
  let server;

  beforeAll((done) => {
    server = http.createServer(requestHandler);
    server.listen(0, "127.0.0.1", done);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe("Performance", () => {
    it("devrait répondre en moins de 100 ms pour une requête valide", async () => {
      const { duration } = await request(server, "/calculate?operation=add&a=1&b=2");
      expect(duration).toBeLessThan(100);
    });

    it("devrait répondre en moins de 100 ms pour une requête en erreur 400", async () => {
      const { duration } = await request(server, "/calculate?operation=add&a=1");
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Headers de réponse", () => {
    const testCases = [
      { name: "réponse 200", path: "/calculate?operation=add&a=1&b=2" },
      { name: "réponse 400", path: "/calculate?operation=add&a=1" },
      { name: "réponse 404", path: "/unknown" }
    ];

    testCases.forEach(({ name, path }) => {
      it(`devrait inclure les bons en-têtes pour une ${name}`, async () => {
        const { headers } = await request(server, path);
        expect(headers["content-type"]).toBe("application/json; charset=utf-8");
        expect(headers["access-control-allow-origin"]).toBe("*");
      });
    });
  });

  describe("OPTIONS /calculate — preflight CORS", () => {
    it("devrait retourner le bon statut et les bons headers CORS sans corps", async () => {
      const { status, body, headers } = await request(server, "/calculate", "OPTIONS");
      expect(status).toBe(204);
      expect(body).toBeNull();
      expect(headers["access-control-allow-origin"]).toBe("*");
      expect(headers["access-control-allow-methods"]).toContain("GET");
    });
  });

  describe("GET /calculate — cas nominaux", () => {
    it.each`
      operation     | a       | b       | expected
      ${"add"}      | ${2}    | ${3}    | ${5}
      ${"subtract"} | ${10}   | ${4}    | ${6}
      ${"multiply"} | ${6}    | ${7}    | ${42}
      ${"divide"}   | ${20}   | ${5}    | ${4}
      ${"add"}      | ${-5}   | ${-3}   | ${-8}
      ${"subtract"} | ${-5}   | ${-3}   | ${-2}
      ${"multiply"} | ${-3}   | ${-4}   | ${12}
      ${"divide"}   | ${-10}  | ${-2}   | ${5}
    `("devrait retourner $operation pour a=$a et b=$b", async ({ operation, a, b, expected }) => {
      const { status, body } = await request(
        server,
        `/calculate?operation=${operation}&a=${a}&b=${b}`
      );
      expect(status).toBe(200);
      expect(body).toMatchObject({ operation, a, b, result: expected });
    });

    it("devrait retourner une division décimale correcte", async () => {
      const { status, body } = await request(server, "/calculate?operation=divide&a=10&b=3");
      expect(status).toBe(200);
      expect(body.result).toBeCloseTo(3.333, 2);
    });

    it("devrait supporter les nombres décimaux dans la query string", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=1.5&b=2.5");
      expect(status).toBe(200);
      expect(body.result).toBe(4);
    });

    it("devrait respecter le contrat JSON de succès", async () => {
      const { status, body } = await request(server, "/calculate?operation=multiply&a=3&b=4");
      expect(status).toBe(200);
      expect(body).toHaveProperty("operation");
      expect(body).toHaveProperty("a");
      expect(body).toHaveProperty("b");
      expect(body).toHaveProperty("result");
      expect(body).not.toHaveProperty("error");
    });
  });

  describe("Méthode non autorisée", () => {
    it("devrait retourner 405 et avoir un corps avec une erreur pour POST", async () => {
      const { status, body, headers } = await request(server, "/calculate", "POST");
      expect(status).toBe(405);
      expect(body).toHaveProperty("error");
      expect(headers["allow"]).toContain("GET");
    });

    it("devrait retourner 405 pour PUT", async () => {
      const { status } = await request(server, "/calculate", "PUT");
      expect(status).toBe(405);
    });
  });

  describe("GET /calculate — erreurs 400", () => {
    it("devrait retourner 400 si b est manquant", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=2");
      expect(status).toBe(400);
      expect(body.error).toMatch(/Paramètres attendus/);
    });

    it("devrait retourner 400 si a est manquant", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&b=2");
      expect(status).toBe(400);
      expect(body.error).toMatch(/Paramètres attendus/);
    });

    it("devrait retourner 400 si a est non numérique", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=abc&b=3");
      expect(status).toBe(400);
      expect(body.error).toMatch(/doivent être des nombres/);
    });

    it("devrait retourner 400 si b est non numérique", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=3&b=abc");
      expect(status).toBe(400);
      expect(body.error).toMatch(/doivent être des nombres/);
    });

    it("devrait retourner 400 avec un message exact en cas de division par zéro", async () => {
      const { status, body } = await request(server, "/calculate?operation=divide&a=10&b=0");
      expect(status).toBe(400);
      expect(body.error).toBe("Division par zéro impossible.");
    });

    it("devrait retourner 400 si l'opération est inconnue", async () => {
      const { status, body } = await request(server, "/calculate?operation=modulo&a=10&b=3");
      expect(status).toBe(400);
      expect(body.error).toMatch(/Opération inconnue/);
    });

    it("devrait retourner 400 si l'opération est absente", async () => {
      const { status, body } = await request(server, "/calculate?a=5&b=3");
      expect(status).toBe(400);
      expect(body.error).toMatch(/Paramètres attendus/);
    });

    it("devrait respecter le contrat JSON d'erreur", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=2");
      expect(status).toBe(400);
      expect(body).toHaveProperty("error");
      expect(body).not.toHaveProperty("result");
    });
  });

  describe("GET — autres routes", () => {
    it("devrait retourner 404 pour une route inconnue", async () => {
      const { status, body } = await request(server, "/unknown");
      expect(status).toBe(404);
      expect(body.error).toBe("Route introuvable.");
    });

    it("devrait retourner 404 pour la racine /", async () => {
      const { status, body } = await request(server, "/");
      expect(status).toBe(404);
      expect(body).toHaveProperty("error");
    });

    it("devrait retourner 404 pour un slash final /calculate/", async () => {
      const { status, body } = await request(server, "/calculate/");
      expect(status).toBe(404);
      expect(body).toHaveProperty("error");
    });
  });

  describe("Cas limites — edge cases", () => {
    it("devrait gérer une très grande valeur", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=1e308&b=1e308");
      expect(status).toBe(200);
      expect([null, "Infinity", Infinity]).toContain(body.result);
    });

    it("devrait gérer a=-0 correctement", async () => {
      const { status, body } = await request(server, "/calculate?operation=add&a=-0&b=5");
      expect(status).toBe(200);
      expect(body.result).toBe(5);
      expect(body.a).toBe(0);
    });
  });
});
