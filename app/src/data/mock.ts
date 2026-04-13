// Mock data for the Parcel Sort performance dashboard.
// All values are fabricated for demo purposes.

import { getMetricTarget } from "./targets";

export type DateRangeKey = "lastWeek" | "today" | "thisWeek" | "nextWeek" | "custom";

export type MetricKey =
  | "processed"
  | "pallets"
  | "trucksOnTime"
  | "missort"
  | "loss"
  | "preSortSpeed"
  | "sortSpeed"
  | "loadSpeed";

export type MetricConfig = {
  key: MetricKey;
  label: string;
  unit: "count" | "percent" | "rate";
  target: number; // in the metric's native unit
  format: (n: number) => string;
  // Number of days after a given day before the metric is considered
  // fully computed. 0 = ready end-of-day. 1 = available the next day.
  // 9 = takes 9 days to "bake" (e.g. loss rate).
  bakeDays?: number;
  // Y-axis label on the chart
  axisLabel?: string;
};

// "Today" for the mockup — drives bake-time calculations.
export const TODAY_ISO = "2026-02-14";

export const metricConfigs: Record<MetricKey, MetricConfig> = {
  processed: {
    key: "processed",
    label: "Parcels processed",
    unit: "count",
    target: getMetricTarget("processed"),
    format: (n) => n.toLocaleString(),
  },
  pallets: {
    key: "pallets",
    label: "Pallets scanned to truck",
    unit: "percent",
    target: getMetricTarget("pallets"),
    format: (n) => `${n.toFixed(1)}%`,
  },
  trucksOnTime: {
    key: "trucksOnTime",
    label: "Trucks departed on time",
    unit: "percent",
    target: getMetricTarget("trucksOnTime"),
    format: (n) => `${n.toFixed(1)}%`,
  },
  missort: {
    key: "missort",
    label: "Missort rate",
    unit: "percent",
    target: getMetricTarget("missort"),
    format: (n) => `${n.toFixed(2)}%`,
    bakeDays: 1,
  },
  loss: {
    key: "loss",
    label: "Loss rate",
    unit: "percent",
    target: getMetricTarget("loss"),
    format: (n) => `${n.toFixed(2)}%`,
    bakeDays: 9,
  },
  preSortSpeed: {
    key: "preSortSpeed",
    label: "Pre-sort speed",
    unit: "rate",
    target: getMetricTarget("preSortSpeed"),
    format: (n) => `${Math.round(n)} / hr`,
  },
  sortSpeed: {
    key: "sortSpeed",
    label: "Sort speed",
    unit: "rate",
    target: getMetricTarget("sortSpeed"),
    format: (n) => `${Math.round(n)} / hr`,
  },
  loadSpeed: {
    key: "loadSpeed",
    label: "Load speed",
    unit: "rate",
    target: getMetricTarget("loadSpeed"),
    format: (n) => `${Math.round(n)} / hr`,
  },
};

// ---- Day bucket ----
// Each day holds values for every metric so the chart can switch instantly.
export type DayBucket = {
  date: string; // ISO (YYYY-MM-DD)
  label: string; // "Feb 9"
  weekday: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  isFuture?: boolean;
  isPartial?: boolean;
  // Processed has a stacked view:
  processed: {
    processed: number;
    lost: number;
    readyToSort: number;
    expectedVolume: number;
  };
  // Simple daily values for every other metric (null = no data yet)
  values: Partial<Record<MetricKey, number | null>>;
};

export type Kpi = {
  key: MetricKey | string;
  label: string;
  labelTooltip?: { title: string; body: string };
  value: string;
  delta?: { value: string; direction: "up" | "down" } | null;
  deltaLabel?: string;
  placeholderNote?: string;
  // Partial-data caption and tooltip (used when some days in the range
  // have not baked yet but we still have *some* calculated days).
  partialNote?: string;
  tooltip?: { title: string; body: string };
  highlighted?: boolean;
  // V2 extensions (optional, ignored in V1 rendering)
  /** Small badge shown next to the tile label (e.g. "1 day" for bake time). */
  bakeBadge?: string;
  /** Informational note shown below the value in accent/pink color (no icon). */
  alertNote?: string;
  /** Explicitly override delta color instead of using up=positive/down=negative. */
  deltaColor?: "positive" | "negative";
};

