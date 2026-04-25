# Atlas Frontend — Claude Code memory

Angular 21 SPA that consumes [atlas-service](https://github.com/Scaled-AIOps/atlas-service). Zoneless, signal-based, no NgModules.

## Quick orientation

| Need to… | Look at |
|---|---|
| Add a new list page | mirror `features/squads/squads-list/` — declare a `ListState<T>`, drop in `<app-list-controls>` + `<app-pagination>`, render `state.page()` |
| Add a new filter / sort / search field on a list | the page's `constructor()` — push into `state.searchFields` / `filterFields` / `sortFields`. Filter dropdown values auto-derive from data |
| Change the API base URL | `src/environments/environment*.ts` — dev uses `/api` (proxied), prod uses `/api` (same-origin) |
| Tweak the dev proxy | `proxy.conf.json` (rewrites `/api` → `:3000`); wired in `angular.json → serve.options.proxyConfig` |
| Add a new resource | new `core/api/models.ts` interface + `AtlasApi` method, then list/detail components under `features/<name>/` |
| Change the global blue theme | `src/styles.scss` `:root { --blue-* }` palette |
| Touch the graph view | `features/graph/graph-view/` — `buildData()` is the topology builder, `rebuild()` is the vis-network mount |
| Change the shell layout | `shared/shell/shell.{ts,html,scss}` — sidebar, topbar, router-outlet |

## Architecture rules

- **Standalone components only** — every component has its own `imports: [...]`. No NgModules, no `app.module.ts`.
- **Signals end-to-end** — page state is `signal()`, derived state is `computed()`, side effects are `effect()`. Use `viewChild()` (signal) over `@ViewChild` so refs update reactively.
- **Lazy routes** — every feature is `loadComponent: () => import('./...').then(m => m.X)`. Initial bundle stays tiny; the graph chunk is the largest at ~530 kB.
- **`ListState<T>` is a class, not a service** — instantiated once per page, no DI. Filter / sort / paginate happen client-side in `computed()` signals.
- **Cross-resource navigation** — every list table cell that mentions another resource (e.g. an app's `squad`) is a `routerLink` to that resource's detail page. Squad ↔ app ↔ infra ↔ deploy history are all wired.
- **No global state library** — Angular signals + injected services are enough.

## Conventions

| Concern | Convention |
|---|---|
| Field naming | camelCase — matches atlas-service contract (`tribeDomain`, `appId`, `prdPlatform`) |
| Identifier style | kebab-case primary keys (`squad.key = 'data-platform'`, `app.appId = 'auth-api'`) |
| Component class names | PascalCase, no `Component` suffix (Angular CLI 21 default — `Dashboard`, `SquadsList`, `GraphView`) |
| Component selectors | `app-` prefix (`app-list-controls`, `app-pagination`) |
| File names | kebab-case matching the class (`squads-list.ts`, `appinfo-detail.html`) |
| SCSS variables | Always use CSS custom properties (`--blue-600`, `--text-strong`, `--surface-card`). Never inline hex colours in component styles |
| Loading / error states | Pages expose `loading = signal(true)` and `error = signal<string\|null>(null)`; templates show spinners / error blocks before data |
| Subscribes | `subscribe({ next, error })` in `ngOnInit`. No async pipe — signals already drive change detection |

## API contract (mirrors atlas-service)

| Resource | Path | List shape | Notes |
|---|---|---|---|
| Squads | `/squads` | array | filter/sort/paginate via query params (handled server-side) but we apply them client-side too |
| Infra | `/infra` | array | env enum: `local \| dev \| int \| uat \| prd` |
| AppInfo | `/appinfo` | array | flat platform fields per env: `localPlatform`, `devPlatform`, `intPlatform`, `uatPlatform`, `prdPlatform` |
| AppStatus | `/appstatus` | array of records | each record has top-level env keys (`local`, `dev`, `int`, `uat`, `prd`) holding deploy entry arrays |

App status enum: `active | inactive | marked-for-decommissioning | failed`.
Deploy state enum: `success | failed | pending | rolledback`.

## Common commands

```bash
# Dev loop
npm install
npm start                                       # ng serve on :4200, /api proxied to :3000
npm run build                                   # production build → dist/atlas-frontend

# Pair with atlas-service in another terminal
cd ../atlas-service && npm start                # :3000

# Seed atlas-service so the frontend has something to show
cd ../atlas-service
node scripts/mock_data.js seed                  # 16 squads
node scripts/mock_infra.js seed                 # 16 infra
node scripts/mock_appinfo.js seed               # 52 apps
node scripts/mock_appstatus.js seed             # 18 deploy events

# Tests
npm test                                        # vitest
```

## Things that look weird but are intentional

- **Graph view's `requestAnimationFrame` poll loop** — vis-network needs a non-zero-sized container before instantiation. The graph host element only exists once the `@if (loading) {} @else { <div #graphHost> }` branch flips, so we poll until `viewChild()` returns truthy.
- **Per-node colour overrides group colour** — vis-network's default group palette would rotate through random hues; we set `groups: { useDefaultGroups: false }` and remove the `group` field on nodes so the per-node `color` we computed (status-based for apps, env-based for infra, palette-tint for tribal hierarchy) wins.
- **`config/openapi.yaml` is fetched from atlas-service**, not bundled here — the spec lives with the API.
- **Export uses `state.sorted()` not `state.page()`** — exporting only the visible page would be a footgun; users expect "the rows I can see plus all the rows I'd see if I paged through".
- **`anyComponentStyle` budget bumped to 8 kB / 16 kB** in `angular.json` — `graph-view.scss` exceeds the default 4 kB because of the rich side-panel + legend + toolbar styles. This is intentional, not bloat.
- **CSV export JSON-encodes nested objects/arrays inside cells** — atlas-service squad fields like `mailingList`, `ao`, `tags` are arrays/objects; CSV is flat. We stringify them to keep one row per record. JSON / YAML exports preserve the native shape.

## Out of scope (future plans)

- Auth UI — we read the `AUTH_TOKEN` once but there's no login form yet (atlas-service token is shared)
- Mutations — list/detail pages are read-only; no Create/Edit forms yet
- A `/feedback` admin page (paired with a server-side feedback resource)
- E2E tests — only unit-level coverage today
- Dark mode toggle — palette is set up via CSS variables, but only the light theme exists
- A11y pass — keyboard nav works for routing and the search box, but the graph and dropdowns haven't been audited
