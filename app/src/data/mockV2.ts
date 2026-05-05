// V2 mock data for the Parcel Sort performance dashboard.
// All values are fabricated for demo purposes.

import type { Kpi, DateRangeKey, DayBucket } from "./mock";
import {
  weekThis,
  weekLast,
  weekNext,
  metricConfigs,
  formatShort,
} from "./mock";
import type { Sorter } from "./mock";

// ---- V2-specific chart types ----

export type V2ChartType = "waiting" | "errorBreakdown" | "dwell" | "percent";

export type V2Kpi = Kpi & {
  chartType: V2ChartType;
  /** For 'percent' chart tiles: which V1 metric key drives the VolumeChart. */
  percentMetricKey?: keyof typeof metricConfigs;
  /** For error-breakdown tiles: which breakdown to render. */
  errorBreakdownKey?: "parcel" | "pallet";
};

// ---- Waiting chart data (Waiting for sort / Waiting on pallet) ----

export type WaitingDayBucket = {
  date: string;
  label: string;
  waitingForSort: number;
  waitingOnPallet: number;
  isFuture?: boolean;
  isPartial?: boolean;
};

export type ErrorBreakdownDayBucket = {
  date: string;
  label: string;
  anyError: number;
  sortedLate: number;
  lost: number;
  missorted: number;
};

// Totals match Figma values: 220, 224, 241, 200, 241, 249, 215
export const waitingWeekThis: WaitingDayBucket[] = [
  { date: "2026-02-09", label: "Feb 9",  waitingForSort: 140, waitingOnPallet: 80 },
  { date: "2026-02-10", label: "Feb 10", waitingForSort: 145, waitingOnPallet: 79 },
  { date: "2026-02-11", label: "Feb 11", waitingForSort: 153, waitingOnPallet: 88 },
  { date: "2026-02-12", label: "Feb 12", waitingForSort: 122, waitingOnPallet: 78 },
  { date: "2026-02-13", label: "Feb 13", waitingForSort: 152, waitingOnPallet: 89 },
  { date: "2026-02-14", label: "Feb 14", waitingForSort: 157, waitingOnPallet: 92, isPartial: true },
  { date: "2026-02-15", label: "Feb 15", waitingForSort: 135, waitingOnPallet: 80, isFuture: true },
];

export const waitingWeekLast: WaitingDayBucket[] = [
  { date: "2026-02-02", label: "Feb 2",  waitingForSort: 135, waitingOnPallet: 77 },
  { date: "2026-02-03", label: "Feb 3",  waitingForSort: 148, waitingOnPallet: 81 },
  { date: "2026-02-04", label: "Feb 4",  waitingForSort: 158, waitingOnPallet: 86 },
  { date: "2026-02-05", label: "Feb 5",  waitingForSort: 132, waitingOnPallet: 74 },
  { date: "2026-02-06", label: "Feb 6",  waitingForSort: 152, waitingOnPallet: 85 },
  { date: "2026-02-07", label: "Feb 7",  waitingForSort: 130, waitingOnPallet: 72 },
  { date: "2026-02-08", label: "Feb 8",  waitingForSort: 118, waitingOnPallet: 64 },
];

export const waitingWeekNext: WaitingDayBucket[] = [
  { date: "2026-02-16", label: "Feb 16", waitingForSort: 145, waitingOnPallet: 78, isFuture: true },
  { date: "2026-02-17", label: "Feb 17", waitingForSort: 152, waitingOnPallet: 82, isFuture: true },
  { date: "2026-02-18", label: "Feb 18", waitingForSort: 160, waitingOnPallet: 87, isFuture: true },
  { date: "2026-02-19", label: "Feb 19", waitingForSort: 138, waitingOnPallet: 75, isFuture: true },
  { date: "2026-02-20", label: "Feb 20", waitingForSort: 154, waitingOnPallet: 84, isFuture: true },
  { date: "2026-02-21", label: "Feb 21", waitingForSort: 132, waitingOnPallet: 70, isFuture: true },
  { date: "2026-02-22", label: "Feb 22", waitingForSort: 118, waitingOnPallet: 62, isFuture: true },
];

