# Restaurant Ordering: a real-time prototype

[![CI](https://github.com/RostInatenko/pecan-restaurant-ordering/actions/workflows/ci.yml/badge.svg)](https://github.com/RostInatenko/pecan-restaurant-ordering/actions/workflows/ci.yml)

An Angular 21 + NgRx ordering app with a NestJS server. The menu (5,000 items), prices and
availability change live while people browse, orders can never be placed twice, and the order
status updates in real time.

- **Menu**: browse a large menu, search and filter, add items (open-price items ask for the
  price), apply a discount, check out.
- **Orders**: every order with its status, updating live.
- **Setup**: manage items and categories (price, availability, open price), plus a small kitchen
  view to advance or cancel orders. Every change shows up in all open tabs immediately.

## Running it

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
npm start
```

Open <http://localhost:4200>. `npm start` runs the Nest server (port 3000) and the Angular dev
server together; the dev server proxies `/api` and `/ws` to Nest.

| Command               | What it does                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `npm start`           | Server + client in watch mode                                                                   |
| `npm run serve`       | Production build, then one server on <http://localhost:3000> serving the app, API and WebSocket |
| `npm run start:chaos` | Like `npm start`, but the server injects latency, failures and dropped sockets                  |
| `npm test`            | Server unit + e2e tests, then client tests (Vitest)                                             |
| `npm run lint`        | Type-checks the shared contract, then lints and type-checks server and client                   |
| `npm run build`       | Builds server and client                                                                        |

**Try the live parts:** open the Menu in two windows and Setup in a third. Toggle an item's
availability or change its price in Setup and watch both menus update. Put the item in a cart
first, then make it unavailable: checkout shows what changed before anything is placed.

**Try a lost connection:** run `npm run serve`, open <http://localhost:3000>, stop the server with
Ctrl+C (the page stays open and shows the reconnect banner), then start it again with
`npm run start:prod -w server`: the page reconnects and resyncs by itself. `npm run start:chaos`
also drops sockets every ~20 s and fails some requests, including after an order was created, to
show that Retry never places it twice.

## How the brief is covered

| Requirement                                  | Where                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Manage categories and items                  | Setup page (`features/setup`), server `menu/`                                                                |
| Price, availability, open price per item     | Setup item dialog; open price → price asked in the add dialog (`add-to-cart-dialog.ts`)                      |
| Changes reflected in Menu immediately        | WebSocket events → store (`realtime.service.ts`, `realtime.effects.ts`)                                      |
| Large menu                                   | 5,000 seeded items, CDK virtual scroll, memoised filter selectors                                            |
| Cart with quantity, open-price price entry   | `state/cart/`, cart panel                                                                                    |
| Fixed-amount discount                        | Cart panel; capped at the subtotal, validated by the server                                                  |
| Order never placed twice                     | Idempotency key + locked cart on unknown outcome + `exhaustMap` ([details](#an-order-is-never-placed-twice)) |
| Informed of changes before confirming        | Live cart warnings, review dialog, server 409 `STALE_CART`                                                   |
| Orders page with live status                 | `features/orders`; server advances statuses on a timer, kitchen tab advances manually                        |
| Fast, stable, smooth on slow connections     | Lazy routes, skeletons, compression, `OnPush` + signals                                                      |
| Errors and lost connection don't break it    | Typed errors, Retry, reconnect with backoff, connection banner                                               |
| One or two commands; build, tests, lint pass | `npm install` + `npm start`; `npm run build`, `npm test`, `npm run lint`                                     |

## Architecture

```
┌──────────── client (Angular 21, zoneless) ────────────┐        ┌──────── server (NestJS 12) ────────┐
│ features/  menu · orders · setup   (lazy routes)      │  REST  │ MenuController / OrdersController  │
│     │ selectSignal          │ commands (REST)         │ ─────▶ │   → MenuService / OrdersService    │
│     ▼                       ▼                         │        │        │ publish                   │
│ NgRx store ◀── RealtimeEffects ◀── RealtimeService ◀──┼─ WS ── │ RealtimeEvents (Subject)           │
│ menu · orders · cart ·      (actions)   (reconnect,   │        │        ▼                           │
│ connection                               heartbeat)   │        │ RealtimeGateway: snapshot, events  │
└───────────────────────────────────────────────────────┘        └────────────────────────────────────┘
                          shared/ — TypeScript contract (types only): DTOs, error codes, WS messages
```

```
client/src/app/
  core/        API services, error interceptor, realtime service, connection UI, notifier
  state/       NgRx slices: menu, orders, connection, cart (+ checkout effects)
  features/    menu (browse, cart, checkout), orders, setup (items, categories, kitchen)
  shared/      money helpers and pipe, skeleton rows, confirm dialog
server/src/
  menu/        seeded catalogue, category + item CRUD
  orders/      idempotent placement, stale-cart check, status timer
  realtime/    event bus + WebSocket gateway
  common/      ApiException + global exception filter
  chaos/       optional failure injection
shared/src/    the API and WebSocket contract (.d.ts)
```

## Key decisions and trade-offs

### One ordered channel for data: snapshot on connect

The server's **first WebSocket message on every connection is a full snapshot** (menu + orders);
every message after it is a change applied on top, in order. The client never fetches data over
REST.

- A reconnect is a full resync by construction, so nothing that happened while offline can be
  missed.
- Because snapshot and events share one ordered channel, an event can never arrive before the data
  it modifies. Loading over REST and listening on a socket means two connections that can race:
  for example, a stale REST response can resurrect an item that a socket event just deleted.
- The gateway sends the snapshot _before_ adding the client to its broadcast set, so a client
  cannot receive an event ahead of its snapshot.
- Trade-off: data loading depends on the WebSocket. If it drops, the app keeps the last known data,
  shows a banner, and catches up on reconnect.

### The WebSocket is the store's only data source

REST is for **commands** (setup edits, placing an order, changing a status). Their responses are
not written into the store; the change arrives over the WebSocket like everyone else's. A slow REST
response therefore cannot overwrite newer data, and every tab follows the same path. With the
socket down, a setup save still succeeds and is visible after the reconnect snapshot.

Setup dialogs call the API services directly rather than through NgRx effects: nothing they return
goes into the store, and a dialog needs to know whether _its own_ save worked (close on success,
keep the form and show the error otherwise). Checkout, which has real state, goes through the store.

### An order is never placed twice

Three layers, from UX to guarantee:

1. **UI**: the button is disabled and cart edits are ignored while submitting (and while the
   outcome of a failed attempt is unknown, see below).
2. **Store**: the checkout is a small state machine (`idle → reviewing | submitting → failed`),
   and the submit effect uses `exhaustMap`, so a second submit while one is in flight is dropped.
3. **Server (the guarantee)**: every checkout attempt carries an `Idempotency-Key` (UUID). The
   server stores `key → order + cart fingerprint`. The same key with the same cart returns the
   _original_ order (marked `Idempotent-Replayed: true`); the same key with a different cart is
   rejected with 422.

The key belongs to one checkout attempt. After a network error, a 5xx, or a reload during submit
(the cart and its key are persisted), the outcome is **unknown**: the order may exist and only the
response was lost. In that state the **cart is locked** and **Retry resends the same key**, without
a client-side review, so the server settles it: it returns the existing order, creates it, or
answers 409 if the menu changed (which means nothing was placed, so reviewing and editing are safe
again). The key is dropped only when the cart changes after such a definite answer. "The request
succeeded but the response was lost" therefore resolves to the existing order instead of a
duplicate; chaos mode reproduces exactly that case.

`place()` on the server is synchronous, so two identical requests cannot interleave between "key
known?" and "save". With an async database this would need an atomic reservation (unique
constraint on the key, or an "in progress" row).

### Availability and price changes before confirming

- The cart checks every line against the live menu (same rules as the server: removed,
  unavailable, price changed) and flags changes as they happen.
- "Place order" with pending changes opens a **review dialog** first; accepting updates the cart
  and the user confirms again.
- The server re-validates every line and answers **409 `STALE_CART` with all changes at once**,
  which lands in the same review dialog. The client check is UX; the server check is the
  guarantee.
- Open-price items accept whatever price the user entered; the same item at two prices becomes two
  cart lines.

### Money in integer cents

All amounts are integer cents end to end (`type Cents = number`). Input is parsed from text
without going through floats (`"12.5"` → `1250`); division happens only when formatting. The
discount is capped at the subtotal on the client and validated on the server, which recomputes all
totals.

### Real-time connection handling

`RealtimeService` wraps RxJS `webSocket()` in one long-lived stream of lifecycle events and
messages:

- reconnect forever with **exponential backoff + jitter** (1 s, 2 s, 4 s … capped at 30 s);
- **heartbeat**: the server pings every 15 s, and 35 s of silence counts as a dead connection
  (browsers hide protocol-level pings, so the app sends its own);
- reconnect **immediately** when the browser fires `online` (or, if the socket survived a short
  blip, mark the connection live again);
- connection status lives in the store and drives the toolbar indicator and a fixed bottom banner,
  which never shifts the layout.

### Large menu, fast and stable

- **CDK virtual scroll** with fixed 72 px rows: only the visible rows are in the DOM, whatever the
  size of the menu.
- Filtering and sorting are **memoised NgRx selectors**; the search box updates instantly and the
  filter runs after a 150 ms pause in typing.
- `OnPush` everywhere (enforced by lint), zoneless change detection, signals via `selectSignal`.
- **Skeleton rows have the exact height of real rows**, so nothing jumps when data arrives.
- **Lazy routes** per page; the snackbar is loaded on first use. Initial bundle ≈ 125 KB
  transferred, then per page ≈ 13 KB (menu), 28 KB (setup), 2 KB (orders).
- **Compression**: WebSocket `permessage-deflate` shrinks the snapshot from ~810 KB to ~60 KB, and
  HTTP responses are gzipped.

### Errors

- Every server error has one shape, `{ code, message, details? }`, built by a global exception
  filter. Unexpected errors become a generic 500, and the details go to the server log only.
- An HTTP interceptor turns every failure into a typed `AppError` with a readable message, so the
  rest of the client never parses HTTP details.
- Errors stay where they are useful: the checkout keeps the error in the store with a Retry
  button, dialogs show the message inline and keep the form, and other actions show a snackbar.

### Shared contract

`shared/` holds only TypeScript types (DTOs, error codes, WebSocket messages) used by both apps
through the `@pecan/shared` alias. They are `.d.ts` files: declarations are never emitted, so
nothing from `shared/` exists at runtime and the server build does not object to a source file
outside its `rootDir`. Since `skipLibCheck` skips declaration files, `npm run lint` type-checks
`shared/` separately. Server DTOs `implements` the shared input types, so contract drift fails to
compile.

### Tooling choices

- **NgRx Store + Entity + Effects** (not SignalStore): the hard parts here are event-driven
  (socket messages, reconnects, the checkout sequence), which is what actions and effects model
  well; Redux DevTools shows every event.
- **NestJS** for the server: modules and DI mirror Angular, which keeps the server easy to
  follow. Nest 12 defaults to ESM and Vitest, so **both apps use Vitest**.
- **Raw WebSocket** (`ws` + RxJS) rather than Socket.IO, so reconnect and resync are explicit
  code rather than library behaviour.
- Lint rules enforce the architecture: `OnPush`, type-only imports, NgRx rules; tests are
  type-checked as part of lint.

## What was deliberately simplified

- **Persistence**: the server keeps everything in memory; a restart resets the menu to the seed and
  drops orders.
- **No authentication or roles**: anyone can open Setup.
- **Idempotency keys never expire** (a real store would use a TTL of ~24 h).
- **One currency (USD), one locale**; no tax, tips or payments.
- **The snapshot always contains everything.** Fine for 5,000 items and a demo's worth of orders;
  see below for larger data.
- **No server-side eviction of dead sockets** (ws ping/pong); the client heartbeat covers the user
  experience.
- **Orders list isn't virtualised or paginated**: a prototype session produces few orders.
- The seed catalogue is generated (25 categories × 200 items) from a fixed seed, so it is the same
  on every start.

## What production-readiness would need

- **Database** (e.g. PostgreSQL) with migrations; idempotency keys in a table with a unique
  constraint and a TTL, reserved atomically before the order is created.
- **Horizontal scaling**: a pub/sub layer (Redis, or Postgres `LISTEN/NOTIFY`) behind the event bus
  so every server instance broadcasts every change; sticky sessions not required.
- **Versioned resync** for large data: snapshots carrying a version, so a reconnect sends only the
  events since the client's version (or a snapshot if it is too old), plus menu pagination or
  per-category loading.
- **Auth**: staff login for Setup and the kitchen, role checks on the server, rate limiting on
  order placement.
- **Payments and order lifecycle** with the kitchen as a separate app or screen.
- **Observability**: structured logs with request IDs, metrics (socket count, reconnect rate,
  409 rate), error tracking (Sentry or similar) on both apps.
- **Testing**: Playwright end-to-end tests for checkout and reconnect flows; contract tests or a
  schema (OpenAPI / JSON Schema) generated from the shared types.
- **Delivery**: Docker images, environment configuration and a deployment pipeline (CI already
  runs lint, tests and build on Node 20 and 22 for every push), HTTPS/WSS, security headers, and a
  service worker for an offline-capable shell.
- **Accessibility and i18n audit**, currency and locale from configuration.
