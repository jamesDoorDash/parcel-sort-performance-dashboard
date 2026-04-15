# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Build & Dev Commands

All commands run from the `app/` directory:

```
npm run dev          # Start Vite dev server (HMR on port 5173)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint (TS/TSX files)
npm run preview      # Serve the production build locally
```

There is also `app/run-dev.sh` which sets up the Node 20 path and runs `npm run dev`.

There are no tests configured in this project.

## Tech Stack

- **React 19** + **TypeScript** + **Vite 5** (SPA, no router)
- **Tailwind CSS v3** with a custom design-token theme (see below)
- **Recharts** is listed as a dependency but charts are implemented as hand-rolled SVG components
- **lucide-react** for icons
- **clsx** + **tailwind-merge** via the `cn()` utility in `src/lib/cn.ts`

## Architecture

This is a **prototype/demo dashboard** for parcel sort hub performance. It uses only client-side mock data — there is no backend, API calls, or database.

### Versioned UI

The app supports toggling between prototype versions (V1, V2, V3) via a sidebar selector. `App.tsx` switches between `PerformancePage` (V1) and `PerformancePageV2` (V2) based on the selected version. V3 is listed in the version selector but has no distinct page yet.

### Data Layer (all mock, no API)

- `data/mock.ts` — Core types (`DateRangeKey`, `MetricKey`, `MetricConfig`, `DayBucket`, `Kpi`, `Sorter`), week-level mock data arrays (`weekThis`, `weekLast`, `weekNext`), KPI tile values per range, and the `rangePayloads` map that bundles chart data + KPIs for each date tab. Also contains `metricConfigs` which defines targets, formatting, and bake-time for each metric. Exports a `getDayStatus()` function used by charts to determine pending/future state.
- `data/mockV2.ts` — V2-specific types (`V2Kpi`, `WaitingDayBucket`, `FlowRateDayBucket`, `SorterV2`) and data. Imports and re-uses V1 week arrays. Adds waiting-stack data, flow-rate line-chart data (6 tab combos), and `rangePayloadsV2`. The `toSorterV2()` function converts a V1 `Sorter` into the V2 table shape.
- `data/sortersData.ts` — Deterministic procedural generation of ~100 sorter employees with a seeded PRNG (mulberry32). Simulates daily rosters (~20/day, 80% carryover) and per-person per-day metric noise. `getSortersForRange(startIso, endIso)` is the public API returning averaged `Sorter[]` for any date range.

### Key concept: "Bake time"

Some metrics (missort: 1 day, loss: 9 days) are not available immediately — `MetricConfig.bakeDays` controls this. The chart and KPI tiles show placeholder/pending states for unbaked days. `TODAY_ISO` in `mock.ts` is the simulated "now" date (2026-02-14) that drives these calculations.

### Components

Charts (`VolumeChart`, `WaitingStackChart`, `FlowRateSection`) are all hand-built SVG — not using Recharts despite it being a dependency. They share common geometry constants (width=900, height=260) and the same visual language. When adding or modifying charts, match these dimensions and the existing SVG patterns.

`VolumeChart` handles both the stacked processed-parcels view and the simpler single-metric bar view (percent, rate) depending on which `MetricConfig` is passed to it.

### Design Tokens

The custom design system is defined in `tailwind.config.js`:
- **Colors**: `ink`, `icon`, `surface`, `line`, `positive`, `negative`, `brand` — each with semantic variants (e.g. `ink-subdued`, `surface-hovered`, `line-strong`)
- **Typography**: `text-display-lg`, `text-display-md`, `text-title-md`, `text-body-lg`, `text-body-md`, `text-body-sm` (and `-strong` variants) — these include size, line-height, letter-spacing, and weight
- **Border radius**: `rounded-button` (8px), `rounded-card` (12px), `rounded-tag` (9999px)
- **Font**: Inter (loaded via Google Fonts in `index.css`)

The `cn()` helper in `src/lib/cn.ts` is configured with `extendTailwindMerge` to recognize the custom `text-*` size classes so they don't conflict with `text-ink` color utilities. Always use `cn()` for conditional class merging.

### Monorepo-ish Layout

The repo root contains only `.gitignore` and the `app/` directory. All source code, `package.json`, and config files live inside `app/`. Run all npm commands from `app/`.