export type Sorter = {
  id: string;
  name: string;
  preSort: number;
  sort: number;
  load: number;
  missort: number; // %
  loss: number; // %
  meetsTargets: boolean;
};

// ---- Week Feb 9 – Feb 15 2026 (Mon–Sun). "Today" = Feb 14 ----
export const weekThis: DayBucket[] = [
  {
    date: "2026-02-09",
    label: "Feb 9",
    weekday: "Mon",
    processed: { processed: 2150, lost: 60, readyToSort: 0, expectedVolume: 2200 },
    values: {
      pallets: 96.4,
      trucksOnTime: 94.1,
      missort: 0.38,
      loss: 0.02,
      preSortSpeed: 128,
      sortSpeed: 145,
      loadSpeed: 136,
    },
  },
  {
    date: "2026-02-10",
    label: "Feb 10",
    weekday: "Tue",
    processed: { processed: 2170, lost: 60, readyToSort: 0, expectedVolume: 2200 },
    values: {
      pallets: 97.1,
      trucksOnTime: 96.0,
      missort: 0.41,
      loss: 0.03,
      preSortSpeed: 133,
      sortSpeed: 148,
      loadSpeed: 139,
    },
  },
  {
    date: "2026-02-11",
    label: "Feb 11",
    weekday: "Wed",
    processed: { processed: 2340, lost: 71, readyToSort: 0, expectedVolume: 2380 },
    values: {
      pallets: 98.3,
      trucksOnTime: 97.2,
      missort: 0.29,
      loss: 0.01,
      preSortSpeed: 141,
      sortSpeed: 156,
      loadSpeed: 142,
    },
  },
  {
    date: "2026-02-12",
    label: "Feb 12",
    weekday: "Thu",
    processed: { processed: 2040, lost: 52, readyToSort: 0, expectedVolume: 2100 },
    values: {
      pallets: 95.6,
      trucksOnTime: 93.4,
      missort: 0.52,
      loss: 0.04,
      preSortSpeed: 124,
      sortSpeed: 138,
      loadSpeed: 132,
    },
  },
  {
    date: "2026-02-13",
    label: "Feb 13",
    weekday: "Fri",
    processed: { processed: 2330, lost: 68, readyToSort: 0, expectedVolume: 2400 },
    values: {
      pallets: 98.8,
      trucksOnTime: 98.5,
      missort: 0.31,
      loss: 0.02,
      preSortSpeed: 144,
      sortSpeed: 153,
      loadSpeed: 140,
    },
  },
  {
    date: "2026-02-14",
    label: "Feb 14",
    weekday: "Sat",
    isPartial: true,
    processed: { processed: 424, lost: 0, readyToSort: 2074, expectedVolume: 2498 },
    values: {
      pallets: 98.0,
      trucksOnTime: 98.0,
      missort: null, // calculated EOD
      loss: null, // calculated later
      preSortSpeed: 132,
      sortSpeed: 132,
      loadSpeed: 132,
    },
  },
  {
    date: "2026-02-15",
    label: "Feb 15",
    weekday: "Sun",
    isFuture: true,
    processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 2311 },
    values: {
      pallets: null,
      trucksOnTime: null,
      missort: null,
      loss: null,
      preSortSpeed: null,
      sortSpeed: null,
      loadSpeed: null,
    },
  },
];

