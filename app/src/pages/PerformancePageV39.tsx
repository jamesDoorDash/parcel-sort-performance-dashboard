import { useMemo, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { SortersTableV3 } from "../components/SortersTableV3";
import { AssociatesInsightsV3 } from "../components/AssociatesInsightsV3";
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
        "flex items-stretch justify-between rounded-[12px] border border-line-hovered bg-white px-5 py-4 text-left transition-all",
        expanded
          ? "ring-[2.5px] ring-inset ring-ink shadow-card"
          : "hover:shadow-card",
      )}
    >
      <div className="flex min-w-0 flex-col items-start">
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
        ) : card.delta.tone === "negative" ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-[13px] leading-[18px] font-bold text-negative">
            <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
            {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1 text-[13px] leading-[18px] text-ink-subdued">
            <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
            <span className="font-medium">{card.delta.value}</span>
            <span className="font-normal">{card.delta.direction === "up" ? "above" : "below"} target</span>
          </span>
        )
      )}
      </div>
      <div className="flex shrink-0 items-center pl-3">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={cn("text-ink", expanded && "rotate-180")}
        >
          <path
            transform="translate(4.5, 7.75)"
            d="M13.2929 0.292893C13.6834 -0.0975788 14.3164 -0.0975034 14.707 0.292893C15.0975 0.683425 15.0975 1.31644 14.707 1.70696L8.20696 8.20696C7.81643 8.59747 7.18341 8.59748 6.79289 8.20696L0.292893 1.70696C-0.0976311 1.31643 -0.0976311 0.683418 0.292893 0.292893C0.683418 -0.0976311 1.31643 -0.0976311 1.70696 0.292893L7.49992 6.08586L13.2929 0.292893Z"
            fill="currentColor"
          />
        </svg>
      </div>
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
        <span className="metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em] text-ink-subdued">{card.label}</span>
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
          ) : card.delta.tone === "negative" ? (
            <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
              <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
              {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[14px] leading-[20px] text-ink-subdued">
              <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
              <span className="font-medium">{card.delta.value}</span>
              <span className="font-normal">{card.delta.direction === "up" ? "above" : "below"} target</span>
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

export function PerformancePageV39() {
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
    const base = applySorterTargetStatuses(getSortersForRange(isoStart, isoEnd).map((s) => toSorterV2(s, sorterDays)));
    // Demo: today's roster all meet target so the day lands on an A grade
    if (range === "today") return base.map((s) => ({ ...s, meetsTargets: true, belowTargetMetric: null }));
    return base;
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

  // Promote tooltip title to card label (Wintha's feedback: use industry terms as labels)
  const promoteTitle = (card: V3MetricCard | undefined): V3MetricCard | undefined => {
    if (!card) return card;
    const { title, body } = card.labelTooltip;
    if (!title || title === card.label) return { ...card, labelTooltip: { title: "", body } };
    return { ...card, label: title, labelTooltip: { title: "", body } };
  };

  // Hero cards for row 1
  const parcelsHero = promoteTitle(getCard("parcelsSortedOnTime"));
  const trucksHero = promoteTitle(getCard("trucksDepartedOnTime"));
  const returnsHero = (() => {
    const c = getCard("parcelsReturnedOnTime");
    return c ? { ...c, label: "On time returns to merchant" } : c;
  })();
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
        ? { value: "on target", direction: "up" as const, tone: "neutral" as const }
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

  // Facility grade — count of top-level metrics that hit target
  // (placeholder logic; finalize with team)
  const facilityGrade = useMemo(() => {
    const cardHit = (id: V3MetricId) => {
      const c = getCard(id);
      return !!c?.delta && c.delta.tone !== "negative";
    };

    let hits = 0;
    if (cardHit("parcelsSortedOnTime")) hits += 1;
    if (cardHit("trucksDepartedOnTime")) hits += 1;
    if (cardHit("parcelsReturnedOnTime")) hits += 1;

    const total = sorters.length;
    const meeting = sorters.filter((s) => s.meetsTargets).length;
    if (total > 0 && meeting === total) hits += 1;

    const grades = [
      { letter: "F", color: "#b71000", bg: "#fff0ed", border: "#b71000" }, // 0
      { letter: "D", color: "#b71000", bg: "#fff0ed", border: "#b71000" }, // 1
      { letter: "C", color: "#b71000", bg: "#fff0ed", border: "#b71000" }, // 2
      { letter: "B", color: "#a36500", bg: "#fff6d4", border: "#a36500" }, // 3
      { letter: "A", color: "#00832d", bg: "#e7fbef", border: "#00832d" }, // 4
    ];
    return { ...grades[hits], hits };
  }, [payload, sorters]);

  // Row-level accordion: only one expanded per row (null = all collapsed)
  const [gradeTooltipOpen, setGradeTooltipOpen] = useState(false);
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
          <div className="relative pb-4">
            <h2 className="text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Top level metrics</h2>
            <span className="absolute right-0 bottom-[16px] inline-flex items-baseline gap-[10px]">
              <span
                className="relative"
                onMouseEnter={() => setGradeTooltipOpen(true)}
                onMouseLeave={() => setGradeTooltipOpen(false)}
              >
                <span className="metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em] text-ink-subdued">Overall grade</span>
                {gradeTooltipOpen && (
                  <div className="pointer-events-none absolute top-full right-0 z-20 mt-2 w-[300px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
                    <div className="text-body-sm-strong text-white">Overall facility grade</div>
                    <div className="mt-1 text-body-sm text-white/80">
                      Based on how many of the 4 top-level metrics are at or above target for the selected period.
                    </div>
                    <div className="mt-2 space-y-0.5 text-body-sm text-white/80">
                      <div><span className="font-bold text-white">A</span> · 4 of 4 at target</div>
                      <div><span className="font-bold text-white">B</span> · 3 at target</div>
                      <div><span className="font-bold text-white">C</span> · 2 at target</div>
                      <div><span className="font-bold text-white">D</span> · 1 at target</div>
                      <div><span className="font-bold text-white">F</span> · 0 at target</div>
                    </div>
                    <div className="absolute bottom-full right-4 h-0 w-0 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
                  </div>
                )}
              </span>
              <span
                className="inline-flex items-center justify-center rounded-[4px] border-2 px-[12px] text-[54px] leading-[1] font-bold tracking-[-0.01em]"
                style={{ backgroundColor: facilityGrade.bg, borderColor: facilityGrade.border, color: facilityGrade.color, paddingTop: 4, paddingBottom: 4 }}
              >{facilityGrade.letter}</span>
            </span>
          </div>
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
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Parcel sort status</h3>
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
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Pallet outbound status</h3>
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
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Parcel return status</h3>
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
            <div className="overflow-hidden rounded-[12px] border border-line-hovered bg-white pt-4">
              <AssociatesInsightsV3 sorters={sorters} />
              <SortersTableV3 sorters={sorters} hideStatusIcons defaultSortKey="meetsTargets" defaultSortDir="desc" showFilters hideRateSelectors hideHeader noBorderTable searchPadding showDownload />
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
                aggregatedLabel={useAggregated ? selectedLabel : undefined}
              />
            </div>
          )}
        </section>

        {/* Sorters table removed — only shown inside Associates detail panel */}
      </div>
    </div>
  );
}
