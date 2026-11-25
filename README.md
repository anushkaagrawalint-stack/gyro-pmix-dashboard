# Gyro Republic · Product Mix Dashboard (Next.js)

The PMIX prototype (`../Gyro_PMIX_Prototype (25).html`) as a Next.js app, with live data from the Toast → Neon pipeline
(project **PMix**, database `gyro_toast_pipeline`) instead of embedded Toast exports.

## Run locally
```
npm install
# .env.local (git-ignored):  DATABASE_URL=<Neon pooled connection string for gyro_toast_pipeline>
npm run dev        # http://localhost:3000
npm run build && npm run start
```

## How it is put together
| Part | File | Notes |
|---|---|---|
| Page | `src/app/page.tsx` | client page: fetches `/api/dashboard`, then starts the engine |
| Engine (UI) | `src/dashboard/engine.js` | the prototype's code, ported: same tabs, charts, filters; data comes from the API |
| Styles | `src/app/globals.css` | the prototype's CSS; Montserrat via `next/font` |
| API | `src/app/api/dashboard/route.ts` | `GET /api/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD` (default: year to date) |
| Data | `src/lib/dashboardData.ts` | SQL against the pipeline layers, returned in the prototype's data shapes |

Data sources: item sales `output.agg_item_daily` (+ `dim_menu_item`, `dim_sales_category`); modifiers with parent item and dining option,
payments, and check-level attachment from the semantic layer (`sem.sem_order_items`, `sem.sem_order_payments`).
Dates stop at the last business day the nightly pipeline finished (never later than yesterday, store time).

Differences from the prototype: item sales are **daily** (every tab follows the date range); weekly trends are computed from the daily
data; the CSV upload is removed (data is live); location names follow the pipeline (e.g. "Spring Klein").