// ---- Week Feb 2 – Feb 8 2026 (Mon–Sun) — "Last week" ----
export const weekLast: DayBucket[] = [
  {
    date: "2026-02-02",
    label: "Feb 2",
    weekday: "Mon",
    processed: { processed: 2084, lost: 48, readyToSort: 0, expectedVolume: 2150 },
    values: { pallets: 97.2, trucksOnTime: 95.3, missort: 0.36, loss: 0.02, preSortSpeed: 131, sortSpeed: 147, loadSpeed: 138 },
  },
  {
    date: "2026-02-03",
    label: "Feb 3",
    weekday: "Tue",
    processed: { processed: 2290, lost: 62, readyToSort: 0, expectedVolume: 2300 },
    values: { pallets: 98.1, trucksOnTime: 96.4, missort: 0.34, loss: 0.02, preSortSpeed: 138, sortSpeed: 152, loadSpeed: 141 },
  },
  {
    date: "2026-02-04",
    label: "Feb 4",
    weekday: "Wed",
    processed: { processed: 2410, lost: 55, readyToSort: 0, expectedVolume: 2400 },
    values: { pallets: 98.6, trucksOnTime: 97.8, missort: 0.28, loss: 0.01, preSortSpeed: 146, sortSpeed: 158, loadSpeed: 144 },
  },
  {
    date: "2026-02-05",
    label: "Feb 5",
    weekday: "Thu",
    processed: { processed: 2186, lost: 70, readyToSort: 0, expectedVolume: 2250 },
    values: { pallets: 96.8, trucksOnTime: 94.7, missort: 0.47, loss: 0.03, preSortSpeed: 130, sortSpeed: 144, loadSpeed: 135 },
  },
  {
    date: "2026-02-06",
    label: "Feb 6",
    weekday: "Fri",
    processed: { processed: 2388, lost: 64, readyToSort: 0, expectedVolume: 2400 },
    values: { pallets: 98.2, trucksOnTime: 96.9, missort: 0.33, loss: 0.02, preSortSpeed: 142, sortSpeed: 155, loadSpeed: 142 },
  },
  {
    date: "2026-02-07",
    label: "Feb 7",
    weekday: "Sat",
    processed: { processed: 2054, lost: 58, readyToSort: 0, expectedVolume: 2100 },
    values: { pallets: 95.1, trucksOnTime: 93.2, missort: 0.54, loss: 0.04, preSortSpeed: 121, sortSpeed: 136, loadSpeed: 128 },
  },
  {
    date: "2026-02-08",
    label: "Feb 8",
    weekday: "Sun",
    processed: { processed: 1872, lost: 42, readyToSort: 0, expectedVolume: 1900 },
    values: { pallets: 94.3, trucksOnTime: 91.8, missort: 0.61, loss: 0.05, preSortSpeed: 115, sortSpeed: 128, loadSpeed: 122 },
  },
];

// ---- Week Feb 16 – Feb 22 2026 — "Next week" (future, forecast only) ----
export const weekNext: DayBucket[] = [
  { date: "2026-02-16", label: "Feb 16", weekday: "Mon", isFuture: true, processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 2250 }, values: {} },
  { date: "2026-02-17", label: "Feb 17", weekday: "Tue", isFuture: true, processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 2320 }, values: {} },
  { date: "2026-02-18", label: "Feb 18", weekday: "Wed", isFuture: true, processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 2410 }, values: {} },
  { date: "2026-02-19", label: "Feb 19", weekday: "Thu", isFuture: true, processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 2190 }, values: {} },
  { date: "2026-02-20", label: "Feb 20", weekday: "Fri", isFuture: true, processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 2380 }, values: {} },
  { date: "2026-02-21", label: "Feb 21", weekday: "Sat", isFuture: true, processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 2050 }, values: {} },
  { date: "2026-02-22", label: "Feb 22", weekday: "Sun", isFuture: true, processed: { processed: 0, lost: 0, readyToSort: 0, expectedVolume: 1920 }, values: {} },
];

// ---- KPI tile values ----

