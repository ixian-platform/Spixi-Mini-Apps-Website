<!-- Copilot instructions for working on the Spixi Mini Apps Website -->
# Copilot instructions — Spixi Mini Apps Website

Purpose: give AI coding agents the minimal, concrete knowledge to make productive changes in this repo.

Key files
- `index.html` — single-page static site scaffold and example featured cards.
- `js/app.js` — authoritative runtime: loads `data/apps.json`, renders the apps grid, search, filters, and "load more" behavior.
- `data/apps.json` — canonical source-of-truth for listed apps. Edit this to add/remove apps or categories.
- `assets/images/` and `assets/icons/` — images referenced by `data/apps.json` and `index.html`.
- `assets/css/variables.css` and `assets/css/styles.css` — site styles; classes follow a BEM-like convention (e.g. `app-card__title`, `hero__content`).

Project architecture (big picture)
- This is a static site (no build step). `index.html` loads `js/app.js`, which fetches `data/apps.json` at runtime and populates `#app-grid`.
- The app listing data (name, description, icon, category, spixiUrl, github) lives in `data/apps.json` and drives client rendering.
- There are two presentation areas: a hard-coded Featured section in `index.html` (example cards) and the dynamic Directory rendered by `js/app.js`.

Discoverable conventions and patterns
- Apps schema (from `data/apps.json`):
  - `id`, `name`, `publisher`, `description`, `category`, `featured` (bool), `icon`, `spixiUrl`, `github`.
  - `spixiUrl` typically uses the `spixi://app/{id}` deep link pattern — keep that format when present.
- UI behavior in `js/app.js`:
  - Initial `displayedCount = 9`; `appsPerPage = 6` (used by "Load more").
  - Filtering: `activeCategory` and `searchTerm` are applied together in `getFilteredApps()`.
  - `createAppCard(app)` returns an HTML string; icons fall back to `assets/images/placeholder-app.png` via `onerror`.
- Categories array in `data/apps.json` drives category buttons; update it if you add a new category.

Practical edit rules for agents
- To add an app:
  1. Add a JSON object to `data/apps.json` with fields matching existing entries.
  2. Add the referenced image to `assets/images/` and ensure path matches the `icon` field.
  3. (Optional) Add a `github` URL and `spixiUrl` if available.
  4. If you add a new category, append it to the `categories` array in `data/apps.json` and verify a corresponding filter button exists (or update `index.html` filter UI).
- To edit rendering or features prefer changing `js/app.js` (single runtime entry). If you change DOM structure, update corresponding CSS classes in `styles.css`.
- Avoid editing hard-coded featured cards in `index.html` unless intentionally replacing them with dynamic rendering; `js/app.js` includes `getFeaturedApps()` (currently unused) — you can wire that up to replace the static featured markup.

Developer workflows (how to run and test)
- No build: open `index.html` directly in the browser for a quick check, but some browsers restrict `fetch` from `file://`. Use a local static server for accurate runtime behavior.
- Common local servers (PowerShell examples):
  - Python 3: `python -m http.server 8000; start http://localhost:8000`
  - Node (if `serve` installed): `npx serve -s . -l 8000`
  - VS Code: use the Live Server extension and open `index.html`.

Testing checklist for changes
- When changing `data/apps.json`, verify:
  - `fetch` succeeds in the browser console and `apps` array populates.
  - Images load and fallback works (`placeholder-app.png` appears for missing icons).
  - Search, category filters, and "Load more" behave as expected.
- When changing `js/app.js`, run in browser and check console for errors; this repo has no automated tests.

Integration and external dependencies
- External resources: Google Fonts and some external links (Spixi/Ixian sites). There is no package.json or node toolchain in the repo.
- Deep links: `spixi://app/{id}` are used to open apps in the Spixi client. Do not change the scheme unless coordinating with the Spixi client.

Examples from codebase
- Add app example (fields copied from `data/apps.json`):
  {
    "id": "example-app",
    "name": "Example App",
    "publisher": "YourName",
    "description": "Short description.",
    "category": "Tools",
    "featured": false,
    "icon": "assets/images/example-app.png",
    "spixiUrl": "spixi://app/example-app",
    "github": "https://github.com/your/repo"
  }

Hints and gotchas for AI agents
- The Featured section in `index.html` is currently static; `js/app.js` has utilities (`getFeaturedApps()`) that can be used to make it dynamic — mention this when proposing changes.
- `fetch('data/apps.json')` runs in the browser. Use a local static server during development to avoid CORS/file protocol issues.
- Keep markup and CSS class names stable (BEM-like). If you rename a class, update all references in `index.html`, `js/app.js`, and `styles.css`.

When making PRs
- Edit `data/apps.json` and add assets in a single PR. Provide a short description of the change and include a screenshot of the rendered page (or a link to a deployed preview).

If anything here is unclear or you'd like more details (example PR template, dynamic featured implementation, or a preview script), tell me which part to expand.
