# Calculatrice multi-backend

Une calculatrice dont le frontend (HTML/CSS/JS natif) peut interroger **trois
backends interchangeables, écrits dans trois langages différents**, qui tournent
tous en même temps. On choisit le backend utilisé depuis un simple fichier
`.env`.

## Architecture

```
┌─────────────┐        /calculate?operation=...&a=...&b=...
│  Frontend   │  ───────────────────────────────────────────►  ┌──────────────┐
│  :8080      │   (le navigateur appelle le port choisi)        │ backend-node │ :3000  (Node.js)
│             │                                                 ├──────────────┤
│ lit le .env │                                                 │ backend-php  │ :3001  (PHP)
│ → /config.js│                                                 ├──────────────┤
└─────────────┘                                                 │ backend-java │ :3002  (Java)
                                                                 └──────────────┘
```

Les trois backends exposent **exactement le même contrat HTTP** :

| Élément            | Valeur                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Route              | `GET /calculate?operation=<op>&a=<n>&b=<n>`                       |
| `op`               | `add` · `subtract` · `multiply` · `divide`                       |
| Succès (200)       | `{ "operation", "a", "b", "result" }`                            |
| Erreur (400/404/405) | `{ "error": "..." }`                                           |
| CORS               | `Access-Control-Allow-Origin: *` (le navigateur peut appeler n'importe quel port) |

## Choisir le backend

Dans `.env` (à la racine) :

```dotenv
BACKEND_HOST=localhost
BACKEND_PORT=3000   # 3000 = Node | 3001 = PHP | 3002 = Java
```

Le frontend lit ces valeurs et sert un `/config.js` qui pointe le navigateur
vers le bon port. Pour basculer de techno :

```bash
# éditer BACKEND_PORT dans .env, puis :
docker compose up -d frontend
# et recharger http://localhost:8080
```

## Démarrer

```bash
docker compose up --build
```

- Frontend : http://localhost:8080
- Node : http://localhost:3000/calculate?operation=add&a=2&b=3
- PHP  : http://localhost:3001/calculate?operation=add&a=2&b=3
- Java : http://localhost:3002/calculate?operation=add&a=2&b=3

## Tests

Les tests **unitaires et d'intégration de chaque techno sont exécutés pendant le
build de l'image** correspondante : si un test échoue, `docker compose build`
échoue.

| Techno | Unitaires            | Intégration                              | Outil    |
| ------ | -------------------- | ---------------------------------------- | -------- |
| Node   | `tests/calculator.test.js` | `tests/api.test.js`                | Jest     |
| PHP    | `backends/php/tests/CalculatorTest.php` | `backends/php/tests/ApiTest.php` | PHPUnit  |
| Java   | `backends/java/.../CalculatorTest.java` | `backends/java/.../ApiTest.java` | JUnit 5  |

En CI (GitHub Actions, [.github/workflows/ci.yml](.github/workflows/ci.yml)),
chaque techno a son propre job qui lance ses tests nativement (sans Docker) :
`test` (Node/Jest), `test-php` (PHPUnit), `test-java` (JUnit/Maven), plus `lint`
et `e2e` (Playwright).

Pour lancer une suite isolément :

```bash
docker compose build backend-node   # Jest
docker compose build backend-php     # PHPUnit
docker compose build backend-java    # JUnit
```

Les tests E2E Playwright du frontend restent inchangés (`npm run test:e2e`) et
fonctionnent en local : sans `.env` configuré, `/config.js` est vide et le
serveur web délègue lui-même `/calculate` (backend Node embarqué).
