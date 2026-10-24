# Inventory Manager - frontend prototype and QA suite (ENSE707)

## Run
    npm install
    npm run dev            # app
    npx playwright install chromium

## Test
    npm run test:smoke     # @smoke - runs first in CI
    npm test               # all tests except @defect (blocking quality gate)
    npm run test:defects   # tests that encode OPEN defects (expected to fail until fixed)
    npm run test:all

Test IDs (TC-xx) match `QA_Evidence_Workbook.xlsx` (Test Cases, RTM, Defect Register).
Tags: `@smoke`, `@defect` (open defect), `@security`, `@accessibility`, `@quality`.
When you fix a defect: fix the code, run its test, delete the `@defect` tag, set the register row to Closed.

## Backend (optional)
A Java/SQLite API is in `backend/` (see `../backend/README.md`). Set `VITE_API_URL=http://localhost:8080/api`
to make the frontend use it. Without it, the app runs on mock data and the Playwright suite is unaffected.
