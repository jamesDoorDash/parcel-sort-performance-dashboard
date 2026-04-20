import type { DateRangeKey, DayBucket } from "./mock";
import { TODAY_ISO, rangeIsoBounds, weekLast, weekNext, weekThis } from "./mock";
import type { FlowRateWeekData, WaitingDayBucket } from "./mockV2";
import {
  flowRateLastWeek,
  flowRateNextWeek,
  flowRateThisWeek,
  waitingWeekLast,
  waitingWeekNext,
  waitingWeekThis,
} from "./mockV2";

export type V3MetricId =
  | "parcelsProcessed"
  | "parcelsSortedOnTime"
  | "parcelsMissorted"
  | "parcelsLost"
  | "parcelDwellTime"
  | "parcelSortRate"
  | "parcelsReturnedOnTime"
  | "returnsScannedToPallet"
  | "returnPalletScannedToTruck"
  | "palletsScannedToTruck"
  | "palletsLoadedOnTime"
  | "palletsMissloaded"
  | "palletLoadRate"
  | "trucksDepartedOnTime";

export type V3ChartKind = "processed" | "waiting" | "simple" | "flowBreakout";
export type V3MetricUnit = "count" | "percent" | "rate" | "hours";

export type V3MetricCard = {
  id: string;
  label: string;
  labelTooltip: {
    title: string;
    body: string;
  };
  value: string;
  placeholderNote?: string;
  bakeNote?: { title: string; body: string };
  delta?: {
    value: string;
    direction: "up" | "down";
    tone: "positive" | "negative" | "neutral";
    tooltip?: string;
  } | null;
  selected?: boolean;
};

export type V3SimpleSeriesDay = {
  date: string;
  label: string;
  value: number;
  isFuture?: boolean;
  isPartial?: boolean;
};

type V3MetricDefinition = {
  id: V3MetricId;
  label: string;
  description: {
    title: string;
    body: string;
  };
  unit: V3MetricUnit;
  chartKind: V3ChartKind;
  target?: number;
  lowerIsBetter?: boolean;
  bakeDays?: number;
  chartLabel?: string;
  targetLabel?: string;
  formatValue: (value: number, context?: { denominator?: number }) => string;
  formatDelta?: (value: number) => string;
  summarize: (days: V3SimpleSeriesDay[]) => { value: number; denominator?: number };
};

type V3WeekKey = "lastWeek" | "thisWeek" | "nextWeek";

export type V3RangePayload = {
  label: string;
  cards: V3MetricCard[];
  waitingWeek: WaitingDayBucket[];
  flowRateWeek: FlowRateWeekData;
  processedWeek: DayBucket[];
  palletVolumeWeek: DayBucket[];
  returnVolumeWeek: DayBucket[];
  simpleSeries: Partial<Record<V3MetricId, V3SimpleSeriesDay[]>>;
  visibleDays?: Set<string>;
};

