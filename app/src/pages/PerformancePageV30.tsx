import { useMemo, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
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
/*  Hero card (primary metric with show more/less)                     */
/* ------------------------------------------------------------------ */

function HeroCard({ card, expanded, onToggle }: { card: V3MetricCard; expanded: boolean; onToggle: () => void }) {
  const isNeutral = card.delta?.tone === "neutral";
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex flex-col items-start rounded-[12px] border border-line-hovered bg-white px-5 py-4 text-left transition-all",
        expanded
          ? "ring-[2.5px] ring-inset ring-ink shadow-card"
          : "hover:shadow-card",
      )}
    >
      <div
        className="relative"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
      >
        <span className="metric-label-underline text-[13px] leading-[18px] font-medium tracking-[-0.01em] text-ink-subdued">{card.label}</span>
        {tooltipOpen && card.labelTooltip.body && (
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[280px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
            {card.labelTooltip.title && card.labelTooltip.title !== card.label && (
              <div className="mb-1 text-body-sm-strong text-white">{card.labelTooltip.title}</div>
            )}
            <div className="text-body-sm text-white/80">{card.labelTooltip.body}</div>
            <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
          </div>
        )}
      </div>
      <span className={cn("mt-2 text-[24px] leading-[28px] font-bold tracking-[-0.01em]", isPlaceholder ? "text-ink-subdued" : "text-ink")}>
        {card.value}
      </span>
      {card.delta && (
        isNeutral ? (
          <span className="mt-1 text-[13px] leading-[18px] font-normal text-ink-subdued">At target</span>
        ) : (
          <span className={cn("mt-1 flex items-center gap-1 text-[13px] leading-[18px]", card.delta.tone === "negative" ? "font-bold text-negative" : "font-normal text-ink-subdued")}>
            <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
            {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
          </span>
        )
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section KPI card (for secondary metrics inside detail panels)      */
/* ------------------------------------------------------------------ */

function SectionKpiCard({ card }: { card: V3MetricCard }) {
  const isNeutral = card.delta?.tone === "neutral";
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [bakeTooltipOpen, setBakeTooltipOpen] = useState(false);

  return (
    <div className="flex flex-col items-start">
      <div
        className="relative"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
      >
        <span className="metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em] text-ink">{card.label}</span>
        {tooltipOpen && card.labelTooltip.body && (
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[280px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
            {card.labelTooltip.title && card.labelTooltip.title !== card.label && (
              <div className="mb-1 text-body-sm-strong text-white">{card.labelTooltip.title}</div>
            )}
            <div className="text-body-sm text-white/80">{card.labelTooltip.body}</div>
            <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        {card.bakeNote && (
          <div
            className="relative self-center"
            onMouseEnter={() => setBakeTooltipOpen(true)}
            onMouseLeave={() => setBakeTooltipOpen(false)}
          >
            <Info className="h-4 w-4 text-ink" strokeWidth={1.75} />
            {bakeTooltipOpen && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[280px] -translate-x-1/2 whitespace-normal rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
                <div className="text-body-sm-strong text-white">{card.bakeNote.title}</div>
                <div className="mt-1 text-body-sm text-white/80">{card.bakeNote.body}</div>
                <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
              </div>
            )}
          </div>
        )}
        <span className={cn("text-[24px] leading-[28px] font-bold tracking-[-0.01em]", isPlaceholder ? "text-ink-subdued" : "text-ink")}>
          {card.value}
        </span>
        {card.delta && (
          isNeutral ? (
            <span className="text-[14px] leading-[20px] font-normal text-ink-subdued">At target</span>
          ) : (
            <span className={cn("flex items-center gap-1 text-[14px] leading-[20px]", card.delta.tone === "negative" ? "font-bold text-negative" : "font-normal text-ink-subdued")}>
              <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
              {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
            </span>
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Caret pointer between card and detail panel                        */
/* ------------------------------------------------------------------ */

function Caret({ index, columns }: { index: number; columns: number }) {
  const leftPercent = ((index + 0.5) / columns) * 100;
  return (
    <div className="relative h-4 -mb-[1px] z-10" style={{ pointerEvents: "none" }}>
      <svg
        className="absolute -translate-x-1/2 bottom-0"
        style={{ left: `${leftPercent}%` }}
        width="32"
        height="12"
        viewBox="0 0 32 12"
        fill="none"
      >
        {/* Upward-pointing triangle: border stroke + white fill to blend with panel */}
        <path d="M16 0L0 12H32L16 0Z" fill="#d3d6d9" />
        <path d="M16 1.5L1.5 12H30.5L16 1.5Z" fill="white" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pre-sort helpers                                                   */
/* ------------------------------------------------------------------ */

function buildPreSortSeries(payload: ReturnType<typeof resolveCustomRangeV3>) {
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

export function PerformancePageV30() {
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

  // Hero cards for row 1
  const parcelsHero = getCard("parcelsSortedOnTime");
  const trucksHero = getCard("trucksDepartedOnTime");
  const returnsHero = getCard("parcelsReturnedOnTime");
  const associatesHero: V3MetricCard = useMemo(() => {
    const total = sorters.length;
    const meeting = sorters.filter((s) => s.meetsTargets).length;
    const notMeeting = total - meeting;
    return {
      id: "associatesMeetingTargets",
      label: "Associates meeting targets",
      labelTooltip: { title: "Associates meeting targets", body: "Number of associates whose average sort rate meets or exceeds their target rate for the selected period." },
      value: `${meeting} / ${total}`,
      delta: notMeeting === 0
        ? { value: "all meeting targets", direction: "up" as const, tone: "positive" as const }
        : { value: `${notMeeting}`, direction: "down" as const, tone: "negative" as const },
    };
  }, [sorters]);

  // Secondary cards for detail panels
  const parcelSecondary = [
    getCard("parcelDwellTime"),
    getCard("parcelsMissorted"),
    getCard("parcelsLost"),
  ].filter(Boolean) as V3MetricCard[];

  const palletSecondary = [
    getCard("palletsScannedToTruck"),
    getCard("palletsMissloaded"),
  ].filter(Boolean) as V3MetricCard[];

  const returnsSecondary = [
    getCard("returnsScannedToPallet"),
    getCard("returnPalletScannedToTruck"),
  ].filter(Boolean) as V3MetricCard[];

  // Dwell chart data for dual-bar parcels chart
  const dwellChartData: DayBucket[] = useMemo(() => {
    const DWELL_COUNTS = [3, 0, 8, 12, 5, 0, 7];
    return payload.processedWeek.map((day, i) => ({
      ...day,
      processed: {
        processed: 0,
        sortedLate: 0,
        lost: day.isFuture ? 0 : DWELL_COUNTS[i % DWELL_COUNTS.length],
        readyToSort: 0,
        expectedVolume: 0,
      },
      values: {},
    }));
  }, [payload.processedWeek]);

  // Row-level accordion: only one expanded per row (null = all collapsed)
  const [row1Expanded, setRow1Expanded] = useState<string | null>("parcels");
  const [row2Expanded, setRow2Expanded] = useState<string | null>("preSortRate");

  const toggleRow1 = (id: string) => setRow1Expanded((prev) => (prev === id ? null : id));
  const toggleRow2 = (id: string) => setRow2Expanded((prev) => (prev === id ? null : id));

  return (
    <div className="flex h-full flex-col overflow-y-scroll bg-[#F6F7F8]">
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

        <div className="mt-4">
          <DateRangeTabs
            value={range}
            onChange={setRange}
            selectedLabel={selectedLabel}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            hidePickerRangeLabel
            simpleCustomPill
            hideNextWeek
          />
        </div>

        {/* ============================================================ */}
        {/*  Row 1 — Top level metrics                                    */}
        {/* ============================================================ */}
        <section className="mt-8">
          <h2 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Top level metrics</h2>
          <div className="grid grid-cols-4 gap-4">
            {parcelsHero && <HeroCard card={parcelsHero} expanded={row1Expanded === "parcels"} onToggle={() => toggleRow1("parcels")} />}
            {trucksHero && <HeroCard card={trucksHero} expanded={row1Expanded === "trucks"} onToggle={() => toggleRow1("trucks")} />}
            {returnsHero && <HeroCard card={returnsHero} expanded={row1Expanded === "returns"} onToggle={() => toggleRow1("returns")} />}
            <HeroCard card={associatesHero} expanded={row1Expanded === "associates"} onToggle={() => toggleRow1("associates")} />
          </div>

          {/* Caret + expanded detail */}
          {row1Expanded && (
            <Caret index={row1Expanded === "parcels" ? 0 : row1Expanded === "trucks" ? 1 : row1Expanded === "returns" ? 2 : 3} columns={4} />
          )}
          {row1Expanded === "parcels" && (
            <div className="rounded-[12px] border border-line-hovered bg-white px-6 py-5 divide-y divide-line-hovered [&>*+*]:pt-8 [&>*:not(:last-child)]:pb-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-6">
                  {parcelSecondary.map((c) => <SectionKpiCard key={c.id} card={c} />)}
                </div>
              </div>
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Sort status</h3>
                <VolumeChart
                  data={useAggregated ? aggregateDays(payload.processedWeek, payload.visibleDays, selectedLabel) : payload.processedWeek}
                  metric={metricConfigs.processed}
                  visibleDays={useAggregated ? undefined : payload.visibleDays}
                  seriesLabels={{ processed: "Sorted on time", sortedLate: "Sorted late", lost: "Lost", readyToSort: "Scheduled", forecasted: "Forecasted" }}
                  colorOverrides={{ lost: "#7c3aed" }}
                  secondaryBars={{ values: dwellChartData.map((d) => d.processed.lost), color: "#df3480", label: "Dwelled parcels" }}
                />
              </div>
            </div>
          )}

          {row1Expanded === "trucks" && (
            <div className="rounded-[12px] border border-line-hovered bg-white px-6 py-5 divide-y divide-line-hovered [&>*+*]:pt-8 [&>*:not(:last-child)]:pb-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-6">
                  {palletSecondary.map((c) => <SectionKpiCard key={c.id} card={c} />)}
                </div>
              </div>
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Outbound status</h3>
                <VolumeChart
                  data={useAggregated ? aggregateDays(payload.palletVolumeWeek, payload.visibleDays, selectedLabel) : payload.palletVolumeWeek}
                  metric={metricConfigs.processed}
                  visibleDays={useAggregated ? undefined : payload.visibleDays}
                  seriesLabels={{ processed: "Outbounded on time", sortedLate: "Outbounded late", lost: "Missloaded", readyToSort: "Scheduled", forecasted: "Forecasted" }}
                  colorOverrides={{ lost: "#7c3aed" }}
                />
              </div>
            </div>
          )}

          {row1Expanded === "returns" && (
            <div className="rounded-[12px] border border-line-hovered bg-white px-6 py-5 divide-y divide-line-hovered [&>*+*]:pt-8 [&>*:not(:last-child)]:pb-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-6">
                  {returnsSecondary.map((c) => <SectionKpiCard key={c.id} card={c} />)}
                </div>
              </div>
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Return status</h3>
                <VolumeChart
                  data={useAggregated ? aggregateDays(payload.returnVolumeWeek, payload.visibleDays, selectedLabel) : payload.returnVolumeWeek}
                  metric={metricConfigs.processed}
                  visibleDays={useAggregated ? undefined : payload.visibleDays}
                  seriesLabels={{ processed: "Returned on time", sortedLate: "Returned late", lost: "Lost", readyToSort: "Scheduled", forecasted: "Forecasted" }}
                  colorOverrides={{ lost: "#7c3aed" }}
                />
              </div>
            </div>
          )}

          {row1Expanded === "associates" && (
            <div>
              <SortersTableV3 sorters={sorters} hideStatusIcons hideRateSelectors hideHeader />
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/*  Row 2 — Flow rates                                          */}
        {/* ============================================================ */}
        <section className="mt-10">
          <h2 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Flow rates</h2>
          <div className="grid grid-cols-3 gap-4">
            <HeroCard card={preSortCard} expanded={row2Expanded === "preSortRate"} onToggle={() => toggleRow2("preSortRate")} />
            <HeroCard card={sortRateCard} expanded={row2Expanded === "sortRate"} onToggle={() => toggleRow2("sortRate")} />
            <HeroCard card={loadRateCard} expanded={row2Expanded === "loadRate"} onToggle={() => toggleRow2("loadRate")} />
          </div>

          {row2Expanded && (
            <Caret index={row2Expanded === "preSortRate" ? 0 : row2Expanded === "sortRate" ? 1 : 2} columns={3} />
          )}
          {row2Expanded && (
            <div className="rounded-[12px] border border-line-hovered bg-white px-6 py-5">
              <FlowRateSection
                key={row2Expanded}
                flowRateWeek={payload.flowRateWeek}
                visibleDays={payload.visibleDays}
                hideTabs
                defaultCombo={row2Expanded === "preSortRate" ? "parcels-presort" : row2Expanded === "sortRate" ? "parcels-sort" : "pallets-average"}
                defaultItemType={row2Expanded === "loadRate" ? "pallets" : "parcels"}
              />
            </div>
          )}
        </section>

        {/* Sorters table removed — only shown inside Associates detail panel */}
      </div>
    </div>
  );
}