function k(
  key: MetricKey,
  value: string,
  delta?: { value: string; direction: "up" | "down" } | null,
  extra: Partial<Kpi> = {},
): Kpi {
  return {
    key,
    label: metricConfigs[key].label,
    value,
    delta: delta ?? undefined,
    deltaLabel: delta ? "vs. target" : undefined,
    ...extra,
  };
}

export const kpisToday: Kpi[] = [
  k("processed", "424 / 2,498", null, { highlighted: true }),
  k("pallets", "98%", { value: "2.52%", direction: "up" }),
  k("trucksOnTime", "98%", { value: "2.52%", direction: "up" }),
  k("missort", "--", null, {
    placeholderNote: "Will be calculated on Feb 15",
    tooltip: {
      title: "No data for Feb 14 yet",
      body: "Missort rate is calculated the following day. Feb 14 data will be ready on Feb 15",
    },
  }),
  k("loss", "--", null, {
    placeholderNote: "Will be calculated on Feb 23",
    tooltip: {
      title: "No data for Feb 14 yet",
      body: "Loss rate takes 9 days to calculate. Feb 14 data will be ready on Feb 23",
    },
  }),
  k("preSortSpeed", "132 / hr", { value: "24", direction: "up" }),
  k("sortSpeed", "132 / hr", { value: "4", direction: "down" }),
  k("loadSpeed", "132 / hr", { value: "7", direction: "up" }),
];

export const kpisThisWeek: Kpi[] = [
  k("processed", "11,454 / 15,989", null, { highlighted: true }),
  k("pallets", "97.4%", { value: "2.4%", direction: "up" }),
  k("trucksOnTime", "96.1%", { value: "1.1%", direction: "up" }),
  // Missort: Feb 9–13 calculated (5 days); Feb 14 pending; Feb 15 future.
  k("missort", "0.38%", { value: "0.12%", direction: "down" }, {
    partialNote: "Feb 9 – Feb 13 data only",
    tooltip: {
      title: "Incomplete data for Feb 9 – Feb 15",
      body: "Full data will be calculated on Feb 16",
    },
  }),
  // Loss: all 7 days still pending (within 9 days of today).
  k("loss", "--", null, {
    placeholderNote: "Will be calculated on Feb 24",
    tooltip: {
      title: "No data for Feb 9 – Feb 15 yet",
      body: "Loss rate takes 9 days to calculate. Full data will be ready on Feb 24",
    },
  }),
  k("preSortSpeed", "135 / hr", { value: "15", direction: "up" }),
  k("sortSpeed", "147 / hr", { value: "7", direction: "up" }),
  k("loadSpeed", "138 / hr", { value: "3", direction: "up" }),
];

export const kpisLastWeek: Kpi[] = [
  k("processed", "15,284 / 15,500", null, { highlighted: true }),
  k("pallets", "96.9%", { value: "1.9%", direction: "up" }),
  k("trucksOnTime", "95.2%", { value: "0.2%", direction: "up" }),
  // Missort: all 7 days calculated.
  k("missort", "0.42%", { value: "0.08%", direction: "down" }),
  // Loss: Feb 2–5 calculated (4 days); Feb 6–8 pending.
  k("loss", "0.02%", { value: "0.03%", direction: "down" }, {
    partialNote: "Feb 2 – Feb 5 data only",
    tooltip: {
      title: "Incomplete data for Feb 2 – Feb 8",
      body: "Full data will be calculated on Feb 17",
    },
  }),
  k("preSortSpeed", "132 / hr", { value: "12", direction: "up" }),
  k("sortSpeed", "146 / hr", { value: "6", direction: "up" }),
  k("loadSpeed", "136 / hr", { value: "1", direction: "up" }),
];

