# Atlas Frontend

Angular 21 SPA that consumes [atlas-service](https://github.com/Scaled-AIOps/atlas-service) and presents the squad / infra / app / deploy catalog as browsable lists, detail pages, and an interactive tribal-hierarchy graph.

Features:

- **Dashboard** — top-level metrics across all four resources
- **Graph view** — 5-tier left-to-right hierarchy (Tribe Domain → Sub-domain → Tribe → Squad → App), each tribe domain rendered as a "river of colour" with curved edges; click to focus a branch, double-click to drill into the resource
- **List pages** for squads, infra, applications, deployments — each backed by a shared toolbar with **search**, **filter chips**, **sort**, **pagination**, and **CSV / JSON / YAML export**
- **Detail pages** for every resource, with cross-links between squad ↔ app ↔ infra ↔ deploy history
- **Jira-based login** — sign in with your Jira email + a Jira API token; the server validates against `${JIRA_BASE_URL}/rest/api/3/myself` and exchanges that for a bearer token (auto-attached to every API call)
- **Multi-language** UI — English and German, switchable from the topbar; persists in `localStorage`
- **Role-aware quick actions** on the dashboard — see your squads, your apps grouped by status, your recent deploys, and a one-click jump to your squad
- **Blue colour theme** (CSS variables) with a fixed sidebar shell

The whole app is **zoneless** (Angular 21 default) and uses **signals** end-to-end for reactivity.

---

## Quick start

```bash
npm install
npm start                           # ng serve on :4200, /api proxied to :3000
```

Visit <http://localhost:4200>. The dev server proxies `/api/*` → `http://localhost:3000` (atlas-service), so run atlas-service on `:3000` first.

```bash
npm run build                       # production build → dist/atlas-frontend
npm test                            # vitest
```

---

## Project layout

```
atlas-frontend/
├── proxy.conf.json                       # /api → http://localhost:3000
├── public/
│   └── i18n/
│       ├── en.json                       # English UI strings
│       └── de.json                       # German UI strings
├── src/
│   ├── environments/
│   │   ├── environment.ts                # production: apiBaseUrl = '/api'
│   │   └── environment.development.ts    # dev: apiBaseUrl = '/api' (proxied)
│   ├── styles.scss                       # global blue theme + .card/.table/.badge/.btn primitives
│   ├── index.html                        # Inter font, app-root mount
│   └── app/
│       ├── app.{ts,html,routes,config}   # bootstrap + lazy routes + ngx-translate provider
│       ├── core/
│       │   ├── api/
│       │   │   ├── atlas-api.ts          # injectable HttpClient wrapper for all 4 resources
│       │   │   └── models.ts             # TypeScript interfaces matching the API
│       │   ├── auth/
│       │   │   ├── auth.service.ts       # signal-backed { token, email, squads }; persists in localStorage
│       │   │   ├── auth.interceptor.ts   # adds Bearer header; on 401 → logout + /login
│       │   │   └── auth.guard.ts         # CanActivate redirect to /login?returnUrl=…
│       │   └── i18n/
│       │       └── locale.service.ts     # signal-backed locale state + localStorage persistence
│       ├── shared/
│       │   ├── shell/                    # sidebar + topbar layout (incl. language picker)
│       │   ├── list-state.ts             # generic ListState<T> signal class (search/filter/sort/page)
│       │   ├── list-controls/            # shared toolbar component (search, filter dropdowns, chips, sort, export, pagesize)
│       │   ├── pagination/               # "Showing X-Y of Z" + Prev/Next
│       │   └── export.ts                 # CSV / JSON / YAML serializers + Blob download
│       └── features/
│           ├── login/                    # Jira email + API-token form
│           ├── dashboard/                # 4 metric cards + role-aware quick actions
│           ├── graph/graph-view/         # vis-network 5-tier hierarchy
│           ├── squads/{list,detail}/
│           ├── infra/{list,detail}/
│           ├── appinfo/{list,detail}/
│           └── appstatus/{list,detail}/
└── angular.json                          # proxy config wired into the serve target
```

---

## Architecture

### State for list pages

Every list page (`squads`, `infra`, `appinfo`, `appstatus`) declares a single `ListState<T>` instance with three configs:

```ts
state.searchFields = [(s) => s.key, (s) => s.name, (s) => s.po];
state.filterFields = [
  { key: 'tribeDomain', label: 'Tribe domain', pick: (s) => s.tribeDomain },
  { key: 'tribe',       label: 'Tribe',        pick: (s) => s.tribe },
];
state.sortFields = [
  { key: 'key',  label: 'Key',  pick: (s) => s.key },
  { key: 'name', label: 'Name', pick: (s) => s.name },
];
```

`ListState` exposes signals for `source`, `search`, `sort`, `filters`, `limit`, `offset`, plus computed signals for `filtered`, `sorted`, `page`, `total`, `pageStart`, `pageEnd`, `canPrev`, `canNext`. Filtering is OR-within-field, AND-across-fields. Filter dropdown values are auto-derived from distinct values in the source data — no hard-coded enum lists.

### Shared toolbar

`<app-list-controls [state]="state" exportName="squads" />` renders the entire toolbar — search box, one filter dropdown per `filterFields` entry, removable chip strip with "Clear all", sort dropdown (each sort field gets `↑` and `↓` options), per-page selector (10/25/50/100), and the **Export** button. Export serializes the **filtered + sorted** result (not just the visible page) and downloads it as `<exportName>-YYYY-MM-DD.{csv|json|yaml}`.

`<app-pagination [state]="state" />` is the footer.

### Graph view

`features/graph/graph-view/` derives the 5-tier topology client-side:

- **Tribe Domain** (level 0) — distinct values of `squad.tribeDomain`
- **Sub-domain** (level 1) — distinct `(tribeDomain, subDomain)` pairs
- **Tribe** (level 2) — distinct `(tribeDomain, subDomain, tribe)` triples
- **Squad** (level 3) — actual squad records
- **App** (level 4) — apps linked to a squad via `app.squad`

Each tribe domain is assigned a hue from a curated 8-colour palette (blue, teal, purple, amber, rose, emerald, indigo, cyan); descendants inherit progressively lighter tints of the same hue. App nodes have a status-colored border (active/failed/inactive/marked-for-decommissioning). Edges use cubic-Bezier curves matching their domain's tint. vis-network's hierarchical layout (`direction: 'LR'`) handles placement; physics is disabled for stability.

Click any node → side panel slides in with its metadata and a clickable child list, and the rest of the graph dims to 16% opacity. Double-click a squad or app → routes to its detail page.

### API

`AtlasApi` (`core/api/atlas-api.ts`) is a thin `HttpClient` wrapper. Base URL comes from `environment.apiBaseUrl`. In dev that's `/api`, proxied by `ng serve` to `http://localhost:3000` (atlas-service). In production the SPA is served from the same origin as the API, so `/api` works there too.

### Authentication

Single login flow: **Jira API token**. The user enters their Jira email + API token; the SPA POSTs to `/api/auth/login/jira`; on 200, the bearer token is persisted in `localStorage.atlas.auth` and attached to every subsequent API call by `auth.interceptor.ts`. A 401 anywhere in the API surface clears the session and routes back to `/login`.

Routing:
- `/login` is the only unguarded route
- Every other route sits under the `Shell` parent which has `canActivate: [authGuard]` + `canActivateChild: [authGuard]`
- The guard redirects to `/login?returnUrl=…` so users land back on the page they tried to open

Sign-out is in the topbar — clears the session, removes the localStorage key, and routes to `/login`.

#### Why does the login screen ask for an API token?

The token is the proof of identity. Without it, the server can't verify that the user is who they claim to be, and "Jira login" would devolve into typing an email — which is exactly the email-only flow we removed. The atlas-service backend uses the token to call Jira's `myself` endpoint with HTTP Basic; Atlassian responds 200 only if the email + token pair is real, and the server additionally cross-checks that the email Jira returns matches the submitted one.

Users create their tokens at <https://id.atlassian.com/manage-profile/security/api-tokens>. The login form links there directly under the token field.

A redirect-based "Sign in with Jira" (Atlassian OAuth 2.0 / 3LO) would remove the paste step but requires registering an OAuth app in the Atlassian developer console + handling the callback. Out of scope for now.

The atlas-service end requires `JIRA_BASE_URL=https://<workspace>.atlassian.net` to be set on the server; without it, login attempts fail with a friendly i18n error rather than silently breaking. See [atlas-service README — Authentication](https://github.com/Scaled-AIOps/atlas-service#authentication) for the server-side details.

### Internationalisation

Powered by `@ngx-translate/core` (v17) with the HTTP loader. JSON files live at `public/i18n/{en,de}.json` and are fetched at startup. Every visible string in the app is keyed (e.g. `nav.dashboard`, `dashboard.alert_failed`, `deploy_detail.col.change_request`) — no hard-coded labels in templates.

`LocaleService` (`core/i18n/locale.service.ts`) holds the current locale as a signal, persists the choice in `localStorage.atlas.locale`, and falls back to the browser's `navigator.language` then `'en'`. The shell topbar renders a `<select>` switcher; switching is instant and reload-free because the translation pipe is reactive.

API enum values (`active`, `failed`, `compliant`, env names like `prd`) are kept in their native form to match the atlas-service contract — only display labels are translated. Adding a new language is two steps: drop another `<lang>.json`, add it to `SUPPORTED_LOCALES` in `locale.service.ts`.

---

## Scripts

| Command          | Purpose                                                |
|------------------|--------------------------------------------------------|
| `npm start`      | `ng serve` on :4200 with `/api` proxy to :3000.        |
| `npm run build`  | Production build → `dist/atlas-frontend`.              |
| `npm run watch`  | Development build with `--watch`.                      |
| `npm test`       | Vitest test runner.                                    |

---

## Dev workflow

1. Start atlas-service: `cd ../atlas-service && npm start` (listens on `:3000`).
2. Seed it: `node scripts/mock_data.js seed && node scripts/mock_infra.js seed && node scripts/mock_appinfo.js seed && node scripts/mock_appstatus.js seed`.
3. Start atlas-frontend: `npm start` → <http://localhost:4200>.

The dev server has hot module replacement, so component edits reload sub-second.

---

## Stack

- **Angular 21** (zoneless, signals, `viewChild()` reactive refs, `@if/@for/@switch` control flow)
- **vis-network** + **vis-data** for the graph
- **@ngx-translate/core** (v17) + HTTP loader for runtime i18n (en / de)
- **js-yaml** for YAML export
- **rxjs** for HTTP observables
- **SCSS** with CSS custom properties for theming (no UI component library; primitives are in `styles.scss`)

---

## Conventions

- **One signal per piece of UI state** — `loading`, `error`, `selected`, etc.
- **No NgModules** — every component is standalone, listed in `imports`.
- **No global state library** — `ListState<T>` instances live on the component that uses them.
- **kebab-case identifiers**, **camelCase fields** — matches the atlas-service contract.
- **CSS variables** for theme — never hard-code blue tints in component styles; use `var(--blue-600)` etc.
