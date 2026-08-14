# Repository Guidelines

## Project Structure & Module Organization

- `src/frontend/` contains the source JavaScript and CSS for the SPA/PWA; `src/services/` contains API clients.
- `public/` is the browser-served output. Keep JavaScript and copied data synchronized with `src/` by running the build; do not edit generated files manually.
- `backend/` contains the Express API and PGlite database code; `data/` contains versioned question banks and contributions.
- `src/python/scripts/` provides question validation, generation, translation, and data tooling.
- `__tests__/` contains Jest tests; `docs/` contains architecture, API, and contribution documentation; `img/` contains visual assets.

## Build, Test, and Development Commands

Run `npm install` after cloning. Common commands are:

```bash
npm test -- --runInBand   # Run Jest tests serially
npm run test:coverage     # Run tests and enforce coverage thresholds
npm run lint              # Check JavaScript with ESLint
npm run format:check      # Check Prettier formatting
npm run build             # Build frontend assets into public/
npm run dev               # Start API and local frontend server
```

For local database/API work, use `npm run api:dev` or `npm run db:dev` with settings from `.env.example`. Python tooling requires Python 3.12+ and `pip install -r src/python/scripts/requirements.txt`.

## Coding Style & Naming Conventions

Use JavaScript ES modules, two-space indentation, semicolons, and Prettier formatting. Use `camelCase` for variables/functions, `PascalCase` for classes, and descriptive `kebab-case` or existing project naming for files. ESLint treats unused variables as errors (prefix intentionally unused arguments with `_`) and console usage as a warning.

## Testing Guidelines

Add or update Jest tests in `__tests__/` with names ending in `.test.js`. Use `npm test -- --runInBand` for the full suite and target relevant tests during iteration. Run the build when changing frontend, validation, or question data. Validate contributed question files with `python src/python/scripts/validate_contribution.py <file>`.

## Commit & Pull Request Guidelines

Recent history contains short feature and fix commits; follow the documented Conventional Commits standard for new work, such as `feat(api): add question filter`, `fix(frontend): repair offline fallback`, or `docs: update roadmap`. Use descriptive branches such as `feature/ui/short-issue-name` or `fix/api/short-issue-name`.

PRs should explain what and why, list verification commands, identify known risks, and include screenshots for visual changes. Do not commit `.env` or local PGlite data. Update documentation when contracts, commands, or user flows change.

## Security & Configuration Tips

Keep credentials in `.env`, never in tracked files. Preserve the application's offline/local-storage fallback when changing API-backed flows, and review backend configuration before exposing a local service.