export const kpisNextWeek: Kpi[] = [
  { key: "processed", label: "Parcels projected", value: "--", highlighted: true, placeholderNote: "Forecast only" },
  { key: "pallets", label: "Pallets scanned to truck", value: "--", placeholderNote: "No data yet" },
  { key: "trucksOnTime", label: "Trucks departed on time", value: "--", placeholderNote: "No data yet" },
  { key: "missort", label: "Missort rate", value: "--", placeholderNote: "No data yet" },
  { key: "loss", label: "Loss rate", value: "--", placeholderNote: "No data yet" },
  { key: "preSortSpeed", label: "Pre-sort speed", value: "-- / hr", placeholderNote: "No data yet" },
  { key: "sortSpeed", label: "Sort speed", value: "-- / hr", placeholderNote: "No data yet" },
  { key: "loadSpeed", label: "Load speed", value: "-- / hr", placeholderNote: "No data yet" },
];

// ---- Sorter table (16 active, 10 meeting targets) ----
const rawSorters: Omit<Sorter, "meetsTargets" | "id">[] = [
  { name: "John Smith", preSort: 154, sort: 154, load: 154, missort: 0.3, loss: 0.01 },
  { name: "Emily Johnson", preSort: 118, sort: 154, load: 154, missort: 0.3, loss: 0.01 },
  { name: "David Williams", preSort: 132, sort: 154, load: 154, missort: 0.3, loss: 0.01 },
  { name: "Ashley Brown", preSort: 67, sort: 154, load: 154, missort: 0.3, loss: 0.01 },
  { name: "Michael Davis", preSort: 176, sort: 154, load: 154, missort: 0.3, loss: 0.01 },
  { name: "Brittany Miller", preSort: 45, sort: 154, load: 154, missort: 0.3, loss: 0.01 },
  { name: "Christopher Wilson", preSort: 102, sort: 154, load: 154, missort: 0.3, loss: 0.01 },
  { name: "Jessica Moore", preSort: 138, sort: 151, load: 149, missort: 0.4, loss: 0.02 },
  { name: "Daniel Taylor", preSort: 149, sort: 158, load: 146, missort: 0.5, loss: 0.03 },
  { name: "Amanda Anderson", preSort: 122, sort: 147, load: 161, missort: 0.3, loss: 0.01 },
  { name: "Matthew Thomas", preSort: 88, sort: 132, load: 127, missort: 0.8, loss: 0.05 },
  { name: "Sarah Jackson", preSort: 171, sort: 163, load: 159, missort: 0.2, loss: 0.01 },
  { name: "Joshua White", preSort: 129, sort: 141, load: 138, missort: 0.4, loss: 0.02 },
  { name: "Lauren Harris", preSort: 61, sort: 98, load: 104, missort: 1.2, loss: 0.08 },
  { name: "Ryan Martin", preSort: 144, sort: 156, load: 151, missort: 0.3, loss: 0.01 },
  { name: "Megan Thompson", preSort: 97, sort: 119, load: 112, missort: 0.9, loss: 0.06 },
];

const meetingIds = new Set([0, 1, 2, 4, 6, 7, 8, 9, 11, 14]);

export const sorters: Sorter[] = rawSorters.map((s, i) => ({
  id: `S-${i + 1}`,
  ...s,
  meetsTargets: meetingIds.has(i),
}));

export const sortersActiveCount = sorters.length;
export const sortersMeetingCount = sorters.filter((s) => s.meetsTargets).length;

// ---- Hub meta ----
export const hubMeta = {
  id: "HUB-5",
  localTime: "11:30 PM EST",
};

export const dateRangeTabs: { key: DateRangeKey; label: string }[] = [
  { key: "lastWeek", label: "Last week" },
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This week" },
  { key: "nextWeek", label: "Next week" },
  { key: "custom", label: "Custom" },
];

// ---- Range payloads ----
// For each date-range tab we return:
//  - week:   the Mon–Sun week to display in the chart (or null → hide chart)
//  - kpis:   KPI tile values
//  - label:  date label next to tabs
//  - visibleDays: which weekday labels are "in range"
//                 (bars for days outside range are rendered empty/greyed)