export const parcelErrorWeekThis: ErrorBreakdownDayBucket[] = [
  { date: "2026-02-09", label: "Feb 9", anyError: 152, sortedLate: 110, lost: 26, missorted: 18 },
  { date: "2026-02-10", label: "Feb 10", anyError: 147, sortedLate: 106, lost: 28, missorted: 16 },
  { date: "2026-02-11", label: "Feb 11", anyError: 138, sortedLate: 97, lost: 25, missorted: 14 },
  { date: "2026-02-12", label: "Feb 12", anyError: 171, sortedLate: 121, lost: 31, missorted: 19 },
  { date: "2026-02-13", label: "Feb 13", anyError: 136, sortedLate: 96, lost: 27, missorted: 15 },
  { date: "2026-02-14", label: "Feb 14", anyError: 30, sortedLate: 21, lost: 6, missorted: 4 },
  { date: "2026-02-15", label: "Feb 15", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
];

export const parcelErrorWeekLast: ErrorBreakdownDayBucket[] = [
  { date: "2026-02-02", label: "Feb 2", anyError: 142, sortedLate: 101, lost: 24, missorted: 17 },
  { date: "2026-02-03", label: "Feb 3", anyError: 149, sortedLate: 106, lost: 27, missorted: 18 },
  { date: "2026-02-04", label: "Feb 4", anyError: 133, sortedLate: 92, lost: 22, missorted: 15 },
  { date: "2026-02-05", label: "Feb 5", anyError: 161, sortedLate: 118, lost: 30, missorted: 20 },
  { date: "2026-02-06", label: "Feb 6", anyError: 144, sortedLate: 102, lost: 26, missorted: 16 },
  { date: "2026-02-07", label: "Feb 7", anyError: 158, sortedLate: 114, lost: 29, missorted: 19 },
  { date: "2026-02-08", label: "Feb 8", anyError: 165, sortedLate: 119, lost: 32, missorted: 21 },
];

export const parcelErrorWeekNext: ErrorBreakdownDayBucket[] = [
  { date: "2026-02-16", label: "Feb 16", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-17", label: "Feb 17", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-18", label: "Feb 18", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-19", label: "Feb 19", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-20", label: "Feb 20", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-21", label: "Feb 21", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-22", label: "Feb 22", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
];

export const palletErrorWeekThis: ErrorBreakdownDayBucket[] = [
  { date: "2026-02-09", label: "Feb 9", anyError: 220, sortedLate: 160, lost: 0, missorted: 82 },
  { date: "2026-02-10", label: "Feb 10", anyError: 224, sortedLate: 164, lost: 0, missorted: 79 },
  { date: "2026-02-11", label: "Feb 11", anyError: 241, sortedLate: 171, lost: 0, missorted: 88 },
  { date: "2026-02-12", label: "Feb 12", anyError: 200, sortedLate: 142, lost: 0, missorted: 74 },
  { date: "2026-02-13", label: "Feb 13", anyError: 241, sortedLate: 170, lost: 0, missorted: 86 },
  { date: "2026-02-14", label: "Feb 14", anyError: 249, sortedLate: 177, lost: 0, missorted: 89 },
  { date: "2026-02-15", label: "Feb 15", anyError: 215, sortedLate: 151, lost: 0, missorted: 76 },
];

export const palletErrorWeekLast: ErrorBreakdownDayBucket[] = [
  { date: "2026-02-02", label: "Feb 2", anyError: 212, sortedLate: 153, lost: 0, missorted: 74 },
  { date: "2026-02-03", label: "Feb 3", anyError: 226, sortedLate: 164, lost: 0, missorted: 80 },
  { date: "2026-02-04", label: "Feb 4", anyError: 238, sortedLate: 173, lost: 0, missorted: 84 },
  { date: "2026-02-05", label: "Feb 5", anyError: 204, sortedLate: 146, lost: 0, missorted: 75 },
  { date: "2026-02-06", label: "Feb 6", anyError: 229, sortedLate: 166, lost: 0, missorted: 82 },
  { date: "2026-02-07", label: "Feb 7", anyError: 198, sortedLate: 141, lost: 0, missorted: 72 },
  { date: "2026-02-08", label: "Feb 8", anyError: 184, sortedLate: 129, lost: 0, missorted: 67 },
];

export const palletErrorWeekNext: ErrorBreakdownDayBucket[] = [
  { date: "2026-02-16", label: "Feb 16", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-17", label: "Feb 17", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-18", label: "Feb 18", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-19", label: "Feb 19", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-20", label: "Feb 20", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-21", label: "Feb 21", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
  { date: "2026-02-22", label: "Feb 22", anyError: 0, sortedLate: 0, lost: 0, missorted: 0 },
];

// ---- Flow rate data ----

export type FlowRateCombo =
  | "parcels-presort"
  | "parcels-sort"
  | "parcels-average"
  | "parcels-max"
  | "pallets-average"
  | "pallets-max";

export type FlowRateDayBucket = {
  date: string;
  label: string;
  blendedAverage: number;
  smallOnly: number;
  largeOnly: number;
};

export type FlowRateWeekData = Record<FlowRateCombo, FlowRateDayBucket[]>;

function genFlowWeek(
  dates: { date: string; label: string }[],
  base: { blended: number; small: number; large: number },
  noise: number[],
): FlowRateDayBucket[] {
  return dates.map((d, i) => ({
    date: d.date,
    label: d.label,
    blendedAverage: Math.max(1, Math.round(base.blended + noise[i] * 2)),
    smallOnly: Math.max(1, Math.round(base.small + noise[i] * 1.5)),
    largeOnly: Math.max(1, Math.round(base.large + noise[i])),
  }));
}

const noiseA = [4, 6, 10, -8, 8, 0, -4];
const noiseB = [-2, 2, 8, -10, 4, -4, -6];

const thisWeekDates = waitingWeekThis.map((d) => ({ date: d.date, label: d.label }));
const lastWeekDates = waitingWeekLast.map((d) => ({ date: d.date, label: d.label }));
const nextWeekDates = waitingWeekNext.map((d) => ({ date: d.date, label: d.label }));

export const flowRateThisWeek: FlowRateWeekData = {
  "parcels-presort":  genFlowWeek(thisWeekDates, { blended: 175, small: 282, large: 78 }, noiseA),
  "parcels-sort":     genFlowWeek(thisWeekDates, { blended: 168, small: 278, large: 76 }, noiseB),
  "parcels-average":  genFlowWeek(thisWeekDates, { blended: 170, small: 280, large: 77 }, noiseA),
  "parcels-max":      genFlowWeek(thisWeekDates, { blended: 192, small: 305, large: 92 }, noiseB),
  "pallets-average":  genFlowWeek(thisWeekDates, { blended: 34, small: 33, large: 31 }, noiseA),
  "pallets-max":      genFlowWeek(thisWeekDates, { blended: 42, small: 40, large: 38 }, noiseB),
};

export const flowRateLastWeek: FlowRateWeekData = {
  "parcels-presort":  genFlowWeek(lastWeekDates, { blended: 130, small: 220, large: 60 }, noiseB),
  "parcels-sort":     genFlowWeek(lastWeekDates, { blended: 145, small: 240, large: 65 }, noiseA),
  "parcels-average":  genFlowWeek(lastWeekDates, { blended: 137, small: 230, large: 62 }, noiseB),
  "parcels-max":      genFlowWeek(lastWeekDates, { blended: 168, small: 270, large: 78 }, noiseA),
  "pallets-average":  genFlowWeek(lastWeekDates, { blended: 33, small: 32, large: 30 }, noiseB),
  "pallets-max":      genFlowWeek(lastWeekDates, { blended: 40, small: 38, large: 36 }, noiseA),
};

export const flowRateNextWeek: FlowRateWeekData = {
  "parcels-presort":  genFlowWeek(nextWeekDates, { blended: 134, small: 140, large: 112 }, noiseA),
  "parcels-sort":     genFlowWeek(nextWeekDates, { blended: 150, small: 157, large: 126 }, noiseB),
  "parcels-average":  genFlowWeek(nextWeekDates, { blended: 142, small: 135, large: 110 }, noiseA),
  "parcels-max":      genFlowWeek(nextWeekDates, { blended: 175, small: 183, large: 151 }, noiseB),
  "pallets-average":  genFlowWeek(nextWeekDates, { blended: 132, small: 129, large: 110 }, noiseA),
  "pallets-max":      genFlowWeek(nextWeekDates, { blended: 165, small: 161, large: 139 }, noiseB),
};

// ---- V2 KPI tile helpers ----

function kv2(
  key: string,
  label: string,
  value: string,
  chartType: V2ChartType,
  delta?: { value: string; direction: "up" | "down" } | null,
  extra: Partial<V2Kpi> = {},
): V2Kpi {
  return {
    key,
    label,
    value,
    chartType,
    delta: delta ?? undefined,
    deltaLabel: delta ? "vs. target" : undefined,
    ...extra,
  };
}

const metricLabelTooltips = {
  parcelsCompleted: {
    title: "Parcels completed",
    body: "Parcels fully processed so far versus the total expected in the selected period",
  },
  parcelErrorRate: {
    title: "Parcel error rate",
    body: "Share of parcels with an operational exception, like late sorting, missorts, or loss",
  },
  palletErrorRate: {
    title: "Pallet error rate",
    body: "Share of pallets with an exception, usually delayed palletizing or pallet missorts",
  },
  parcelDwellTime: {
    title: "Parcel dwell time",
    body: "Total time parcels spend waiting in the hub before moving to the next step",
  },
  trucksDepartedOnTime: {
    title: "Trucks departed on time",
    body: "Percent of controllable truck departures that left within the planned dispatch window",
  },
  parcelsReturnedOnTime: {
    title: "Parcels returned on time",
    body: "Percent of return parcels handed back to the network by the promised cutoff",
  },
} satisfies Record<string, { title: string; body: string }>;

// ---- V2 KPI tiles per range ----

export const kpisV2Today: V2Kpi[] = [
  kv2("parcelsCompleted", "Parcels completed", "424 / 2,498", "waiting", null, {
    labelTooltip: metricLabelTooltips.parcelsCompleted,
  }),
  kv2("parcelErrorRate", "Parcel error rate", "7%", "errorBreakdown",
    { value: "2.52%", direction: "up" },
    {
      deltaColor: "positive",
      errorBreakdownKey: "parcel",
      labelTooltip: metricLabelTooltips.parcelErrorRate,
    },
  ),
  kv2("palletErrorRate", "Pallet error rate", "8%", "errorBreakdown",
    { value: "2.52%", direction: "up" },
    {
      deltaColor: "positive",
      errorBreakdownKey: "pallet",
      labelTooltip: metricLabelTooltips.palletErrorRate,
    },
  ),
  kv2("parcelDwellTime", "Parcel dwell time", "241 hrs", "dwell",
    { value: "142", direction: "up" },
    {
      deltaColor: "negative",
      labelTooltip: metricLabelTooltips.parcelDwellTime,
    },
  ),
  kv2("trucksDepartedOnTime", "Trucks departed on time", "98%", "percent",
    { value: "2.52%", direction: "up" },
    {
      percentMetricKey: "trucksOnTime",
      labelTooltip: metricLabelTooltips.trucksDepartedOnTime,
    },
  ),
  kv2("parcelsReturnedOnTime", "Parcels returned on time", "98%", "percent",
    { value: "2.52%", direction: "up" },
    {
      percentMetricKey: "pallets",
      labelTooltip: metricLabelTooltips.parcelsReturnedOnTime,
    },
  ),
];

export const kpisV2LastWeek: V2Kpi[] = [
  kv2("parcelsCompleted", "Parcels completed", "15,284 / 15,500", "waiting", null, {
    labelTooltip: metricLabelTooltips.parcelsCompleted,
  }),
  kv2("parcelErrorRate", "Parcel error rate", "6.8%", "errorBreakdown",
    { value: "2.7%", direction: "up" },
    {
      deltaColor: "positive",
      errorBreakdownKey: "parcel",
      labelTooltip: metricLabelTooltips.parcelErrorRate,
    },
  ),
  kv2("palletErrorRate", "Pallet error rate", "7.4%", "errorBreakdown",
    { value: "1.6%", direction: "up" },
    {
      deltaColor: "positive",
      errorBreakdownKey: "pallet",
      labelTooltip: metricLabelTooltips.palletErrorRate,
    },
  ),
  kv2("parcelDwellTime", "Parcel dwell time", "228 hrs", "dwell",
    { value: "129", direction: "up" },
    {
      deltaColor: "negative",
      labelTooltip: metricLabelTooltips.parcelDwellTime,
    },
  ),
  kv2("trucksDepartedOnTime", "Trucks departed on time", "95.2%", "percent",
    { value: "0.2%", direction: "up" },
    {
      percentMetricKey: "trucksOnTime",
      labelTooltip: metricLabelTooltips.trucksDepartedOnTime,
    },
  ),
  kv2("parcelsReturnedOnTime", "Parcels returned on time", "97.1%", "percent",
    { value: "2.1%", direction: "up" },
    {
      percentMetricKey: "pallets",
      labelTooltip: metricLabelTooltips.parcelsReturnedOnTime,
    },
  ),
];

export const kpisV2ThisWeek: V2Kpi[] = [
  kv2("parcelsCompleted", "Parcels completed", "11,454 / 15,989", "waiting", null, {
    labelTooltip: metricLabelTooltips.parcelsCompleted,
  }),
  kv2("parcelErrorRate", "Parcel error rate", "7.2%", "errorBreakdown",
    { value: "2.3%", direction: "up" },
    {
      deltaColor: "positive",
      errorBreakdownKey: "parcel",
      labelTooltip: metricLabelTooltips.parcelErrorRate,
      partialNote: "Feb 9 – Feb 13 data only",
      tooltip: {
        title: "Incomplete data for Feb 9 – Feb 15",
        body: "Full parcel error rate will be available on Feb 16",
      },
    },
  ),
  kv2("palletErrorRate", "Pallet error rate", "7.8%", "errorBreakdown",
    { value: "1.2%", direction: "up" },
    {
      deltaColor: "positive",
      errorBreakdownKey: "pallet",
      labelTooltip: metricLabelTooltips.palletErrorRate,
      partialNote: "Feb 9 – Feb 13 data only",
      tooltip: {
        title: "Incomplete data for Feb 9 – Feb 15",
        body: "Full pallet error rate will be available on Feb 16",
      },
    },
  ),
  kv2("parcelDwellTime", "Parcel dwell time", "235 hrs", "dwell",
    { value: "136", direction: "up" },
    {
      deltaColor: "negative",
      labelTooltip: metricLabelTooltips.parcelDwellTime,
    },
  ),
  kv2("trucksDepartedOnTime", "Trucks departed on time", "96.1%", "percent",
    { value: "1.1%", direction: "up" },
    {
      percentMetricKey: "trucksOnTime",
      labelTooltip: metricLabelTooltips.trucksDepartedOnTime,
    },
  ),
  kv2("parcelsReturnedOnTime", "Parcels returned on time", "97.4%", "percent",
    { value: "2.4%", direction: "up" },
    {
      percentMetricKey: "pallets",
      labelTooltip: metricLabelTooltips.parcelsReturnedOnTime,
    },
  ),
];

export const kpisV2NextWeek: V2Kpi[] = [
  kv2("parcelsCompleted", "Parcels completed", "--", "waiting", null, {
    placeholderNote: "No data yet",
    labelTooltip: metricLabelTooltips.parcelsCompleted,
  }),
  kv2("parcelErrorRate", "Parcel error rate", "--", "errorBreakdown", null, {
    errorBreakdownKey: "parcel",
    placeholderNote: "No data yet",
    labelTooltip: metricLabelTooltips.parcelErrorRate,
  }),
  kv2("palletErrorRate", "Pallet error rate", "--", "errorBreakdown", null, {
    errorBreakdownKey: "pallet",
    placeholderNote: "No data yet",
    labelTooltip: metricLabelTooltips.palletErrorRate,
  }),
  kv2("parcelDwellTime", "Parcel dwell time", "--", "dwell", null, {
    placeholderNote: "No data yet",
    labelTooltip: metricLabelTooltips.parcelDwellTime,
  }),
  kv2("trucksDepartedOnTime", "Trucks departed on time", "--", "percent", null, {
    percentMetricKey: "trucksOnTime",
    placeholderNote: "No data yet",
    labelTooltip: metricLabelTooltips.trucksDepartedOnTime,
  }),
  kv2("parcelsReturnedOnTime", "Parcels returned on time", "--", "percent", null, {
    percentMetricKey: "pallets",
    placeholderNote: "No data yet",
    labelTooltip: metricLabelTooltips.parcelsReturnedOnTime,
  }),
];

// ---- V2 Range payload ----

export type V2RangePayload = {
  label: string;
  week: DayBucket[] | null;         // V1 DayBucket[] for percent charts
  waitingWeek: WaitingDayBucket[] | null;
  parcelErrorWeek: ErrorBreakdownDayBucket[] | null;
  palletErrorWeek: ErrorBreakdownDayBucket[] | null;
  flowRateWeek: FlowRateWeekData;
  kpis: V2Kpi[];
  visibleDays?: Set<string>;
};

const allDays = (w: { date: string }[]) => new Set(w.map((d) => d.date));

export const rangePayloadsV2: Record<DateRangeKey, V2RangePayload> = {
  today: {
    label: "Feb 14",
    week: weekThis,
    waitingWeek: waitingWeekThis,
    parcelErrorWeek: parcelErrorWeekThis,
    palletErrorWeek: palletErrorWeekThis,
    flowRateWeek: flowRateThisWeek,
    kpis: kpisV2Today,
    visibleDays: allDays(weekThis),
  },
  thisWeek: {
    label: "Feb 9 – Feb 15",
    week: weekThis,
    waitingWeek: waitingWeekThis,
    parcelErrorWeek: parcelErrorWeekThis,
    palletErrorWeek: palletErrorWeekThis,
    flowRateWeek: flowRateThisWeek,
    kpis: kpisV2ThisWeek,
    visibleDays: allDays(weekThis),
  },
  lastWeek: {
    label: "Feb 2 – Feb 8",
    week: weekLast,
    waitingWeek: waitingWeekLast,
    parcelErrorWeek: parcelErrorWeekLast,
    palletErrorWeek: palletErrorWeekLast,
    flowRateWeek: flowRateLastWeek,
    kpis: kpisV2LastWeek,
    visibleDays: allDays(weekLast),
  },
  nextWeek: {
    label: "Feb 16 – Feb 22",
    week: weekNext,
    waitingWeek: waitingWeekNext,
    parcelErrorWeek: parcelErrorWeekNext,
    palletErrorWeek: palletErrorWeekNext,
    flowRateWeek: flowRateNextWeek,
    kpis: kpisV2NextWeek,
    visibleDays: allDays(weekNext),
  },
  custom: {
    label: "Feb 14 – Feb 21",
    week: weekThis,
    waitingWeek: waitingWeekThis,
    parcelErrorWeek: parcelErrorWeekThis,
    palletErrorWeek: palletErrorWeekThis,
    flowRateWeek: flowRateThisWeek,
    kpis: kpisV2ThisWeek,
    visibleDays: new Set(["2026-02-14"]),
  },
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function resolveCustomRangeV2(start: Date, end: Date): V2RangePayload {
  const weeks: {
    start: string;
    end: string;
    week: DayBucket[];
    waitingWeek: WaitingDayBucket[];
    parcelErrorWeek: ErrorBreakdownDayBucket[];
    palletErrorWeek: ErrorBreakdownDayBucket[];
    flowRateWeek: FlowRateWeekData;
    kpis: V2Kpi[];
  }[] = [
    { start: "2026-02-02", end: "2026-02-08", week: weekLast, waitingWeek: waitingWeekLast, parcelErrorWeek: parcelErrorWeekLast, palletErrorWeek: palletErrorWeekLast, flowRateWeek: flowRateLastWeek, kpis: kpisV2LastWeek },
    { start: "2026-02-09", end: "2026-02-15", week: weekThis, waitingWeek: waitingWeekThis, parcelErrorWeek: parcelErrorWeekThis, palletErrorWeek: palletErrorWeekThis, flowRateWeek: flowRateThisWeek, kpis: kpisV2ThisWeek },
    { start: "2026-02-16", end: "2026-02-22", week: weekNext, waitingWeek: waitingWeekNext, parcelErrorWeek: parcelErrorWeekNext, palletErrorWeek: palletErrorWeekNext, flowRateWeek: flowRateNextWeek, kpis: kpisV2NextWeek },
  ];

  const startIso = isoDate(start);
  const endIso = isoDate(end);
  const label = `${formatShort(start)} – ${formatShort(end)}`;

  const matching = weeks.find((w) => startIso >= w.start && endIso <= w.end);
  const visible = new Set<string>();
  const cursor = new Date(start);
  while (cursor <= end) {
    visible.add(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (matching) {
    return { label, week: matching.week, waitingWeek: matching.waitingWeek, parcelErrorWeek: matching.parcelErrorWeek, palletErrorWeek: matching.palletErrorWeek, flowRateWeek: matching.flowRateWeek, kpis: matching.kpis, visibleDays: visible };
  }
  return { label, week: null, waitingWeek: null, parcelErrorWeek: null, palletErrorWeek: null, flowRateWeek: flowRateThisWeek, kpis: kpisV2ThisWeek, visibleDays: visible };
}

// ---- SorterV2 ----

export type SorterV2 = {
  id: string;
  name: string;
  parcelRate: number;
  parcelPreSortRate: number;
  parcelSortRate: number;
  parcelsSorted: number;
  parcelsMissorted: number;
  parcelsLost: number;
  palletRate: number;
  palletsLoaded: number;
  idleTime: number;
  meetsTargets: boolean;
  belowTargetMetric?: "parcelPreSortRate" | "parcelSortRate" | "palletRate" | "parcelsMissorted" | "parcelsLost" | null;
};

function hashStr(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function toSorterV2(s: Sorter, days = 1): SorterV2 {
  const parcelsSorted = Math.round(s.preSort * 8 * days);
  const palletLoadSeed = hashStr(`${s.id}-${days}`);
  const palletLoadVariance = (palletLoadSeed % 19) - 9;
  const palletsLoaded = Math.max(24, Math.round(s.load * 1.55 * days + palletLoadVariance));
  // Idle time: 0.5–2.0 hrs per day, seeded per person
  const idleSeed = hashStr(`${s.id}-idle-${days}`);
  const idlePerDay = 0.5 + (idleSeed % 16) / 10; // 0.5 to 2.0
  const idleTime = Number((idlePerDay * days).toFixed(1));

  return {
    id: s.id,
    name: s.name,
    parcelRate: s.preSort,
    parcelPreSortRate: s.preSort,
    parcelSortRate: s.sort,
    parcelsSorted,
    parcelsMissorted: Math.max(0, Math.round(parcelsSorted * s.missort / 100)),
    parcelsLost: Math.max(0, Math.round(parcelsSorted * s.loss / 100)),
    palletRate: s.load,
    palletsLoaded,
    idleTime,
    meetsTargets: true,
    belowTargetMetric: null,
  };
}

type SorterIssue = {
  metric: "parcelPreSortRate" | "parcelSortRate" | "palletRate" | "parcelsMissorted" | "parcelsLost";
  severity: number;
};

function getPrimarySorterIssue(sorter: SorterV2): SorterIssue {
  const issueCandidates: SorterIssue[] = [
    {
      metric: "parcelPreSortRate",
      severity: Math.max(0, (85 - sorter.parcelPreSortRate) / 85),
    },
    {
      metric: "parcelSortRate",
      severity: Math.max(0, (110 - sorter.parcelSortRate) / 110),
    },
    {
      metric: "palletRate",
      severity: Math.max(0, (110 - sorter.palletRate) / 110),
    },
    {
      metric: "parcelsMissorted",
      severity: Math.max(0, (sorter.parcelsMissorted - 45) / 45),
    },
    {
      metric: "parcelsLost",
      severity: Math.max(0, (sorter.parcelsLost - 3) / 3),
    },
  ];

  return issueCandidates.sort((left, right) => right.severity - left.severity)[0];
}

export function applySorterTargetStatuses(sorters: SorterV2[]) {
  return sorters.map((sorter) => {
    const issue = getPrimarySorterIssue(sorter);
    const belowTarget = issue.severity > 0;

    return {
      ...sorter,
      meetsTargets: !belowTarget,
      belowTargetMetric: belowTarget ? issue.metric : null,
    };
  });
}
