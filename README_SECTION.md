## Final project folders (Assessment 2)

- `frontend/` - the React app and the Playwright test suite (`cd frontend`, `npm install`, `npm run dev`, `npm test`).
- `backend/` - the Java REST API with a SQLite database and its tests (see `backend/README.md`). It is compiled with `javac`, separate from the Maven project in `pom.xml`.

To use the backend from the frontend: start it (`backend/run-server.ps1`), then in `frontend` run
`$env:VITE_API_URL="http://localhost:8080/api"; npm run dev`.

Database: the project uses SQLite (`org.xerial:sqlite-jdbc`). The earlier MariaDB4j setup was removed, so delete `database/DatabaseManager.java`.
