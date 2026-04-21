import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
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
  const days = data.filter((d) => !d.isFuture && (!visibleDays || visibleDays.has(d.date)));
  if (days.length === 0) return [];
  const sum = { processed: 0, sortedLate: 0, lost: 0, readyToSort: 0, expectedVolume: 0 };
  for (const d of days) {
    sum.processed += d.processed.processed;
    sum.sortedLate += d.processed.sortedLate ?? 0;
    sum.lost += d.processed.lost;
    sum.readyToSort += d.processed.readyToSort;
    sum.expectedVolume += d.processed.expectedVolume;
  }
  return [{
    date: days[0].date,
    label,
    weekday: days[0].weekday,
    isFuture: false,
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

function DeltaTriangle({ direction }: { direction: "up" | "down" }) {
  return (
    <svg aria-hidden viewBox="0 0 8 8" className={cn("h-2 w-2 shrink-0", direction === "down" && "rotate-180")} fill="currentColor">
      <path d="M4 1 7 6H1z" />
    </svg>
  );
}

function SectionKpiCard({ card }: { card: V3MetricCard }) {
  const isNeutral = card.delta?.tone === "neutral";
  const deltaTone = isNeutral ? "text-ink-subdued" : card.delta?.tone === "positive" ? "text-positive" : "text-negative";
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");
  const isOffTarget = card.delta?.tone === "negative";
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [bakeTooltipOpen, setBakeTooltipOpen] = useState(false);

  return (
    <div className="flex flex-col items-start">
      <div className={cn("inline-flex items-center gap-1 rounded-tag px-2 py-0.5 text-body-sm-strong", isOffTarget ? "bg-negative-bg text-negative" : "invisible")}>
        <AlertTriangle className="h-3 w-3" strokeWidth={2.25} />
        <span>Below target</span>
      </div>
      <div
        className="relative"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
      >
        <span className="metric-label-underline text-body-sm-strong text-ink-subdued">{card.label}</span>
        {tooltipOpen && card.labelTooltip.body && (
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[280px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
            <div className="text-body-sm text-white/80">{card.labelTooltip.body}</div>
            <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
          </div>
        )}
      </div>
      <div className="mt-[7px] flex items-baseline gap-[10px] whitespace-nowrap">
        {card.bakeNote && (
          <div
            className="relative self-center"
            onMouseEnter={() => setBakeTooltipOpen(true)}
            onMouseLeave={() => setBakeTooltipOpen(false)}
          >
            <Info className="h-3.5 w-3.5 text-ink" strokeWidth={1.75} />
            {bakeTooltipOpen && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[280px] -translate-x-1/2 whitespace-normal rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
                <div className="text-body-sm-strong text-white">{card.bakeNote.title}</div>
                <div className="mt-1 text-body-sm text-white/80">{card.bakeNote.body}</div>
                <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
              </div>
            )}
          </div>
        )}
        <span className={cn("text-[1.5rem] leading-[1.1] font-semibold tracking-[-0.02em]", isPlaceholder ? "text-ink-subdued" : "text-ink")}>
          {card.value}
        </span>
        {card.delta && (
          isNeutral ? (
            <span className="text-[0.8125rem] leading-[1.2] font-normal text-ink-subdued">on target</span>
          ) : (
            <span className={cn("flex items-baseline gap-1", deltaTone)}>
              <span className="text-[1.125rem] leading-[1.1] font-semibold"><svg aria-hidden viewBox="0 0 8 7" className={cn("mr-1 inline h-3 w-3 align-baseline translate-y-[1px]", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>{card.delta.value}</span>
              <span className="text-[0.8125rem] leading-[1.2] font-normal text-ink-subdued">vs. target</span>
            </span>
          )
        )}
      </div>
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
    <section className="overflow-visible rounded-card border border-line-hovered bg-white shadow-card">
      <div
        className="flex w-full cursor-pointer items-center justify-between px-6 pt-5 pb-2"
        onClick={onToggle}
      >
        <h2 className="text-body-lg-strong text-ink">{title}</h2>
        <ChevronDown className={cn("h-5 w-5 text-ink transition-transform", open && "rotate-180")} strokeWidth={2} />
      </div>
      <div className="px-6 pb-5 pt-0">{metrics}</div>
      {open && chart && <div className="px-6 pt-4 pb-6">{chart}</div>}
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
    return { id: "parcelPreSortRate", label: "Parcel pre-sort rate", labelTooltip: { title: "Parcel pre-sort rate", body: "Average parcels pre-sorted per hour across the selected period" }, value: "-- / hr", delta: null };
  }

  return {
    id: "parcelPreSortRate",
    label: "Parcel pre-sort rate",
    labelTooltip: { title: "Parcel pre-sort rate", body: "Average parcels pre-sorted per hour across the selected period" },
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
    return { id: "parcelSortRate", label: "Parcel sort to pallet rate", labelTooltip: { title: "Parcel sort to pallet rate", body: "Average parcels sorted to pallet per hour across the selected period" }, value: "-- / hr", delta: null };
  }

  const avg = observed.reduce((s, d) => s + d.value, 0) / observed.length;
  const delta = avg - target;

  return {
    id: "parcelSortRate",
    label: "Parcel sort to pallet rate",
    labelTooltip: { title: "Parcel sort to pallet rate", body: "Average parcels sorted to pallet per hour across the selected period" },
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
    return { id: "palletLoadRate", label: "Pallet load rate", labelTooltip: { title: "Pallet load rate", body: "Average pallets loaded to truck per hour across the selected period" }, value: "-- / hr", delta: null };
  }

  const avg = observed.reduce((s, d) => s + d.value, 0) / observed.length;
  const delta = avg - target;

  return {
    id: "palletLoadRate",
    label: "Pallet load rate",
    labelTooltip: { title: "Pallet load rate", body: "Average pallets loaded to truck per hour across the selected period" },
    value: `${Math.round(avg)} / hr`,
    delta: Math.round(delta) === 0
      ? { value: "on target", direction: "up" as const, tone: "neutral" as const }
      : { value: `${Math.abs(Math.round(delta))}`, direction: avg >= target ? "up" as const : "down" as const, tone: avg >= target ? "positive" as const : "negative" as const },
  };
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function PerformancePageV9() {
  const [range, setRange] = useState<DateRangeKey>("thisWeek");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date }>({
    start: new Date("2026-02-14T00:00:00"),
    end: new Date("2026-02-15T00:00:00"),
  });

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
  const parcelCards = [
    getCard("parcelsSortedOnTime"),
    getCard("parcelDwellTime"),
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
    <div className="flex h-full flex-col overflow-auto">
      <div className="mx-auto w-full max-w-[1220px] px-12 pt-12 pb-16">
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

        <div className="mt-8 space-y-4">
        {/* ---- Parcels ---- */}
        <CollapsibleSection
          title="Parcels"
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
          title="Pallets"
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
          title="Returns"
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
        <section className="mt-12">
          <SortersTableV3 sorters={sorters} />
        </section>
      </div>
    </div>
  );
}