const metricDefinitions: V3MetricDefinition[] = [
  {
    id: "parcelsProcessed",
    label: "Parcels processed",
    description: {
      title: "Parcels processed",
      body: "Number of parcels successfully sorted and outbounded versus the expected parcel volume in the selected period",
    },
    unit: "count",
    chartKind: "processed",
    chartLabel: "Processed parcels",
    formatValue: (value, context) => `${Math.round(value).toLocaleString()} / ${Math.round(context?.denominator ?? 0).toLocaleString()}`,
    summarize: () => ({ value: 0, denominator: 0 }),
  },
  {
    id: "parcelsSortedOnTime",
    label: "Parcels sorted on time",
    description: {
      title: "Parcels sorted on time",
      body: "Percent of parcels sorted before the sort deadline in the selected period",
    },
    unit: "percent",
    chartKind: "simple",
    target: 98,
    chartLabel: "On-time sort rate",
    targetLabel: "98%",
    formatValue: (value) => `${value.toFixed(1)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(1)}%`,
    summarize: averageSummary,
  },
  {
    id: "parcelsMissorted",
    label: "Parcel missort rate",
    description: {
      title: "Parcels missorted",
      body: "Percent of parcels that were scanned or placed into the wrong area during sorting",
    },
    unit: "percent",
    chartKind: "simple",
    target: 0.1,
    lowerIsBetter: true,
    bakeDays: 1,
    chartLabel: "Missort rate",
    targetLabel: "0.1%",
    formatValue: (value) => `${value.toFixed(2)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(2)}%`,
    summarize: averageSummary,
  },
  {
    id: "parcelsLost",
    label: "Parcel loss rate",
    description: {
      title: "Parcels lost",
      body: "Percent of parcels that still have not appeared in the expected area after 9 days with no further scans",
    },
    unit: "percent",
    chartKind: "simple",
    target: 0.01,
    lowerIsBetter: true,
    bakeDays: 9,
    chartLabel: "Loss rate",
    targetLabel: "0.010%",
    formatValue: (value) => `${value.toFixed(3)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(3)}%`,
    summarize: averageSummary,
  },
  {
    id: "parcelDwellTime",
    label: "Dwelled parcels",
    description: {
      title: "Dwelled parcels",
      body: "Number of parcels that have dwelled for more than 24 hours in the selected period",
    },
    unit: "count",
    chartKind: "waiting",
    target: 0,
    lowerIsBetter: true,
    chartLabel: "Dwelled parcels",
    formatValue: (value) => `${Math.round(value)}`,
    formatDelta: (value) => `${Math.abs(Math.round(value))}`,
    summarize: averageSummary,
  },
  {
    id: "parcelSortRate",
    label: "Parcel sort rate",
    description: {
      title: "Parcel sort rate",
      body: "Average number of parcels sorted per labor hour during active sort time in the selected period",
    },
    unit: "rate",
    chartKind: "flowBreakout",
    target: 140,
    chartLabel: "Parcels per hour",
    targetLabel: "140 / hr",
    formatValue: (value) => `${Math.round(value)} / hr`,
    formatDelta: (value) => `${Math.abs(Math.round(value))}`,
    summarize: averageSummary,
  },
  {
    id: "parcelsReturnedOnTime",
    label: "Parcels returned on time",
    description: {
      title: "Parcels returned on time",
      body: "Percent of parcels successfully returned in the selected period. Some days may have no expected return parcels",
    },
    unit: "percent",
    chartKind: "simple",
    target: 98,
    chartLabel: "Returns on time",
    targetLabel: "98%",
    formatValue: (value) => `${value.toFixed(1)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(1)}%`,
    summarize: averageSummary,
  },
  {
    id: "returnsScannedToPallet",
    label: "Returns scanned to pallet",
    description: {
      title: "Returns scanned to pallet",
      body: "Percent of return parcels successfully scanned to a return pallet in the selected period",
    },
    unit: "percent",
    chartKind: "simple",
    target: 98,
    chartLabel: "Return scan-to-pallet rate",
    targetLabel: "98%",
    formatValue: (value) => `${value.toFixed(1)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(1)}%`,
    summarize: averageSummary,
  },
  {
    id: "returnPalletScannedToTruck",
    label: "Return pallets scanned to truck",
    description: {
      title: "Return pallets scanned to truck",
      body: "Percent of return pallets successfully scanned to a truck in the selected period",
    },
    unit: "percent",
    chartKind: "simple",
    target: 98,
    chartLabel: "Return pallet scan-to-truck rate",
    targetLabel: "98%",
    formatValue: (value) => `${value.toFixed(1)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(1)}%`,
    summarize: averageSummary,
  },
  {
    id: "palletsScannedToTruck",
    label: "Pallets scanned to truck",
    description: {
      title: "Pallets scanned to truck",
      body: "Percent of pallets successfully scanned to the correct truck before outbound",
    },
    unit: "percent",
    chartKind: "simple",
    target: 100,
    chartLabel: "Scan-to-truck rate",
    targetLabel: "100%",
    formatValue: (value) => `${value.toFixed(1)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(1)}%`,
    summarize: averageSummary,
  },
  {
    id: "palletsLoadedOnTime",
    label: "Pallets loaded on time",
    description: {
      title: "Pallets loaded on time",
      body: "Percent of outbound pallets loaded before their scheduled dispatch readiness cutoff",
    },
    unit: "percent",
    chartKind: "simple",
    target: 99,
    chartLabel: "On-time pallet loading",
    targetLabel: "99%",
    formatValue: (value) => `${value.toFixed(1)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(1)}%`,
    summarize: averageSummary,
  },
  {
    id: "palletsMissloaded",
    label: "Pallets missloaded",
    description: {
      title: "Pallets missloaded",
      body: "Percent of pallets that ended up at the wrong facility",
    },
    unit: "percent",
    chartKind: "simple",
    target: 0.1,
    lowerIsBetter: true,
    bakeDays: 1,
    chartLabel: "Pallet missload rate",
    targetLabel: "0.1%",
    formatValue: (value) => `${value.toFixed(2)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(2)}%`,
    summarize: averageSummary,
  },
  {
    id: "palletLoadRate",
    label: "Pallet load rate",
    description: {
      title: "Pallet load rate",
      body: "Average number of pallets loaded onto trucks per labor hour during active load time in the selected period",
    },
    unit: "rate",
    chartKind: "simple",
    target: 55,
    chartLabel: "Pallets per hour",
    targetLabel: "55 / hr",
    formatValue: (value) => `${Math.round(value)} / hr`,
    formatDelta: (value) => `${Math.abs(Math.round(value))}`,
    summarize: averageSummary,
  },
  {
    id: "trucksDepartedOnTime",
    label: "Trucks departed on time",
    description: {
      title: "Trucks departed on time",
      body: "Percent of trucks that were loaded and left the facility before their critical pull time",
    },
    unit: "percent",
    chartKind: "simple",
    target: 99,
    chartLabel: "On-time departures",
    targetLabel: "99%",
    formatValue: (value) => `${value.toFixed(1)}%`,
    formatDelta: (value) => `${Math.abs(value).toFixed(1)}%`,
    summarize: averageSummary,
  },
];

