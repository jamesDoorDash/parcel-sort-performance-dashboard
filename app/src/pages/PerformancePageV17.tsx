import { useMemo, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { SortersTableV3 } from "../components/SortersTableV3";
import { FlowRateSection } from "../components/FlowRateSection";
import { VolumeChart } from "../components/VolumeChart";
import type { DateRangeKey, DayBucket } from "../data/mock";
import { metricConfigs, rangeIsoBounds } from "../data/mock";
import { applySorterTargetStatuses, toSorterV2 } from "../data/mockV2";
import {
  rangePayloadsV3,
  resolveCustomRangeV3,
  type V3MetricCard,
  type V3MetricId,
  type V3SimpleSeriesDay,
} from "../data/mockV3";
import { getSortersForRange } from "../data/sortersData";
import { cn } from "../lib/cn";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayCount(range: DateRangeKey, custom?: { start: Date; end: Date }) {
  if (range === "today") return 1;
  if (range === "custom" && custom)
    return Math.max(1, Math.round((custom.end.getTime() - custom.start.getTime()) / 86400000) + 1);
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
  const s = formatShortDate(start);
  const e = formatShortDate(end);
  return s === e ? s : `${s} – ${e}`;
}

function aggregateDays(data: DayBucket[], visibleDays: Set<string> | undefined, label: string): DayBucket[] {
  const visible = data.filter((d) => !visibleDays || visibleDays.has(d.date));
  if (visible.length === 0) return [];
  const allFuture = visible.every((d) => d.isFuture);
  const sum = { processed: 0, sortedLate: 0, lost: 0, readyToSort: 0, expectedVolume: 0 };
  for (const d of visible) {
    if (d.isFuture) {
      // Roll forecasted volume into readyToSort so it appears in the stacked bar
      sum.readyToSort += d.processed.expectedVolume;
    } else {
      sum.processed += d.processed.processed;
      sum.sortedLate += d.processed.sortedLate ?? 0;
      sum.lost += d.processed.lost;
      sum.readyToSort += d.processed.readyToSort;
    }
    sum.expectedVolume += d.processed.expectedVolume;
  }
  return [{
    date: visible[0].date,
    label,
    weekday: visible[0].weekday,
    isFuture: allFuture,
    processed: {
      processed: sum.processed,
      sortedLate: sum.sortedLate,
      lost: sum.lost,
      readyToSort: sum.readyToSort,
      expectedVolume: sum.expectedVolume,
    },
    values: {},
  }];
}

/* ------------------------------------------------------------------ */
/*  Section-level KPI card (non-selectable, display-only)              */
/* ------------------------------------------------------------------ */


function SectionKpiCard({ card }: { card: V3MetricCard }) {
  const isNeutral = card.delta?.tone === "neutral";
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div className="flex flex-col items-start">
      {/* Title */}
      <div
        className="relative"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
      >
        <span className="metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em] text-ink">{card.label}</span>
        {tooltipOpen && card.labelTooltip.body && (
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[280px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
            <div className="text-body-sm text-white/80">{card.labelTooltip.body}</div>
            <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
          </div>
        )}
      </div>
      {/* Value */}
      <span className={cn("mt-3 text-[24px] leading-[28px] font-bold tracking-[-0.01em]", isPlaceholder ? "text-ink-subdued" : "text-ink")}>
        {card.value}
      </span>
      {/* Delta */}
      {card.delta && (
        isNeutral ? (
          <span className="mt-1 text-[14px] leading-[20px] font-normal text-ink-subdued">At target</span>
        ) : card.delta.tone === "negative" ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-negative px-2.5 py-0.5 text-[14px] leading-[20px] font-bold text-white">
            <svg aria-hidden viewBox="0 0 8 7" className="h-2 w-2 rotate-180" fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
            {card.delta.value} below target
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1 text-[14px] leading-[20px] text-ink-subdued">
            <svg aria-hidden viewBox="0 0 8 7" className="h-2 w-2" fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
            <span className="font-medium">{card.delta.value}</span>
            <span className="font-normal">above target</span>
          </span>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section wrapper                                       */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  title,
  open,
  onToggle,
  chart,
  metrics,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  chart?: React.ReactNode;
  metrics: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="px-1 pb-2 text-body-lg-strong text-ink">{title}</h2>
      <div className="overflow-visible rounded-card border border-line-hovered bg-white shadow-card">
        <div className="relative px-6 py-5">
          {metrics}
          <button type="button" onClick={onToggle} className="absolute top-5 right-6">
            <ChevronDown className={cn("h-5 w-5 text-ink transition-transform", open && "rotate-180")} strokeWidth={2} />
          </button>
        </div>
        {open && chart && <div className="px-6 pt-4 pb-6">{chart}</div>}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pre-sort helpers (reused from V3)                                  */
/* ------------------------------------------------------------------ */

function buildPreSortSeries(
  payload: ReturnType<typeof resolveCustomRangeV3>,
) {
  return payload.flowRateWeek["parcels-presort"].map((day): V3SimpleSeriesDay => ({
    date: day.date,
    label: day.label,
    value: day.blendedAverage,
    isFuture: day.date > "2026-02-14" || undefined,
    isPartial: day.date === "2026-02-14" || undefined,
  }));
}

function averageObservedValue(days: V3SimpleSeriesDay[]) {
  const observed = days.filter((d) => !d.isFuture);
  if (observed.length === 0) return 0;
  return observed.reduce((sum, d) => sum + d.value, 0) / observed.length;
}

function buildPreSortCard(payload: ReturnType<typeof resolveCustomRangeV3>): V3MetricCard {
  const days = buildPreSortSeries(payload).filter((d) => !payload.visibleDays || payload.visibleDays.has(d.date));
  const observed = days.filter((d) => !d.isFuture);
  const avg = averageObservedValue(days);
  const target = 145;
  const delta = avg - target;

  if (observed.length === 0) {
    return { id: "parcelPreSortRate", label: "Parcel pre-sort rate", labelTooltip: { title: "Parcel pre-sort rate", body: "Blended average parcels pre-sorted per hour. Parcels over 2 lbs are weighted at 1.8x." }, value: "-- / hr", delta: null };
  }

  return {
    id: "parcelPreSortRate",
    label: "Parcel pre-sort rate",
    labelTooltip: { title: "Parcel pre-sort rate", body: "Blended average parcels pre-sorted per hour. Parcels over 2 lbs are weighted at 1.8x." },
    value: `${Math.round(avg)} / hr`,
    delta: Math.round(delta) === 0
      ? { value: "on target", direction: "up" as const, tone: "neutral" as const }
      : { value: `${Math.abs(Math.round(delta))}`, direction: avg >= target ? "up" as const : "down" as const, tone: avg >= target ? "positive" as const : "negative" as const },
  };
}

function buildSortRateCard(payload: ReturnType<typeof resolveCustomRangeV3>): V3MetricCard {
  const days = (payload.simpleSeries.parcelSortRate ?? []).filter((d) => !payload.visibleDays || payload.visibleDays.has(d.date));
  const observed = days.filter((d) => !d.isFuture);
  const target = 140;

  if (observed.length === 0) {
    return { id: "parcelSortRate", label: "Parcel sort to pallet rate", labelTooltip: { title: "Parcel sort to pallet rate", body: "Blended average parcels sorted to pallet per hour. Parcels over 2 lbs are weighted at 1.8x." }, value: "-- / hr", delta: null };
  }

  const avg = observed.reduce((s, d) => s + d.value, 0) / observed.length;
  const delta = avg - target;

  return {
    id: "parcelSortRate",
    label: "Parcel sort to pallet rate",
    labelTooltip: { title: "Parcel sort to pallet rate", body: "Blended average parcels sorted to pallet per hour. Parcels over 2 lbs are weighted at 1.8x." },
    value: `${Math.round(avg)} / hr`,
    delta: Math.round(delta) === 0
      ? { value: "on target", direction: "up" as const, tone: "neutral" as const }
      : { value: `${Math.abs(Math.round(delta))}`, direction: avg >= target ? "up" as const : "down" as const, tone: avg >= target ? "positive" as const : "negative" as const },
  };
}

function buildLoadRateCard(payload: ReturnType<typeof resolveCustomRangeV3>): V3MetricCard {
  const days = (payload.simpleSeries.palletLoadRate ?? []).filter((d) => !payload.visibleDays || payload.visibleDays.has(d.date));
  const observed = days.filter((d) => !d.isFuture);
  const target = 55;

  if (observed.length === 0) {
    return { id: "palletLoadRate", label: "Pallet load rate", labelTooltip: { title: "Pallet load rate", body: "Average pallets loaded to truck per hour across the selected period." }, value: "-- / hr", delta: null };
  }

  const avg = observed.reduce((s, d) => s + d.value, 0) / observed.length;
  const delta = avg - target;

  return {
    id: "palletLoadRate",
    label: "Pallet load rate",
    labelTooltip: { title: "Pallet load rate", body: "Average pallets loaded to truck per hour across the selected period." },
    value: `${Math.round(avg)} / hr`,
    delta: Math.round(delta) === 0
      ? { value: "on target", direction: "up" as const, tone: "neutral" as const }
      : { value: `${Math.abs(Math.round(delta))}`, direction: avg >= target ? "up" as const : "down" as const, tone: avg >= target ? "positive" as const : "negative" as const },
  };
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function PerformancePageV17() {
  const [range, setRangeRaw] = useState<DateRangeKey>("thisWeek");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date }>({
    start: new Date("2026-02-14T00:00:00"),
    end: new Date("2026-02-15T00:00:00"),
  });

  const setRange = (next: DateRangeKey) => {
    if (next === "custom" && range !== "custom") {
      const bounds = rangeIsoBounds[range];
      setCustomRange({
        start: new Date(`${bounds.start}T00:00:00`),
        end: new Date(`${bounds.end}T00:00:00`),
      });
    }
    setRangeRaw(next);
  };

  const payload = useMemo(() => {
    if (range === "custom") return resolveCustomRangeV3(customRange.start, customRange.end);
    return rangePayloadsV3[range];
  }, [customRange.end, customRange.start, range]);

  const selectedLabel = useMemo(() => {
    if (range === "custom") return formatRangeLabel(customRange.start, customRange.end);
    const bounds = rangeIsoBounds[range];
    return formatRangeLabel(new Date(`${bounds.start}T00:00:00`), new Date(`${bounds.end}T00:00:00`));
  }, [customRange.end, customRange.start, range]);

  const isFullWeek = isSingleCalendarWeek(range, customRange);
  const showChart = true;
  const useAggregated = range === "custom" && !isFullWeek;
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
    return applySorterTargetStatuses(getSortersForRange(isoStart, isoEnd).map((s) => toSorterV2(s, sorterDays)));
  }, [customRange, range, sorterDays]);

  // Build cards from payload
  const cardMap = useMemo(() => {
    const m = new Map(payload.cards.map((c) => [c.id, c]));
    return m;
  }, [payload]);

  const getCard = (id: V3MetricId) => cardMap.get(id);

  // Pre-sort / sort / load rate cards
  const preSortCard = useMemo(() => buildPreSortCard(payload), [payload]);
  const sortRateCard = useMemo(() => buildSortRateCard(payload), [payload]);
  const loadRateCard = useMemo(() => buildLoadRateCard(payload), [payload]);

  /* -- Section card groups -- */
  const dwellCard = useMemo((): V3MetricCard => {
    const dwellRaw = getCard("parcelDwellTime");
    const total = payload.processedWeek.filter((d) => !d.isFuture && (!payload.visibleDays || payload.visibleDays.has(d.date))).reduce((s, d) => s + d.processed.processed + (d.processed.sortedLate ?? 0), 0);
    const dwellCount = dwellRaw ? parseInt(dwellRaw.value) || 0 : 0;
    const rate = total > 0 ? (dwellCount / total) * 100 : 0;
    const target = 0.1;
    const delta = rate - target;
    return {
      id: "parcelDwellTime",
      label: "Parcel dwell rate",
      labelTooltip: { title: "Parcel dwell rate", body: "Percentage of parcels dwelling over 24 hours relative to total parcels sorted. Lower is better." },
      value: total > 0 ? `${rate.toFixed(2)}%` : "--",
      delta: total > 0 ? (
        Math.abs(delta) < 0.005
          ? { value: "on target", direction: "up" as const, tone: "neutral" as const }
          : { value: `${Math.abs(delta).toFixed(2)}%`, direction: rate <= target ? "up" as const : "down" as const, tone: rate <= target ? "positive" as const : "negative" as const }
      ) : null,
    };
  }, [payload, getCard]);

  const parcelCards = [
    getCard("parcelsSortedOnTime"),
    dwellCard,
    getCard("parcelsMissorted"),
    getCard("parcelsLost"),
  ].filter(Boolean) as V3MetricCard[];

  const palletCards = [
    getCard("trucksDepartedOnTime"),
    getCard("palletsScannedToTruck"),
    getCard("palletsMissloaded"),
  ].filter(Boolean) as V3MetricCard[];

  const returnsCards = [
    getCard("parcelsReturnedOnTime"),
    getCard("returnsScannedToPallet"),
    getCard("returnPalletScannedToTruck"),
  ].filter(Boolean) as V3MetricCard[];

  const flowRateCards = [preSortCard, sortRateCard, loadRateCard];

  // Accordion: only one section open at a time (null = all collapsed)
  const [openSection, setOpenSection] = useState<string | null>("parcels");
  const toggleSection = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <div className="flex h-full flex-col overflow-y-scroll">
      <div className="mx-auto w-full max-w-[1220px] px-12 pt-12 pb-16">
        <div className="flex items-start justify-between">
          <h1 className="text-display-lg text-ink">Performance</h1>
          <div className="flex flex-col items-end gap-0.5 pt-1">
            <span className="text-body-sm text-ink-subdued">Last updated &lt; 1 mins ago</span>
            <button type="button" className="inline-flex items-center gap-1.5 text-body-sm text-ink-subdued underline hover:text-ink">
              <RefreshCw className="h-3 w-3" strokeWidth={2} />
              Tap to Refresh
            </button>
          </div>
        </div>

        <div className="mt-6">
          <DateRangeTabs
            value={range}
            onChange={setRange}
            selectedLabel={selectedLabel}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            hidePickerRangeLabel
            simpleCustomPill
          />
        </div>

        <div className="mt-8 space-y-8">
        {/* ---- Parcels ---- */}
        <CollapsibleSection
          title="Parcels sorted"
          open={openSection === "parcels"}
          onToggle={() => toggleSection("parcels")}
          chart={showChart ? (
            <VolumeChart
              data={useAggregated ? aggregateDays(payload.processedWeek, payload.visibleDays, selectedLabel) : payload.processedWeek}
              metric={metricConfigs.processed}
              visibleDays={useAggregated ? undefined : payload.visibleDays}
              seriesLabels={{ processed: "Sorted on time", sortedLate: "Sorted late", lost: "Lost", readyToSort: "Ready to sort", forecasted: "Forecasted" }}
            />
          ) : undefined}
          metrics={
            <div className="grid grid-cols-4 gap-6">
              {parcelCards.map((c) => <SectionKpiCard key={c.id} card={c} />)}
            </div>
          }
        />

        {/* ---- Pallets ---- */}
        <CollapsibleSection
          title="Pallets outbounded"
          open={openSection === "pallets"}
          onToggle={() => toggleSection("pallets")}
          chart={showChart ? (
            <VolumeChart
              data={useAggregated ? aggregateDays(payload.palletVolumeWeek, payload.visibleDays, selectedLabel) : payload.palletVolumeWeek}
              metric={metricConfigs.processed}
              visibleDays={useAggregated ? undefined : payload.visibleDays}
              seriesLabels={{ processed: "Outbounded on time", sortedLate: "Outbounded late", lost: "Missloaded", readyToSort: "Ready to outbound", forecasted: "Forecasted" }}
            />
          ) : undefined}
          metrics={
            <div className="grid grid-cols-4 gap-6">
              {palletCards.map((c) => <SectionKpiCard key={c.id} card={c} />)}
            </div>
          }
        />

        {/* ---- Returns ---- */}
        <CollapsibleSection
          title="Return parcels processed"
          open={openSection === "returns"}
          onToggle={() => toggleSection("returns")}
          chart={showChart ? (
            <VolumeChart
              data={useAggregated ? aggregateDays(payload.returnVolumeWeek, payload.visibleDays, selectedLabel) : payload.returnVolumeWeek}
              metric={metricConfigs.processed}
              visibleDays={useAggregated ? undefined : payload.visibleDays}
              seriesLabels={{ processed: "Returned on time", sortedLate: "Returned late", lost: "Lost", readyToSort: "Ready to return", forecasted: "Forecasted" }}
            />
          ) : undefined}
          metrics={
            <div className="grid grid-cols-4 gap-6">
              {returnsCards.map((c) => <SectionKpiCard key={c.id} card={c} />)}
            </div>
          }
        />

        {/* ---- Flow rates ---- */}
        <CollapsibleSection
          title="Flow rates"
          open={openSection === "flowRates"}
          onToggle={() => toggleSection("flowRates")}
          chart={showChart ? (
            <FlowRateSection flowRateWeek={payload.flowRateWeek} visibleDays={payload.visibleDays} />
          ) : undefined}
          metrics={
            <div className="grid grid-cols-4 gap-6">
              {flowRateCards.map((c) => <SectionKpiCard key={c.id} card={c} />)}
            </div>
          }
        />
        </div>

        {/* ---- Sorters table ---- */}
        <section className="mt-8">
          <SortersTableV3 sorters={sorters} hideStatusIcons showFilters />
        </section>
      </div>
    </div>
  );
}
