import { useMemo, useState } from "react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { SortersTableV3 } from "../components/SortersTableV3";
import { V3MetricChart } from "../components/V3MetricChart";
import { V3MetricSelectorCard } from "../components/V3MetricSelectorCard";
import { WaitingStackChart } from "../components/WaitingStackChart";
import { VolumeChart } from "../components/VolumeChart";
import type { DateRangeKey } from "../data/mock";
import { metricConfigs, rangeIsoBounds } from "../data/mock";
import { applySorterTargetStatuses, toSorterV2 } from "../data/mockV2";
import {
  getMetricDefinition,
  rangePayloadsV3,
  resolveCustomRangeV3,
  type V3MetricCard,
  type V3MetricId,
  type V3SimpleSeriesDay,
} from "../data/mockV3";
import { getSortersForRange } from "../data/sortersData";

type V4MetricId = V3MetricId | "parcelPreSortRate";
type V4View = "facility" | "individualUsers";

function getInitialView(): V4View {
  if (typeof window === "undefined") return "facility";

  const value = new URLSearchParams(window.location.search).get("view");
  return value === "individualUsers" ? "individualUsers" : "facility";
}

const PRE_SORT_RATE_TOOLTIP =
  "Average number of parcels pre-sorted to staging areas per labor hour during active sort time in the selected period. Parcels 2lb + count 1.8x in weighted rates.";

const SORT_RATE_TOOLTIP =
  "Average number of parcels sorted to pallets per labor hour during active sort time in the selected period. Parcels 2lb + count 1.8x in weighted rates.";

