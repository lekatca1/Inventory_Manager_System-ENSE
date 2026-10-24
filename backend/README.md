# Inventory Manager backend (Java 17+, SQLite)

A small REST/JSON API. It uses only the JDK, plus the sqlite-jdbc driver jar for the database.

## Quick start (does steps 1-4 below for you)
Install a JDK (Java 17+), then from the `backend` folder:

    Windows (PowerShell):   .\run-tests.ps1
    Mac / Linux:            bash run-tests.sh

It downloads the SQLite driver, compiles, and runs the tests twice (in-memory, then SQLite).
Take your screenshot of the terminal when you see `30/30 checks passed` under "Tests with SQLite".
(A harmless slf4j warning may appear.)

Extra screenshots: start the server with `.\run-server.ps1` or `bash run-server.sh`, then open
http://localhost:8080/api/products in a browser (JSON list of products). The file `backend/inventory.db`
can be opened with DB Browser for SQLite to show the real database table.

## Endpoints
| Method | Path | Purpose | Requirement |
|---|---|---|---|
| GET | `/api/products?q=` | list / search by name or code | FR-06 |
| POST | `/api/products` | create (template, duplicate and input checks) | FR-01, FR-04 |
| POST | `/api/products/{id}/restock` `{qty}` | add a pack | FR-05 |
| POST | `/api/products/{id}/adjust` `{delta}` | manual adjustment (never below 0) | FR-07 |
| POST | `/api/scan` `{barcode}` | remove one unit | FR-02 |
| GET / PUT | `/api/template` | read / change code template (PUT needs `X-Role: admin`) | FR-04, NFR-04 |

Limits: the role is a header sent by the frontend, so it is **not real authentication** (D-10 only partly
addressed). There is no audit log (D-11).

## 1. Compile
    cd backend
    javac -d out src/*.java test/ApiTest.java

## 2. Test with in-memory data (no driver needed)
    java -cp out ApiTest

## 3. Get the SQLite driver (one-time, no install)
Download these two jars into a new `backend/lib` folder (from https://repo1.maven.org/maven2):
- `org/xerial/sqlite-jdbc/3.46.1.3/sqlite-jdbc-3.46.1.3.jar`
- `org/slf4j/slf4j-api/2.0.13/slf4j-api-2.0.13.jar`

## 4. Test with SQLite
    java -cp "out:lib/*" ApiTest sqlite          # Windows: use ";" instead of ":"

## 5. Run the server
    java -cp "out:lib/*" ApiServer               # SQLite file backend/inventory.db (created on first run)
    java -cp out ApiServer memory                # or throw-away in-memory data, no driver needed

## 6. Connect the frontend
    # from the frontend folder (PowerShell: $env:VITE_API_URL="http://localhost:8080/api"; npm run dev)
    VITE_API_URL=http://localhost:8080/api npm run dev
Without `VITE_API_URL` the frontend uses its built-in mock data, as in the Playwright suite.

## Extra: SQL check without Java
    python3 test/sql_check.py                    # runs the SQL from SqliteStore.java in Python's SQLite