const thisWeekSimpleSeries: Record<Exclude<V3MetricId, "parcelsProcessed" | "parcelDwellTime">, V3SimpleSeriesDay[]> = {
  parcelsSortedOnTime: [
    day("2026-02-09", "Feb 9", 98.4),
    day("2026-02-10", "Feb 10", 98.1),
    day("2026-02-11", "Feb 11", 98.9),
    day("2026-02-12", "Feb 12", 96.9),
    day("2026-02-13", "Feb 13", 98.6),
    day("2026-02-14", "Feb 14", 97.6, { isPartial: true }),
    day("2026-02-15", "Feb 15", 98.2, { isFuture: true }),
  ],
  parcelsMissorted: [
    day("2026-02-09", "Feb 9", 0.11),
    day("2026-02-10", "Feb 10", 0.09),
    day("2026-02-11", "Feb 11", 0.08),
    day("2026-02-12", "Feb 12", 0.15),
    day("2026-02-13", "Feb 13", 0.09),
    day("2026-02-14", "Feb 14", 0.12, { isPartial: true }),
    day("2026-02-15", "Feb 15", 0.1, { isFuture: true }),
  ],
  parcelsLost: [
    day("2026-02-09", "Feb 9", 0.01),
    day("2026-02-10", "Feb 10", 0.01),
    day("2026-02-11", "Feb 11", 0.0),
    day("2026-02-12", "Feb 12", 0.02),
    day("2026-02-13", "Feb 13", 0.01),
    day("2026-02-14", "Feb 14", 0.02, { isPartial: true }),
    day("2026-02-15", "Feb 15", 0.01, { isFuture: true }),
  ],
  parcelSortRate: [
    day("2026-02-09", "Feb 9", 138),
    day("2026-02-10", "Feb 10", 141),
    day("2026-02-11", "Feb 11", 145),
    day("2026-02-12", "Feb 12", 129),
    day("2026-02-13", "Feb 13", 142),
    day("2026-02-14", "Feb 14", 132, { isPartial: true }),
    day("2026-02-15", "Feb 15", 137, { isFuture: true }),
  ],
  parcelsReturnedOnTime: [
    day("2026-02-09", "Feb 9", 98.8),
    day("2026-02-10", "Feb 10", 98.5),
    day("2026-02-11", "Feb 11", 99.1),
    day("2026-02-12", "Feb 12", 97.6),
    day("2026-02-13", "Feb 13", 98.7),
    day("2026-02-14", "Feb 14", 98.4, { isPartial: true }),
    day("2026-02-15", "Feb 15", 98.9, { isFuture: true }),
  ],
  returnsScannedToPallet: [
    day("2026-02-09", "Feb 9", 97.5),
    day("2026-02-10", "Feb 10", 98.1),
    day("2026-02-11", "Feb 11", 98.6),
    day("2026-02-12", "Feb 12", 96.8),
    day("2026-02-13", "Feb 13", 97.9),
    day("2026-02-14", "Feb 14", 97.2, { isPartial: true }),
    day("2026-02-15", "Feb 15", 98.0, { isFuture: true }),
  ],
  returnPalletScannedToTruck: [
    day("2026-02-09", "Feb 9", 98.2),
    day("2026-02-10", "Feb 10", 97.8),
    day("2026-02-11", "Feb 11", 98.9),
    day("2026-02-12", "Feb 12", 97.1),
    day("2026-02-13", "Feb 13", 98.4),
    day("2026-02-14", "Feb 14", 97.6, { isPartial: true }),
    day("2026-02-15", "Feb 15", 98.3, { isFuture: true }),
  ],
  palletsScannedToTruck: [
    day("2026-02-09", "Feb 9", 99.6),
    day("2026-02-10", "Feb 10", 99.8),
    day("2026-02-11", "Feb 11", 100),
    day("2026-02-12", "Feb 12", 99.1),
    day("2026-02-13", "Feb 13", 99.7),
    day("2026-02-14", "Feb 14", 99.4, { isPartial: true }),
    day("2026-02-15", "Feb 15", 99.9, { isFuture: true }),
  ],
  palletsLoadedOnTime: [
    day("2026-02-09", "Feb 9", 98.5),
    day("2026-02-10", "Feb 10", 98.9),
    day("2026-02-11", "Feb 11", 99.2),
    day("2026-02-12", "Feb 12", 97.4),
    day("2026-02-13", "Feb 13", 98.7),
    day("2026-02-14", "Feb 14", 97.9, { isPartial: true }),
    day("2026-02-15", "Feb 15", 98.6, { isFuture: true }),
  ],
  palletsMissloaded: [
    day("2026-02-09", "Feb 9", 0.12),
    day("2026-02-10", "Feb 10", 0.09),
    day("2026-02-11", "Feb 11", 0.08),
    day("2026-02-12", "Feb 12", 0.19),
    day("2026-02-13", "Feb 13", 0.11),
    day("2026-02-14", "Feb 14", 0.18, { isPartial: true }),
    day("2026-02-15", "Feb 15", 0.1, { isFuture: true }),
  ],
  palletLoadRate: [
    day("2026-02-09", "Feb 9", 54),
    day("2026-02-10", "Feb 10", 56),
    day("2026-02-11", "Feb 11", 58),
    day("2026-02-12", "Feb 12", 49),
    day("2026-02-13", "Feb 13", 57),
    day("2026-02-14", "Feb 14", 52, { isPartial: true }),
    day("2026-02-15", "Feb 15", 55, { isFuture: true }),
  ],
  trucksDepartedOnTime: [
    day("2026-02-09", "Feb 9", 99.1),
    day("2026-02-10", "Feb 10", 98.9),
    day("2026-02-11", "Feb 11", 99.4),
    day("2026-02-12", "Feb 12", 97.8),
    day("2026-02-13", "Feb 13", 99.0),
    day("2026-02-14", "Feb 14", 98.8, { isPartial: true }),
    day("2026-02-15", "Feb 15", 99.1, { isFuture: true }),
  ],
};