const V4_METRIC_ORDER: V4MetricId[] = [
  "parcelsProcessed",
  "parcelsSortedOnTime",
  "parcelsMissorted",
  "parcelsLost",
  "parcelDwellTime",
  "palletsScannedToTruck",
  "palletsMissloaded",
  "trucksDepartedOnTime",
  "parcelsReturnedOnTime",
  "parcelPreSortRate",
  "parcelSortRate",
  "palletLoadRate",
];

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayValue = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayValue}`;
}

function dayCount(range: DateRangeKey, custom?: { start: Date; end: Date }) {
  if (range === "today") return 1;
  if (range === "custom" && custom) {
    return Math.max(1, Math.round((custom.end.getTime() - custom.start.getTime()) / 86400000) + 1);
  }
  return 7;
}

function isSingleCalendarWeek(range: DateRangeKey, customRange: { start: Date; end: Date }) {
  if (range !== "custom") return true;

  const start = new Date(customRange.start);
  const end = new Date(customRange.end);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return diffDays === 7 && start.getDay() === 0 && end.getDay() === 6;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRangeLabel(start: Date, end: Date) {
  const startLabel = formatShortDate(start);
  const endLabel = formatShortDate(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function getV4MetricDefinition(id: V3MetricId) {
  const metric = getMetricDefinition(id);
  if (id === "palletLoadRate") {
    return {
      ...metric,
      label: "Load rate",
      description: {
        ...metric.description,
        title: "Load rate",
      },
    };
  }

  if (id !== "parcelSortRate") return metric;

  return {
    ...metric,
    label: "Sort rate",
    chartKind: "simple" as const,
    description: {
      ...metric.description,
      title: "Sort rate",
      body: SORT_RATE_TOOLTIP,
    },
  };
}

function toV4Card(card: V3MetricCard): V3MetricCard {
  if (card.id === "palletLoadRate") {
    return {
      ...card,
      label: "Load rate",
      labelTooltip: {
        ...card.labelTooltip,
        title: "Load rate",
      },
    };
  }

  if (card.id !== "parcelSortRate") return card;

  return {
    ...card,
    label: "Sort rate",
    labelTooltip: {
      ...card.labelTooltip,
      title: "Sort rate",
      body: SORT_RATE_TOOLTIP,
    },
  };
}

function buildPreSortSeries(payload: (typeof rangePayloadsV3)[Exclude<DateRangeKey, "custom">] | ReturnType<typeof resolveCustomRangeV3>) {
  return payload.flowRateWeek["parcels-presort"].map((day): V3SimpleSeriesDay => ({
    date: day.date,
    label: day.label,
    value: day.blendedAverage,
    isFuture: day.date > "2026-02-14" || undefined,
    isPartial: day.date === "2026-02-14" || undefined,
  }));
}

function averageObservedValue(days: V3SimpleSeriesDay[]) {
  const observedDays = days.filter((day) => !day.isFuture);
  if (observedDays.length === 0) return 0;
  return observedDays.reduce((sum, day) => sum + day.value, 0) / observedDays.length;
}

function buildPreSortCard(payload: (typeof rangePayloadsV3)[Exclude<DateRangeKey, "custom">] | ReturnType<typeof resolveCustomRangeV3>): V3MetricCard {
  const days = buildPreSortSeries(payload).filter((day) => !payload.visibleDays || payload.visibleDays.has(day.date));
  const observedDays = days.filter((day) => !day.isFuture);
  const averageValue = averageObservedValue(days);
  const target = 145;
  const delta = averageValue - target;
  const meetsTarget = averageValue >= target;

  if (observedDays.length === 0) {
    return {
      id: "parcelPreSortRate",
      label: "Pre-sort rate",
      labelTooltip: {
        title: "Pre-sort rate",
        body: PRE_SORT_RATE_TOOLTIP,
      },
      value: "-- / hr",
      delta: null,
    };
  }

  return {
    id: "parcelPreSortRate",
    label: "Pre-sort rate",
    labelTooltip: {
      title: "Pre-sort rate",
      body: PRE_SORT_RATE_TOOLTIP,
    },
    value: `${Math.round(averageValue)} / hr`,
    delta: {
      value: `${Math.abs(Math.round(delta))}`,
      direction: meetsTarget ? "up" : "down",
      tone: meetsTarget ? "positive" : "negative",
    },
  };
}

export function PerformancePageV4() {
  const [range, setRange] = useState<DateRangeKey>("thisWeek");
  const [selectedMetric, setSelectedMetric] = useState<V4MetricId>("parcelsProcessed");
  const [view, setView] = useState<V4View>(getInitialView);
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date }>({
    start: new Date("2026-02-14T00:00:00"),
    end: new Date("2026-02-15T00:00:00"),
  });

  const payload = useMemo(() => {
    if (range === "custom") return resolveCustomRangeV3(customRange.start, customRange.end);
    return rangePayloadsV3[range];
  }, [customRange.end, customRange.start, range]);

  const selectedLabel = useMemo(() => {
    if (range === "custom") {
      return formatRangeLabel(customRange.start, customRange.end);
    }

    const bounds = rangeIsoBounds[range];
    return formatRangeLabel(
      new Date(`${bounds.start}T00:00:00`),
      new Date(`${bounds.end}T00:00:00`),
    );
  }, [customRange.end, customRange.start, range]);

  const preSortSeries = useMemo(() => buildPreSortSeries(payload), [payload]);
  const cards = useMemo(() => {
    const baseCards = new Map(payload.cards.map((card) => [card.id, toV4Card(card)]));
    baseCards.delete("palletsLoadedOnTime");
    baseCards.set("parcelPreSortRate", buildPreSortCard(payload));
    return V4_METRIC_ORDER
      .map((id) => baseCards.get(id))
      .filter((card): card is V3MetricCard => Boolean(card));
  }, [payload]);
  const metric = selectedMetric === "parcelPreSortRate"
    ? {
        unit: "rate" as const,
        chartKind: "simple" as const,
        target: 145,
        targetLabel: "145 / hr",
        bakeDays: undefined,
        formatValue: (value: number) => `${Math.round(value)} / hr`,
      }
    : getV4MetricDefinition(selectedMetric);
  const showChart = isSingleCalendarWeek(range, customRange);
  const sorterDays = useMemo(() => dayCount(range, range === "custom" ? customRange : undefined), [customRange, range]);

  const sorters = useMemo(() => {
    let isoStart: string;
    let isoEnd: string;

    if (range === "custom") {
      isoStart = toIso(customRange.start);
      isoEnd = toIso(customRange.end);
    } else {
      const bounds = rangeIsoBounds[range];
      isoStart = bounds.start;
      isoEnd = bounds.end;
    }

    const sorterRows = getSortersForRange(isoStart, isoEnd).map((sorter) => toSorterV2(sorter, sorterDays));
    return applySorterTargetStatuses(sorterRows);
  }, [customRange, range, sorterDays]);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="mx-auto w-full max-w-[1220px] px-12 pt-12 pb-8">
        <h1 className="text-display-lg text-ink">Performance</h1>

        <div className="mt-6">
          <DateRangeTabs
            value={range}
            onChange={setRange}
            selectedLabel={selectedLabel}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>

      </div>

      <section className="relative mt-0.5 w-full border-b border-line">
        <div className="mx-auto w-full max-w-[1220px] px-12">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView("facility")}
              className={view === "facility" ? "relative px-0 py-2 text-body-md font-medium text-ink" : "px-0 py-2 text-body-md text-ink-subdued"}
            >
              Facility
              {view === "facility" && <span className="absolute inset-x-0 bottom-0 h-1 rounded-t-[4px] bg-ink" />}
            </button>
            <button
              type="button"
              onClick={() => setView("individualUsers")}
              className={view === "individualUsers" ? "relative px-0 py-2 text-body-md-strong text-ink" : "px-0 py-2 text-body-md text-ink-subdued"}
            >
              Individual users
              {view === "individualUsers" && <span className="absolute inset-x-0 bottom-0 h-1 rounded-t-[4px] bg-ink" />}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1220px] px-12 pb-16">

        {view === "facility" && (
          <>
            <section className="mt-8 py-2">
              <div className="grid grid-cols-4 gap-4">
                {cards.map((card) => (
                  <V3MetricSelectorCard
                    key={card.id}
                    card={card}
                    selected={card.id === selectedMetric}
                    onClick={() => setSelectedMetric(card.id as V4MetricId)}
                  />
                ))}
              </div>
            </section>

            {showChart && (
              <section className="mt-8 py-2">
                {metric.chartKind === "processed" && (
                  <VolumeChart
                    data={payload.processedWeek}
                    metric={metricConfigs.processed}
                    visibleDays={payload.visibleDays}
                  />
                )}

                {metric.chartKind === "waiting" && (
                  <WaitingStackChart
                    data={payload.waitingWeek}
                    target={metric.target}
                    targetLabel="180 hrs"
                    visibleDays={payload.visibleDays}
                  />
                )}

                {metric.chartKind === "simple" && selectedMetric !== "parcelPreSortRate" && payload.simpleSeries[selectedMetric] && (
                  <V3MetricChart
                    data={payload.simpleSeries[selectedMetric] ?? []}
                    target={metric.target}
                    targetLabel={metric.targetLabel}
                    isPercent={metric.unit === "percent"}
                    bakeDays={metric.bakeDays}
                    visibleDays={payload.visibleDays}
                    formatValue={(value) => metric.formatValue(value)}
                  />
                )}
                {metric.chartKind === "simple" && selectedMetric === "parcelPreSortRate" && (
                  <V3MetricChart
                    data={preSortSeries}
                    target={145}
                    targetLabel="145 / hr"
                    isPercent={false}
                    visibleDays={payload.visibleDays}
                    formatValue={(value) => `${Math.round(value)} / hr`}
                  />
                )}
              </section>
            )}
          </>
        )}

        {view === "individualUsers" && (
          <section className="mt-8">
            <SortersTableV3 sorters={sorters} />
          </section>
        )}
      </div>
    </div>
  );
}