export type RangePayload = {
  label: string;
  week: DayBucket[] | null;
  kpis: Kpi[];
  visibleDays?: Set<string>; // date ISO strings
};

const allDays = (w: DayBucket[]) => new Set(w.map((d) => d.date));

export const rangePayloads: Record<DateRangeKey, RangePayload> = {
  today: {
    label: "Feb 14",
    week: weekThis,
    kpis: kpisToday,
    visibleDays: allDays(weekThis),
  },
  thisWeek: {
    label: "Feb 9 – Feb 15",
    week: weekThis,
    kpis: kpisThisWeek,
    visibleDays: allDays(weekThis),
  },
  lastWeek: {
    label: "Feb 2 – Feb 8",
    week: weekLast,
    kpis: kpisLastWeek,
    visibleDays: allDays(weekLast),
  },
  nextWeek: {
    label: "Feb 16 – Feb 22",
    week: weekNext,
    kpis: kpisNextWeek,
    visibleDays: allDays(weekNext),
  },
  custom: {
    // Default custom range demo; overridden at runtime by the picker.
    label: "Feb 14 – Feb 21",
    week: weekThis,
    kpis: kpisThisWeek,
    visibleDays: new Set(["2026-02-14"]),
  },
};

// ---- Helpers for runtime custom-range resolution ----
function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Start/end ISO (inclusive) for each built-in tab. */
export const rangeIsoBounds: Record<Exclude<DateRangeKey, "custom">, { start: string; end: string }> = {
  today: { start: "2026-02-14", end: "2026-02-14" },
  thisWeek: { start: "2026-02-09", end: "2026-02-15" },
  lastWeek: { start: "2026-02-02", end: "2026-02-08" },
  nextWeek: { start: "2026-02-16", end: "2026-02-22" },
};

/**
 * Status of a given day's value for a metric, considering bake time.
 *  - "calculated": fully ready (chart: show bar with value)
 *  - "pending": past-but-not-yet-baked (chart: grey info box)
 *  - "future": date is after today (chart: dashed outline / future)
 */
export type DayStatus = "calculated" | "pending" | "future";

export function getDayStatus(metricKey: MetricKey, dateIso: string): DayStatus {
  if (dateIso > TODAY_ISO) return "future";
  const bake = metricConfigs[metricKey].bakeDays ?? 0;
  if (bake === 0) return "calculated";
  // Last day whose metric is fully calculated
  const last = addDaysIso(TODAY_ISO, -bake);
  return dateIso <= last ? "calculated" : "pending";
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/**
 * Given a user-selected date range, return a RangePayload for the Custom tab.
 * Chart is shown only if the entire range falls within a single Mon–Sun week.
 */
export function resolveCustomRange(start: Date, end: Date): RangePayload {
  // Map of known weeks -> their DayBuckets
  const weeks: { start: string; end: string; week: DayBucket[]; kpis: Kpi[] }[] = [
    { start: "2026-02-02", end: "2026-02-08", week: weekLast, kpis: kpisLastWeek },
    { start: "2026-02-09", end: "2026-02-15", week: weekThis, kpis: kpisThisWeek },
    { start: "2026-02-16", end: "2026-02-22", week: weekNext, kpis: kpisNextWeek },
  ];

  const startIso = isoDate(start);
  const endIso = isoDate(end);
  const label = `${formatShort(start)} – ${formatShort(end)}`;

  // Find a week whose bounds contain both start and end
  const matching = weeks.find((w) => startIso >= w.start && endIso <= w.end);

  // Collect visible days (ISO strings) within the picked range
  const visible = new Set<string>();
  const cursor = new Date(start);
  while (cursor <= end) {
    visible.add(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (matching) {
    return {
      label,
      week: matching.week,
      kpis: matching.kpis,
      visibleDays: visible,
    };
  }

  // Range spans multiple weeks -> hide chart per the rule
  return {
    label,
    week: null,
    kpis: kpisThisWeek,
    visibleDays: visible,
  };
}
