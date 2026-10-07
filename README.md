# Caffe Aroma: "6 AM to Midnight"

A 3D website and online-ordering system for Caffe Aroma (957 Elmwood Ave, Buffalo), built as a pitch to the owner.
It opens on the building as you would see it from the intersection: a two-storey brick corner building where Elmwood meets Bidwell, with the glass front door in the chamfered corner, sage-green awnings and patio seating on both streets, and an "open every day 6 AM - 12 AM" board over the door. Scrolling glides in along the diagonal, through the corner door and to a window table, where the day plays out: a croissant at 6 AM that turns into a laptop at midday, live music at golden hour, a candle-lit bar after dark, last call at midnight. A single time-of-day engine drives the 3D scene, the sky, the props, the page theme and the menu order.

## Run it

```bash
npm install
npm run dev        # http://localhost:3100 (see .claude/launch.json) or `npm run dev -- --port 3000`
npm test           # unit tests (pricing, slots, time, menu integrity)
npm run typecheck && npm run lint && npm run build
```

Useful URLs while developing:
- `/` home: storefront hero, then the scroll-driven day (hero -> "Come on in" at the door -> 6 AM -> 1 PM -> 6 PM -> 9 PM -> 11:30 PM). Drag the clock at the bottom to jump to any hour.
- `/order` menu and customizer, `/order/checkout`, `/order/track/<id>`.
- `/staff` counter board (demo PIN `1995`). Open it in a second window and place an order to see it arrive.
- Quality overrides: `?q=high|med|lite|poster` or `?gl=off` (no WebGL fallback).
- Camera framing (dev only): `?cam=px,py,pz,tx,ty,tz,fov`. Note +x runs to the screen-left when looking at the storefront from the street.

## Hosting (Cloudflare Worker)

The pitch is live at **https://caffearoma.cwmccann.pro**. It is the site exported as plain files (`STATIC_EXPORT=1 next build` into `out/`) and served by a Cloudflare Worker with Static Assets (`wrangler.jsonc`, `worker/index.js`). The site has no server code, so there is nothing to run: orders stay in the visitor's browser exactly as in the demo.

```bash
npm run deploy:cf   # build the export, then `wrangler deploy` (needs `npx wrangler login` once)
npm run build:cf    # just the export + out/_headers
npm run preview:cf  # serve ./out through the Worker on http://localhost:8787 (run build:cf first)
E2E_BASE_URL=http://localhost:8787 npm run e2e   # the same Playwright suite against the Worker
```

- The Worker does two things static files cannot: `/order/track/<any id>` is answered by the one pre-built tracker page (it reads the id from the URL; `next start` does the same through a rewrite in `next.config.ts`), and `/robots.txt`.
- It is marked **noindex** (header in `scripts/build-static.mjs`, `Disallow: /` in the Worker) because it is a pitch, not the cafe's real site. To launch for real, remove both and point the domain at the production deployment.
- Dev, tests and `npm start` are unchanged: the export only switches on with `STATIC_EXPORT=1`.
- `npm run deploy:cf` rebuilds `.next` in export mode; run `npm run build` again before `npm start` / `npm run e2e` locally.

## Where things live

| Path | What |
|---|---|
| `data/business.ts` | Hours, address, tax rate, events, reviews. Everything marked CONFIRM needs the owner. |
| `data/menu.raw.json` | One-time snapshot of the Clover storefront menu (untouched). |
| `scripts/normalize-menu.mjs` | Cleans Clover's data into `data/menu.json` (`npm run menu`). Every change is listed in `review[]`. |
| `src/lib/timeOfDay.ts` | `sampleTod(hour)`: the single source of truth for light, sky, props and theme. |
| `src/components/scene/*` | The procedural Three.js scene (no model downloads): `Facade` + `Patio` (the corner building and both patios; `wall.ts` defines the three wall runs: Elmwood, the 45 degree corner, Bidwell), `Room`/`Table`/`MusicCorner` (inside), `Rig` (the scroll-driven camera flight and stations), `kit.ts` (merges many small shapes into one draw call). |
| `src/components/home/Stage.tsx` | The hero and the chapters. Scroll position drives `flight` (camera along the path) and the story hour. |
| `src/lib/{menu,pricing,slots,time}.ts` | Ordering logic. Money is integer cents. |
| `src/lib/payments/*` | `PaymentProvider` interface and the mock processor. |
| `src/store/{cart,shop}.ts` | Cart, orders, "pause ordering", sold-out items (localStorage + cross-tab sync). |
| `scripts/capture-posters.mjs` | Regenerates the still images (`public/posters/ext-*.webp` = storefront, `tod-*.webp` = room) from the live scene with headless Chrome. Needs `npm run dev` running. |
| `scripts/make-icons.mjs` | Draws the favicon set (`src/app/icon.svg`, `favicon.ico`, `apple-icon.png`) from vector drawings of the sign: red frame, green stripe, steaming cup, black bar. Next links them automatically. |
| `scripts/bundle-report.mjs` | Prints gzip sizes of the client chunks after `npm run build`. |
| `scripts/scene-stats.mjs` | Counts renderables and draw calls per scene component against the dev server (the corner hero is ~150 draw calls). |
| `scripts/perf-check.mjs` | Load-speed check against the production server (`npx next start -p 3100`): paint times, what is downloaded before the 3D chunk is requested, poster arrival. |
| `scripts/create-cafe-outside-scene.py` | The Blender sketch of the corner building (and its renders in `Cafe Aroma GPT Version/site/public/assets/`) that the 3D exterior is modelled on. Kept as a reference; the site does not use it. |
| `pitch/` | Audit, demo script and the owner questions. |

## Demo vs production

| Demo today | Production step |
|---|---|
| Mock payments (`src/lib/payments/mock.ts`). Test card `4242 4242 4242 4242`; `4000 0000 0000 0002` declines. | Add a Clover Ecommerce adapter implementing `PaymentProvider`. |
| Orders live in the browser and sync across windows of one device. | Server-backed orders (Clover orders API or Supabase realtime) behind the same store actions. |
| Menu is a static snapshot. | Sync from Clover inventory so 86'd items and price changes flow through. |
| SMS/email are not sent. | Add notifications on order status changes. |

Nothing here charges a card or contacts anyone on its own. Deploying is a deliberate step (`npm run deploy:cf`).
