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

Le frontend expose un **sélecteur** (en haut de la calculatrice) qui bascule de
backend **à chaud** : aucun rebuild, la bascule est instantanée et mémorisée
(`localStorage`). Chaque entrée du menu affiche une pastille de disponibilité
alimentée par les calculs réels (verte = a répondu, rouge = injoignable).

Le `.env` (à la racine) ne fait plus que définir le backend **présélectionné**
au premier chargement :

```dotenv
BACKEND_HOST=localhost
BACKEND_PORT=3000   # 3000 = Node | 3001 = PHP | 3002 = Java
```

`web/server.js` lit ce port et sert un `/config.js` exposant le catalogue des
backends (`window.__CALC_BACKENDS__`) et l'identifiant par défaut
(`window.__CALC_DEFAULT__`) ; le navigateur appelle ensuite directement le port
choisi (CORS `*` sur les trois).

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

Les tests E2E Playwright du frontend (`npm run test:e2e`) tournent en local via
`npm start` : le serveur web embarque l'API Node et délègue lui-même
`/calculate`, si bien que le backend Node par défaut répond en même origine.

## Benchmark des trois backends

Comparatif des trois implémentations du **même contrat HTTP**. Mesures réalisées
en local (Docker Desktop sous Windows), après *warm-up*, avec un petit client
Node (`http` + keep-alive) :

- **Latence** : 1 000 requêtes séquentielles `GET /calculate?operation=multiply&a=123&b=456`.
- **Débit** : 5 000 requêtes à concurrence 50.
- Les chiffres sont la médiane de plusieurs séries — ce sont des **ordres de
  grandeur relatifs**, pas des valeurs de production.

### Performance

| Backend     | Latence moy. |     p95 |     p99 |          Débit (c=50) |
| ----------- | -----------: | ------: | ------: | --------------------: |
| **Node.js** |  **~0,4 ms** | ~0,7 ms | ~1,1 ms | **~6 500–7 400 req/s** |
| **PHP**     |       ~5 ms  |  ~10 ms |  ~18 ms |        ~400–600 req/s |
| **Java**    |     ~50 ms\* |  ~50 ms |  ~60 ms |            ~940 req/s |

\* La latence Java quasi constante (~50 ms) n'est **pas** du temps de calcul :
c'est l'interaction *delayed-ACK / Nagle* du `HttpServer` intégré au JDK (pas de
`TCP_NODELAY` par défaut). Le calcul lui-même est instantané ; sous forte
concurrence l'artefact s'amortit, d'où un débit supérieur à celui de PHP malgré
la latence unitaire élevée.

**Lecture :**

- **Node** écrase la latence : un unique processus *event-loop* persistant, zéro
  démarrage par requête → sous-milliseconde.
- **PHP** est plafonné par le serveur de dev `php -S`, **mono-processus** : les
  requêtes sont sérialisées, d'où le débit le plus faible.
- **Java** paie l'artefact TCP ci-dessus en latence unitaire, mais encaisse bien
  la concurrence (thread par connexion).

### Qualité de code

| Critère                 | Node.js                      | PHP                                             | Java                                    |
| ----------------------- | ---------------------------- | ----------------------------------------------- | --------------------------------------- |
| LOC source (hors tests) | **124**                      | 175                                             | 199                                     |
| Typage                  | dynamique                    | graduel (`declare(strict_types=1)` + type hints) | **statique (compilé)**                  |
| Vérification statique   | ESLint                       | —                                               | compilateur `javac`                     |
| Séparation des couches  | `Calculator` + `server`      | `Calculator` + `Router` + `index`               | `Calculator` + `Router` + `Server`      |
| Runtime                 | node:22-alpine               | php:8.2-cli                                      | temurin-17                              |

Les trois isolent la **logique de calcul pure** (`Calculator`) du transport HTTP,
ce qui rend le cœur trivialement testable. Node est le plus compact ; Java le plus
verbeux mais le seul à offrir une sécurité de types **à la compilation**.

### Tests

| Backend | Framework    |                        Cas | LOC de test | Exécutés au build |
| ------- | ------------ | -------------------------: | ----------: | :---------------: |
| Node.js | Jest         | **31** (22 intég. + 9 unit.) |         293 |   ✅ `npx jest`    |
| PHP     | PHPUnit 10.5 |                         15 |         232 |    ✅ `phpunit`    |
| Java    | JUnit 5.10   |                         15 |         202 |  ✅ `mvn package`  |

Chaque suite couvre le même contrat (opérations, validation, erreurs 400/404/405,
CORS). Le build Docker de chaque image **échoue si un test échoue**.

### En résumé

|             | Latence | Débit | Compacité | Typage statique | Tests |
| ----------- | :-----: | :---: | :-------: | :-------------: | :---: |
| **Node.js** |   🥇    |  🥇   |    🥇     |       ➖        |  🥇   |
| **PHP**     |   🥈    |  🥉   |    🥈     |       🥈        |  🥈   |
| **Java**    |  🥉\*   |  🥈   |    🥉     |       🥇        |  🥈   |

Pour ce contrat minimal, **Node.js** est le plus rapide et le plus concis. **Java**
apporte la robustesse du typage statique au prix de la verbosité (et d'un serveur
intégré non tuné). **PHP** offre un bon compromis lisibilité / typage graduel,
ici bridé par son serveur de développement mono-processus.