const lastWeekSimpleSeries = shiftSeries(thisWeekSimpleSeries, [
  0.2, -0.1, 0.01, 3, 0.3, 0.3, 0.2, 0.2, 0.4, 0.02, 2, 0.2,
]);
const nextWeekSimpleSeries = shiftSeries(thisWeekSimpleSeries, [
  0.1, -0.01, -0.0, 2, 0.2, 0.1, 0.15, 0.1, 0.2, -0.01, 1, 0.1,
], true);

const simpleSeriesByWeek: Record<V3WeekKey, Partial<Record<V3MetricId, V3SimpleSeriesDay[]>>> = {
  lastWeek: lastWeekSimpleSeries,
  thisWeek: thisWeekSimpleSeries,
  nextWeek: nextWeekSimpleSeries,
};

const waitingByWeek: Record<V3WeekKey, WaitingDayBucket[]> = {
  lastWeek: waitingWeekLast,
  thisWeek: waitingWeekThis,
  nextWeek: waitingWeekNext,
};

const flowRateByWeek: Record<V3WeekKey, FlowRateWeekData> = {
  lastWeek: flowRateLastWeek,
  thisWeek: flowRateThisWeek,
  nextWeek: flowRateNextWeek,
};

const processedByWeek: Record<V3WeekKey, DayBucket[]> = {
  lastWeek: weekLast,
  thisWeek: weekThis,
  nextWeek: weekNext,
};

