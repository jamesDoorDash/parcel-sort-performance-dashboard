# Handoff doc — Performance dashboard prototype

Snapshot for picking up in a new Claude thread. Project = internal Parcel Sort performance dashboard mockup (DashLink) for stakeholder review. Dev preview runs at `localhost:5173`.

## Project basics

- Stack: React + Tailwind + Vite, in `app/`
- Versioning: every prototype variant is its own page `app/src/pages/PerformancePageVN.tsx`, registered in `app/src/App.tsx` (import + `ALL_VERSIONS` array + `if (version === "VN")` block) and `app/src/components/Sidebar.tsx` (entry in the dropdown list)
- Routing: each version has its own URL `/vN` so Pastel can scope per-version comments — never map a version to `/`
- Branch: `feature/2026-04-24` (current, untracked work below)
- Today's mock date: 2026-05-04. Demo grades are tuned: today=A, this week=B, last week=F

## How we work together

- I'm a product manager / ops lead, not the engineer — I review the running app and direct UI/copy changes
- Verification: prefer Claude in Chrome MCP (`navigate`, `read_page`, etc.) for visual checks. `preview_screenshot` is OK as a fallback (was used this session)
- Terminology: use "metrics" not "KPIs"
- UI copy: no trailing periods on single-sentence labels/tooltips
- I iterate on copy a lot — expect "make it more concise / try another phrasing" cycles
- Don't commit unless I ask

## What this thread covered

All work was on the **Associates insights** section of the V36-family pages (the panel that opens when you click the "Associates meeting targets" hero card).

### 1. V36 fix — uncapped "Associates to coach" list
- File: `app/src/components/AssociatesInsights.tsx` (the existing component, untracked)
- Removed `max-h-[120px]` + `overflow-y-auto` from the `<ul>` so all below-target associates render without scrolling
- Reason: I noticed only 5 names were visible when 48 were below target; the cap was the cause

### 2. V39 — "Associates not meeting targets" count card
- New page: `app/src/pages/PerformancePageV39.tsx` (copy of V36, swaps in new component)
- New component: `app/src/components/AssociatesInsightsV3.tsx`
- Layout (3 cols): **Top sorters | Top loaders | Associates not meeting targets**
  - Third column = bold count number + red "▲ N above target" pill (matches the AssociatesInsightsV2 visual style)
- History worth knowing: I first asked for per-associate target differentials (e.g., "Tanner Hayes — Missorts −12"). I rejected that and asked for the simple count-with-pill style instead. The differential version was deleted; `AssociatesInsightsV3.tsx` now contains only the count style. Don't bring the differential rows back.
- Sidebar label: "V39: Below-target count"

### 3. V40 — "Most in need of coaching"
- New page: `app/src/pages/PerformancePageV40.tsx` (copy of V36)
- New component: `app/src/components/AssociatesInsightsV4.tsx`
- Layout (3 cols): **Top sorters | Top loaders | Most in need of coaching**
- Each of the 3 columns is wrapped in its own bordered container (`rounded-[8px] border border-line-hovered bg-white px-4 py-3`)
- Ranking logic in the component:
  - **Top sorters** = best on a composite of sort rate + parcels sorted + missorts + lost items
  - **Top loaders** = best on a composite of load rate + pallets loaded + missload (proxied via parcelsLost since per-associate missload count isn't tracked)
  - **Most in need of coaching** = worst on a composite of sort rate gap, load rate gap, pre-sort gap, missort rate, lost rate, idle time
- Tooltips on each section label spell out the criteria (mouse over the underlined section label to see them)
- Copy iteration history for the third column header (latest is what's shipped):
  1. "Associates most needing improvement" → too long
  2. "Lowest performers to coach" → too long
  3. "Top coaching candidates" → fine but I wanted to try alternates
  4. "Most need coaching" → grammatically OK but didn't pair with "Top X" pattern
  5. "Most needing coaching" → reads stiff
  6. **"Most in need of coaching"** ← current
- Sidebar label: "V40: Sorters/loaders/needs improvement"

## File inventory (current session, untracked)

- `app/src/components/AssociatesInsightsV3.tsx` — V39 component (count + pill style)
- `app/src/components/AssociatesInsightsV4.tsx` — V40 component (3 bordered containers)
- `app/src/pages/PerformancePageV39.tsx` — V39 page
- `app/src/pages/PerformancePageV40.tsx` — V40 page
- `app/src/App.tsx` — registered V39 and V40 (modified)
- `app/src/components/Sidebar.tsx` — dropdown entries for V39 and V40 (modified)
- `app/src/components/AssociatesInsights.tsx` — V36 component, max-height cap removed (modified, untracked)

The session also has many other untracked files (V36-V38, V41-V45, AssociatesInsightsV2, AssociatesInsightsV41, SpokeV35, etc.) that were created in previous threads — leave those alone.

## Known nits (not addressed)

- The tooltip strings in `AssociatesInsightsV3.tsx` and `AssociatesInsightsV4.tsx` end with periods. Per project convention, single-sentence UI copy should drop the trailing period. Worth a cleanup pass.

## Quick orientation for the next thread

1. Read this doc
2. `git status` to see the untracked files listed above
3. Open `localhost:5173/v40` in Chrome to see the latest layout
4. The relevant component is `app/src/components/AssociatesInsightsV4.tsx`; the page wrapper is `app/src/pages/PerformancePageV40.tsx`
