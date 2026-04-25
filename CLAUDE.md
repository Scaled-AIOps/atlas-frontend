# Atlas Frontend — Claude Code memory

Angular 21 SPA that consumes [atlas-service](https://github.com/Scaled-AIOps/atlas-service). Zoneless, signal-based, no NgModules.

## Quick orientation

| Need to… | Look at |
|---|---|
| Touch auth | `core/auth/` — `auth.service.ts` (signal state), `auth.interceptor.ts` (bearer + 401 → logout), `auth.guard.ts` (route protection). Login UI lives in `features/login/` |
| Change the API base URL | `src/environments/environment*.ts` |
| Add a new list page | mirror `features/squads/squads-list/` — declare a `ListState<T>`, drop in `<app-list-controls>` + `<app-pagination>`, render `state.page()` |
| Add a new filter / sort / search field on a list | the page's `constructor()` — push into `state.searchFields` / `filterFields` / `sortFields`. Filter dropdown values auto-derive from data. `label` should be a translation key, e.g. `'squads.col.tribe'` |
| Add or rename a UI string | edit `public/i18n/en.json` AND `public/i18n/de.json` — keys must match. Templates use `{{ 'key.path' \| translate }}` or `translate: { count: x, key: y }` for interpolation |
| Add a new locale | drop `public/i18n/<lang>.json`, add `'<lang>'` to `SUPPORTED_LOCALES` in `core/i18n/locale.service.ts` |
| Change the API base URL | `src/environments/environment*.ts` — dev uses `/api` (proxied), prod uses `/api` (same-origin) |
| Tweak the dev proxy | `proxy.conf.json` (rewrites `/api` → `:3000`); wired in `angular.json → serve.options.proxyConfig` |
| Add a new resource | new `core/api/models.ts` interface + `AtlasApi` method, then list/detail components under `features/<name>/` |
| Change the global blue theme | `src/styles.scss` `:root { --blue-* }` palette |
| Touch the graph view | `features/graph/graph-view/` — `buildData()` is the topology builder, `rebuild()` is the vis-network mount |
| Change the shell layout | `shared/shell/shell.{ts,html,scss}` — sidebar, topbar (with language picker), router-outlet |

## Architecture rules

- **Standalone components only** — every component has its own `imports: [...]`. No NgModules, no `app.module.ts`.
- **Signals end-to-end** — page state is `signal()`, derived state is `computed()`, side effects are `effect()`. Use `viewChild()` (signal) over `@ViewChild` so refs update reactively.
- **Lazy routes** — every feature is `loadComponent: () => import('./...').then(m => m.X)`. Initial bundle stays tiny; the graph chunk is the largest at ~530 kB.
- **`ListState<T>` is a class, not a service** — instantiated once per page, no DI. Filter / sort / paginate happen client-side in `computed()` signals.
- **Cross-resource navigation** — every list table cell that mentions another resource (e.g. an app's `squad`) is a `routerLink` to that resource's detail page. Squad ↔ app ↔ infra ↔ deploy history are all wired.
- **Auth = email + shared token** — `AuthService.loginWithToken(email, token)` → `POST /api/auth/login/token`. The server enforces both gates (token matches `AUTH_TOKEN`, email is a squad member). The response `{ email, token, squads }` is persisted in `localStorage.atlas.auth` and the token is attached by `auth.interceptor.ts` on every `/api/*` call. 401 from any endpoint → `auth.logout()` + redirect to `/login`.
- **All routes except `/login` are guarded** by `authGuard` (applied to the `Shell` parent route via `canActivate` + `canActivateChild`). The guard preserves `returnUrl` so users land where they tried to go.
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
| TribeDomains | `/tribedomains` | array | top tier; carries `lead` |
| SubDomains | `/subdomains` | array | second tier; FK to tribeDomain.name; carries `lead` |
| Tribes | `/tribes` | array | third tier; FKs to subDomain + tribeDomain; carries `lead` AND `releaseManager` |
| Squads | `/squads` | array | filter/sort/paginate via query params (handled server-side) but we apply them client-side too |
| Infra | `/infra` | array | env enum: `local \| dev \| int \| uat \| prd` |
| AppInfo | `/appinfo` | array | flat platform fields per env: `localPlatform`, `devPlatform`, `intPlatform`, `uatPlatform`, `prdPlatform` |
| AppStatus | `/appstatus` | array of records | each record has top-level env keys (`local`, `dev`, `int`, `uat`, `prd`) holding deploy entry arrays |

App status enum: `active | inactive | marked-for-decommissioning | failed`.
Deploy state enum: `success | failed | pending | rolledback`.
Java compliance enum: `compliant | non-compliant | exempt | unknown`.

A deploy entry in `appstatus` has 11 fields: `version`, `commitId`, `branch`, `deployedBy`, `deployedAt`, `state`, `notes`, `xray`, `javaVersion`, `javaComplianceStatus`, `changeRequest`. The last four are appended optionally; when missing the server returns `""`.

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
- **Filter / sort field labels are translation keys, not literal strings** — pages set `label: 'squads.col.tribe'` and the shared `<app-list-controls>` runs them through the `translate` pipe. Means filter chips, sort dropdown options, and dropdown headers all flip language with the rest of the UI.
- **The interceptor skips `/auth/login` URLs** — even though the only login route is `/auth/login/jira` today, the interceptor still uses an `includes('/auth/login')` substring guard so future sibling endpoints (e.g. `/auth/login/ad`) don't trigger the 401-recovery path on their own error responses.
- **Auth state survives full reloads but not across users** — `localStorage.atlas.auth` stores `{ token, email, squads, displayName }`. To "log in as someone else", clear that key from devtools or click *Sign out*.
- **Language `<select>` uses `[selected]` on options, not `[value]` on the select** — Angular's `[value]` on a native `<select>` doesn't update the displayed option without `ngModel` + `FormsModule`; the simpler `[selected]="l === current()"` on each `<option>` keeps the picker glyph correct.
- **`overrides.uuid: ^14` in package.json** — silences three moderate npm-audit advisories that come transitively from `vis-data` → `vis-network` → `uuid <14`. The advisory only affects `uuid.v3()/v5()/v6()` with a buffer arg; vis uses `uuid.v4()`. The override forces the patched line everywhere, audit goes from 3 → 0 vulnerabilities, runtime is unchanged.

## Out of scope (future plans)

- Auth UI — we read the `AUTH_TOKEN` once but there's no login form yet (atlas-service token is shared)
- Mutations — list/detail pages are read-only; no Create/Edit forms yet
- **Atlassian OAuth 2.0 (3LO) "Sign in with Jira"** — would replace the API-token paste with a redirect-based flow. Requires registering an OAuth app in Atlassian's developer console + handling the callback. Today's API-token form is the simplest design that *actually* authenticates without OAuth infrastructure.
- A `/feedback` admin page (paired with a server-side feedback resource)
- E2E tests — only unit-level coverage today
- Dark mode toggle — palette is set up via CSS variables, but only the light theme exists
- A11y pass — keyboard nav works for routing and the search box, but the graph and dropdowns haven't been audited
- More locales — only `en` and `de` ship today; the loader is generic so adding a third language is JSON-only