/** Derive pallet volume data from parcel data (~15% of parcel volume) */
function derivePalletVolume(parcelWeek: DayBucket[]): DayBucket[] {
  return parcelWeek.map((d) => {
    const scale = 0.035;
    const dispatched = Math.round(d.processed.processed * scale);
    const missloaded = Math.round(d.processed.lost * scale * 0.5);
    const ready = Math.round(d.processed.readyToSort * scale);
    const expected = Math.round(d.processed.expectedVolume * scale);
    return {
      ...d,
      processed: {
        processed: dispatched,
        lost: missloaded,
        readyToSort: ready,
        expectedVolume: expected,
      },
    };
  });
}

/** Derive return volume data — some days zero, others 5-35 */
const RETURN_PATTERNS: number[][] = [
  [12, 0, 28, 7, 0, 19, 0],   // lastWeek
  [0, 15, 0, 33, 22, 0, 8],   // thisWeek
  [25, 0, 11, 0, 0, 18, 30],  // nextWeek
];
let returnPatternIdx = 0;

function deriveReturnVolume(parcelWeek: DayBucket[]): DayBucket[] {
  const pattern = RETURN_PATTERNS[returnPatternIdx % RETURN_PATTERNS.length];
  returnPatternIdx++;
  return parcelWeek.map((d, i) => {
    const total = pattern[i] ?? 0;
    const lost = total > 0 ? Math.min(2, Math.round(total * 0.05)) : 0;
    const returned = Math.max(0, total - lost);
    const ready = d.isFuture ? Math.round(total * 0.8) : 0;
    const expected = d.isFuture ? total : 0;
    return {
      ...d,
      processed: {
        processed: returned,
        sortedLate: 0,
        lost,
        readyToSort: ready,
        expectedVolume: expected,
      },
    };
  });
}

const palletVolumeByWeek: Record<V3WeekKey, DayBucket[]> = {
  lastWeek: derivePalletVolume(weekLast),
  thisWeek: derivePalletVolume(weekThis),
  nextWeek: derivePalletVolume(weekNext),
};

const returnVolumeByWeek: Record<V3WeekKey, DayBucket[]> = {
  lastWeek: deriveReturnVolume(weekLast),
  thisWeek: deriveReturnVolume(weekThis),
  nextWeek: deriveReturnVolume(weekNext),
};

export const rangePayloadsV3: Record<Exclude<DateRangeKey, "custom">, V3RangePayload> = {
  today: createPayload("thisWeek", new Set(["2026-02-14"]), "Feb 14"),
  thisWeek: createPayload("thisWeek", undefined, "This week"),
  lastWeek: createPayload("lastWeek", undefined, "Last week"),
  nextWeek: createPayload("nextWeek", undefined, "Next week"),
};

export function resolveCustomRangeV3(start: Date, end: Date): V3RangePayload {
  const startIso = toIso(start);
  const endIso = toIso(end);
  const label = `${formatShort(start)} – ${formatShort(end)}`;

  const matching = (Object.entries(rangeIsoBounds) as Array<[V3WeekKey | "today", { start: string; end: string }]>)
    .find(([key, bounds]) => key !== "today" && startIso >= bounds.start && endIso <= bounds.end);

  const visibleDays = new Set<string>();
  const cursor = new Date(start);
  while (cursor <= end) {
    visibleDays.add(toIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (!matching || matching[0] === "today") {
    return createPayload("thisWeek", visibleDays, label);
  }

  return createPayload(matching[0], visibleDays, label);
}

export function getMetricDefinition(id: V3MetricId) {
  return metricDefinitions.find((metric) => metric.id === id)!;
}

function createPayload(week: V3WeekKey, visibleDays: Set<string> | undefined, label: string): V3RangePayload {
  const cards = metricDefinitions.map((metric) => createCard(metric, week, visibleDays));
  return {
    label,
    cards,
    waitingWeek: waitingByWeek[week],
    flowRateWeek: flowRateByWeek[week],
    processedWeek: processedByWeek[week],
    palletVolumeWeek: palletVolumeByWeek[week],
    returnVolumeWeek: returnVolumeByWeek[week],
    simpleSeries: simpleSeriesByWeek[week],
    visibleDays,
  };
}

function createCard(definition: V3MetricDefinition, week: V3WeekKey, visibleDays?: Set<string>): V3MetricCard {
  if (definition.id === "parcelsProcessed") {
    const days = processedByWeek[week].filter((day) => !visibleDays || visibleDays.has(day.date));
    const hasObservedDay = days.some((day) => !day.isFuture);
    const allFutureDays = days.length > 0 && days.every((day) => day.isFuture);

    if (allFutureDays) {
      const projected = days.reduce((sum, day) => sum + day.processed.expectedVolume, 0);
      return {
        id: definition.id,
        label: definition.label,
        labelTooltip: definition.description,
        value: `0 / ${projected.toLocaleString()}`,
        delta: null,
      };
    }

    if (!hasObservedDay) {
      return {
        id: definition.id,
        label: definition.label,
        labelTooltip: definition.description,
        value: "--",
        placeholderNote: "No data yet",
        delta: null,
      };
    }

    const processed = days.reduce((sum, day) => sum + day.processed.processed, 0);
    const expected = days.reduce((sum, day) => sum + day.processed.expectedVolume, 0);

    return {
      id: definition.id,
      label: definition.label,
      labelTooltip: definition.description,
      value: definition.formatValue(processed, { denominator: expected }),
      delta: null,
    };
  }

  if (definition.id === "parcelDwellTime") {
    // Derive parcel counts dwelling >24hrs from waiting hours data
    const DWELL_COUNTS = [3, 0, 8, 12, 5, 0, 7];
    const days = waitingByWeek[week]
      .filter((day) => !visibleDays || visibleDays.has(day.date))
      .map((day, i) => ({
        date: day.date,
        label: day.label,
        value: DWELL_COUNTS[i % DWELL_COUNTS.length],
        isFuture: day.isFuture,
      }));
    const observedDays = days.filter((day) => !day.isFuture);

    if (observedDays.length === 0) {
      return {
        id: definition.id,
        label: definition.label,
        labelTooltip: definition.description,
        value: "--",
        placeholderNote: "No data yet",
        delta: null,
      };
    }

    const summary = definition.summarize(observedDays);
    return {
      id: definition.id,
      label: definition.label,
      labelTooltip: definition.description,
      value: definition.formatValue(summary.value),
      delta: createDelta(definition, summary.value),
    };
  }

  const days = (simpleSeriesByWeek[week][definition.id] ?? []).filter(
    (day) => !visibleDays || visibleDays.has(day.date),
  );
  const observedDays = days.filter((day) => !day.isFuture && !isPendingDay(day.date, definition.bakeDays));

  if (observedDays.length === 0) {
    return {
      id: definition.id,
      label: definition.label,
      labelTooltip: definition.description,
      value: definition.unit === "rate" ? "-- / hr" : "--",
      placeholderNote: "No data yet",
      delta: null,
    };
  }

  const summary = definition.summarize(observedDays);

  // Check if some days in the range are still baking
  let bakeNote: { title: string; body: string } | undefined;
  if (definition.bakeDays && definition.bakeDays >= 1) {
    const nonFutureDays = days.filter((day) => !day.isFuture);
    const pendingDays = nonFutureDays.filter((day) => isPendingDay(day.date, definition.bakeDays));
    if (pendingDays.length > 0) {
      const fmtShort = (iso: string) => {
        const d = new Date(`${iso}T00:00:00`);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      };
      // Use the last day in the full range (including future) to compute when all data is ready
      const lastDayInRange = days.reduce((a, b) => (a.date > b.date ? a : b));
      const fullDataDate = new Date(`${lastDayInRange.date}T00:00:00`);
      fullDataDate.setDate(fullDataDate.getDate() + definition.bakeDays);
      const readyLabel = fullDataDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const rangeLabel = (arr: typeof observedDays) => {
        if (arr.length === 0) return "";
        if (arr.length === 1) return fmtShort(arr[0].date);
        return `${fmtShort(arr[0].date)} – ${fmtShort(arr[arr.length - 1].date)}`;
      };
      const daysWord = definition.bakeDays === 1 ? "day" : "days";

      bakeNote = {
        title: `${definition.label} takes ${definition.bakeDays} ${daysWord} to finalize`,
        body: `Showing ${rangeLabel(observedDays)}. Full results for this period by ${readyLabel}.`,
      };
    }
  }

  return {
    id: definition.id,
    label: definition.label,
    labelTooltip: definition.description,
    value: definition.formatValue(summary.value, { denominator: summary.denominator }),
    delta: createDelta(definition, summary.value),
    bakeNote,
  };
}

function createDelta(definition: V3MetricDefinition, value: number) {
  if (definition.target === undefined || !definition.formatDelta) return null;
  const rawDifference = value - definition.target;
  const formatted = definition.formatDelta(rawDifference);
  const isOnTarget = Number(formatted.replace(/[^0-9.]/g, "")) === 0;
  if (isOnTarget) {
    const targetFormatted = definition.formatValue(definition.target);
    return { value: "on target", direction: "up" as const, tone: "neutral" as const, tooltip: `Matching target of ${targetFormatted}` };
  }
  const metTarget = definition.lowerIsBetter ? value <= definition.target : value >= definition.target;
  const targetFormatted = definition.formatValue(definition.target);
  const tooltip = metTarget
    ? `${formatted} above target of ${targetFormatted}`
    : `${formatted} below target of ${targetFormatted}`;
  return {
    value: formatted,
    direction: metTarget ? "up" : "down",
    tone: metTarget ? "positive" : "negative",
    tooltip,
  } as const;
}

function averageSummary(days: V3SimpleSeriesDay[]) {
  if (days.length === 0) return { value: 0 };
  const total = days.reduce((sum, day) => sum + day.value, 0);
  return { value: total / days.length };
}

function day(
  date: string,
  label: string,
  value: number,
  flags?: { isFuture?: boolean; isPartial?: boolean },
): V3SimpleSeriesDay {
  return {
    date,
    label,
    value,
    ...flags,
  };
}

function shiftSeries(
  base: Record<Exclude<V3MetricId, "parcelsProcessed" | "parcelDwellTime">, V3SimpleSeriesDay[]>,
  offsets: number[],
  future = false,
) {
  const keys = Object.keys(base) as Array<Exclude<V3MetricId, "parcelsProcessed" | "parcelDwellTime">>;
  const output = {} as Record<Exclude<V3MetricId, "parcelsProcessed" | "parcelDwellTime">, V3SimpleSeriesDay[]>;

  keys.forEach((key, index) => {
    const offset = offsets[index];
    output[key] = base[key].map((entry, dayIndex) => ({
      ...entry,
      date: advanceDate(entry.date, future ? 7 : -7),
      label: shiftLabel(entry.label, future ? 7 : -7),
      value: roundValueForMetric(key, entry.value + offset + (dayIndex % 2 === 0 ? offset / 2 : -offset / 3)),
      isFuture: future || undefined,
      isPartial: undefined,
    }));
  });

  return output;
}

function roundValueForMetric(metricId: V3MetricId, value: number) {
  if (metricId === "parcelSortRate" || metricId === "palletLoadRate") return Math.max(1, Math.round(value));
  if (metricId === "parcelsMissorted" || metricId === "parcelsLost" || metricId === "palletsMissloaded") {
    return Math.max(0, Number(value.toFixed(2)));
  }
  return Math.max(0, Number(value.toFixed(1)));
}

function isPendingDay(dateIso: string, bakeDays?: number) {
  if (!bakeDays) return false;
  if (dateIso > TODAY_ISO) return false;
  const lastCalculatedIso = advanceDate(TODAY_ISO, -bakeDays);
  return dateIso > lastCalculatedIso;
}

function advanceDate(iso: string, days: number) {
  const value = new Date(`${iso}T00:00:00`);
  value.setDate(value.getDate() + days);
  return toIso(value);
}

function shiftLabel(label: string, deltaDays: number) {
  const [month, dayValue] = label.split(" ");
  return `${month} ${Number(dayValue) + deltaDays}`;
}

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayValue = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayValue}`;
}

function formatShort(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
