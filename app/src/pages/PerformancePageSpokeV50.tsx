import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info, RefreshCw } from "lucide-react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { SortersTableV3 } from "../components/SortersTableV3";
import { FlowRateSection } from "../components/FlowRateSection";
import { AssociatesInsightsSpoke } from "../components/AssociatesInsightsSpoke";
import { VolumeChart } from "../components/VolumeChart";
import type { DateRangeKey, DayBucket } from "../data/mock";
import { metricConfigs, rangeIsoBounds } from "../data/mock";
import type { FlowRateDayBucket, FlowRateWeekData } from "../data/mockV2";
import { applySorterTargetStatuses, toSorterV2 } from "../data/mockV2";
import {
  rangePayloadsV3,
  resolveCustomRangeV3,
  type V3MetricCard,
  type V3MetricId,
} from "../data/mockV3";
import { getSortersForRange } from "../data/sortersData";
import { cn } from "../lib/cn";

/* ------------------------------------------------------------------ */
/*  Spoke V35 — terminology-customized copy of hub V35.                */
/*  Tooltips and underlying data still match hub for now; will diverge */
/*  in subsequent edits.                                               */
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
/*  Hero card                                                          */
/* ------------------------------------------------------------------ */

function HeroCard({ card, expanded, dimmed, onToggle }: { card: V3MetricCard; expanded: boolean; dimmed?: boolean; onToggle: () => void }) {
  const isNeutral = card.delta?.tone === "neutral";
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex flex-col items-stretch text-left border-line-hovered",
        dimmed
          ? "bg-[#F6F7F8] border-t border-b-2 border-r first:border-l pt-[17px] pb-[15px] first:pl-[21px] [&:not(:first-child)]:pl-5 pr-[21px]"
          : "bg-white border-t-2 border-r-2 first:border-l-2",
        !dimmed && !expanded && "border-b-2 first:rounded-bl-[12px] last:rounded-br-[12px] py-4 px-5",
        !dimmed && expanded && "border-l-2 first:ml-0 [&:not(:first-child)]:-ml-px pt-4 pb-[17px] first:px-5 [&:not(:first-child)]:pl-[19px] [&:not(:first-child)]:pr-[19px]",
        "first:rounded-tl-[12px] last:rounded-tr-[12px]",
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
        <div className="mt-1 flex h-[26px] items-center">
          {card.delta && (
            isNeutral ? (
              <span className="text-[13px] leading-[18px] font-normal text-ink-subdued">At target</span>
            ) : card.delta.tone === "negative" ? (
              <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-[13px] leading-[18px] font-bold text-negative">
                <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
                {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[13px] leading-[18px] text-ink-subdued">
                <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
                <span className="font-medium">{card.delta.value}</span>
                <span className="font-normal">{card.delta.direction === "up" ? "above" : "below"} target</span>
              </span>
            )
          )}
        </div>
      </div>
      <div className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-button border border-line-hovered bg-white text-body-sm-strong text-ink">
        {expanded ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
        {expanded ? "View less" : "View more"}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section KPI card                                                   */
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
/*  Runner dwell — synthetic FlowRateWeekData (single line chart)     */
/* ------------------------------------------------------------------ */

const RUNNER_DWELL_VALUES: { date: string; label: string; value: number }[] = [
  { date: "2026-02-09", label: "Feb 9", value: 21 },
  { date: "2026-02-10", label: "Feb 10", value: 19 },
  { date: "2026-02-11", label: "Feb 11", value: 22 },
  { date: "2026-02-12", label: "Feb 12", value: 18 },
  { date: "2026-02-13", label: "Feb 13", value: 20 },
  { date: "2026-02-14", label: "Feb 14", value: 20 },
  { date: "2026-02-15", label: "Feb 15", value: 0 },
];

function buildRunnerDwellWeek(): FlowRateWeekData {
  const series: FlowRateDayBucket[] = RUNNER_DWELL_VALUES.map((d) => ({
    date: d.date,
    label: d.label,
    blendedAverage: d.value,
    smallOnly: 0,
    largeOnly: 0,
  }));
  return {
    "parcels-presort": series,
    "parcels-sort": series,
    "parcels-average": series,
    "parcels-max": series,
    "pallets-average": series,
    "pallets-max": series,
  };
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function PerformancePageSpokeV50() {
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
    if (range === "today") return base.map((s) => ({ ...s, meetsTargets: true, belowTargetMetric: null }));
    return base;
  }, [customRange, range, sorterDays]);

  const cardMap = useMemo(() => {
    const m = new Map(payload.cards.map((c) => [c.id, c]));
    return m;
  }, [payload]);

  const getCard = (id: V3MetricId) => cardMap.get(id);


  // Spoke labels + tooltips for top-level metrics.
  const relabel = (card: V3MetricCard | undefined, label: string, body?: string): V3MetricCard | undefined => {
    if (!card) return card;
    return { ...card, label, labelTooltip: { title: "", body: body ?? card.labelTooltip.body } };
  };

  const parcelsHero = relabel(
    getCard("parcelsSortedOnTime"),
    "QA by 9am",
    "% of bins that are fully sorted for runner pickup by 9am",
  );
  // V46 override: On time returns to merchant — target 100%, custom tooltip
  const returnsHero = (() => {
    const c = getCard("parcelsReturnedOnTime");
    if (!c) return c;
    const value = parseFloat(c.value);
    const target = 100;
    let delta: V3MetricCard["delta"];
    if (isNaN(value)) {
      delta = c.delta;
    } else {
      const diff = value - target;
      const rounded = Math.abs(Math.round(diff * 10) / 10);
      if (rounded === 0) {
        delta = { value: "on target", direction: "up" as const, tone: "neutral" as const };
      } else if (value >= target) {
        delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "up" as const, tone: "positive" as const };
      } else {
        delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "down" as const, tone: "negative" as const };
      }
    }
    return {
      ...c,
      label: "On time returns",
      labelTooltip: { title: "", body: "% of return parcels loaded onto the soonest scheduled return truck after being scanned as return" },
      delta,
    };
  })();
  const associatesHero: V3MetricCard = useMemo(() => {
    const total = sorters.length;
    const meeting = sorters.filter((s) => s.meetsTargets).length;
    const notMeeting = total - meeting;
    return {
      id: "associatesMeetingTargets",
      label: "Associates meeting targets",
      labelTooltip: { title: "", body: "Number of associates meeting all individual performance targets" },
      value: `${meeting} / ${total}`,
      delta: notMeeting === 0
        ? { value: "on target", direction: "up" as const, tone: "neutral" as const }
        : { value: `${notMeeting}`, direction: "down" as const, tone: "negative" as const },
    };
  }, [sorters]);

  // Secondary cards — only kept for "Bins ready by 9 a.m." (parcels) and returns.
  // "On-time delivery" expanded panel has no related metrics in spoke.
  const parcelSecondary = [
    getCard("parcelDwellTime"),
    getCard("parcelsMissorted"),
    getCard("parcelsLost"),
  ].filter(Boolean) as V3MetricCard[];

  const returnsSecondary = [
    getCard("returnsScannedToPallet"),
    getCard("returnPalletScannedToTruck"),
  ].filter(Boolean) as V3MetricCard[];

  // Dwell chart data for dual-bar parcels chart (Sort status secondary bars + Runner returned)
  const dwellChartData: DayBucket[] = useMemo(() => {
    const DWELL_COUNTS = range === "lastWeek"
      ? [3, 5, 8, 12, 4, 6, 9]
      : [1, 2, 3, 1, 2, 1, 2];
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
  }, [payload.processedWeek, range]);

  // Facility grade — count of top-level metrics that hit target
  const facilityGrade = useMemo(() => {
    const cardHit = (id: V3MetricId) => {
      const c = getCard(id);
      return !!c?.delta && c.delta.tone !== "negative";
    };

    let hits = 0;
    if (cardHit("parcelsSortedOnTime")) hits += 1;
    if (returnsHero?.delta && returnsHero.delta.tone !== "negative") hits += 1;

    const total = sorters.length;
    const meeting = sorters.filter((s) => s.meetsTargets).length;
    if (total > 0 && meeting === total) hits += 1;

    const grades = [
      { letter: "F", color: "#b71000", bg: "#fff0ed", border: "#b71000" },
      { letter: "D", color: "#b71000", bg: "#fff0ed", border: "#b71000" },
      { letter: "C", color: "#b71000", bg: "#fff0ed", border: "#b71000" },
      { letter: "A", color: "#00832d", bg: "#e7fbef", border: "#00832d" },
    ];
    return { ...grades[hits], hits };
  }, [payload, sorters, returnsHero]);

  const [gradeTooltipOpen, setGradeTooltipOpen] = useState(false);
  const [row1Expanded, setRow1Expanded] = useState<string | null>("parcels");
  const [sortStage, setSortStage] = useState<"presort" | "sort" | "runner">("presort");

  const toggleRow1 = (id: string) => setRow1Expanded((prev) => (prev === id ? null : id));

  return (
    <div className="flex h-full flex-col overflow-y-scroll bg-white">
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
            hideToday
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
                    <div className="text-body-sm text-white/80">
                      Determined by the number of top-level metrics at or above target:
                    </div>
                    <div className="mt-2 space-y-0.5 text-body-sm text-white/80">
                      <div><span className="font-bold text-white">A</span> · 3</div>
                      <div><span className="font-bold text-white">C</span> · 2</div>
                      <div><span className="font-bold text-white">D</span> · 1</div>
                      <div><span className="font-bold text-white">F</span> · 0</div>
                    </div>
                    <div className="absolute bottom-full right-4 h-0 w-0 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
                  </div>
                )}
              </span>
              <span
                className="inline-flex items-center justify-center rounded-[4px] border-2 px-[12px] text-[48px] leading-[1] font-bold tracking-[-0.01em]"
                style={{ backgroundColor: facilityGrade.bg, borderColor: facilityGrade.border, color: facilityGrade.color, paddingTop: 4, paddingBottom: 4 }}
              >{facilityGrade.letter}</span>
            </span>
          </div>
          <div>
            <div className="grid grid-cols-3">
              {parcelsHero && <HeroCard card={parcelsHero} expanded={row1Expanded === "parcels"} dimmed={!!row1Expanded && row1Expanded !== "parcels"} onToggle={() => toggleRow1("parcels")} />}
              {returnsHero && <HeroCard card={returnsHero} expanded={row1Expanded === "returns"} dimmed={!!row1Expanded && row1Expanded !== "returns"} onToggle={() => toggleRow1("returns")} />}
              <HeroCard card={associatesHero} expanded={row1Expanded === "associates"} dimmed={!!row1Expanded && row1Expanded !== "associates"} onToggle={() => toggleRow1("associates")} />
            </div>

          {/* Bins ready by 9 a.m. — related metrics + Sort status chart */}
          {row1Expanded === "parcels" && (
            <div className="border-l-2 border-r-2 border-b-2 border-line-hovered rounded-bl-[12px] rounded-br-[12px] px-5 py-5 [&>*+*]:pt-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {parcelSecondary.map((c) => (
                    <div key={c.id} className="rounded-[8px] border border-line-hovered bg-white px-4 py-3">
                      <SectionKpiCard card={c} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Parcel sort status</h3>
                <VolumeChart
                  data={useAggregated ? aggregateDays(payload.processedWeek, payload.visibleDays, selectedLabel) : payload.processedWeek}
                  metric={metricConfigs.processed}
                  visibleDays={useAggregated ? undefined : payload.visibleDays}
                  seriesLabels={{ processed: "Sorted before 9am", sortedLate: "Sorted after 9am", lost: "Lost", readyToSort: "Scheduled", forecasted: "Forecasted" }}
                  colorOverrides={{ lost: "#7c3aed" }}
                  secondaryBars={{ values: dwellChartData.map((d) => d.processed.lost), color: "#df3480", label: "Dwelled parcels" }}
                />
              </div>
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Flow rate</h3>
                <div className="mb-4 inline-flex items-center rounded-button border border-line-hovered bg-white">
                  {[
                    { key: "presort" as const, label: "Pre-sort" },
                    { key: "sort" as const, label: "Sort to bin" },
                    { key: "runner" as const, label: "Runner dwell" },
                  ].map((tab) => {
                    const active = sortStage === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSortStage(tab.key)}
                        className={cn(
                          "relative -my-px h-10 rounded-button px-6 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
                          active ? "z-10 bg-white text-ink ring-2 ring-inset ring-ink" : "text-ink-subdued hover:text-ink",
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                {sortStage === "presort" && (
                  <FlowRateSection
                    flowRateWeek={payload.flowRateWeek}
                    visibleDays={payload.visibleDays}
                    hideTabs
                    defaultCombo="parcels-presort"
                    defaultItemType="parcels"
                    aggregatedLabel={useAggregated ? selectedLabel : undefined}
                  />
                )}
                {sortStage === "sort" && (
                  <FlowRateSection
                    flowRateWeek={payload.flowRateWeek}
                    visibleDays={payload.visibleDays}
                    hideTabs
                    defaultCombo="parcels-sort"
                    defaultItemType="parcels"
                    aggregatedLabel={useAggregated ? selectedLabel : undefined}
                  />
                )}
                {sortStage === "runner" && (
                  <FlowRateSection
                    flowRateWeek={buildRunnerDwellWeek()}
                    visibleDays={payload.visibleDays}
                    hideTabs
                    defaultCombo="parcels-presort"
                    defaultItemType="parcels"
                    aggregatedLabel={useAggregated ? selectedLabel : undefined}
                    singleSeriesMode={{
                      label: "Avg. runner dwell",
                      infoTooltip: "Average time a runner spends at the facility, from arrival to departure",
                      valueSuffix: " min",
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* On time returns to merchant — unchanged from hub */}
          {row1Expanded === "returns" && (
            <div className="border-l-2 border-r-2 border-b-2 border-line-hovered rounded-bl-[12px] rounded-br-[12px] px-5 py-5 [&>*+*]:pt-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {returnsSecondary.map((c) => (
                    <div key={c.id} className="rounded-[8px] border border-line-hovered bg-white px-4 py-3">
                      <SectionKpiCard card={c} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Return parcel scans</h3>
                <VolumeChart
                  data={useAggregated ? aggregateDays(payload.returnVolumeWeek, payload.visibleDays, selectedLabel) : payload.returnVolumeWeek}
                  metric={metricConfigs.processed}
                  visibleDays={useAggregated ? undefined : payload.visibleDays}
                  seriesLabels={{ processed: "Scanned to truck on time", sortedLate: "Scanned to truck late", lost: "Lost", readyToSort: "Pending return", forecasted: "Forecasted" }}
                  colorOverrides={{ lost: "#7c3aed" }}
                  hideLost
                />
              </div>
            </div>
          )}

          {row1Expanded === "associates" && (
            <div className="border-l-2 border-r-2 border-b-2 border-line-hovered rounded-bl-[12px] rounded-br-[12px] overflow-hidden pt-5">
              <AssociatesInsightsSpoke sorters={sorters} />
              <SortersTableV3
                sorters={sorters}
                hideStatusIcons
                defaultSortKey="meetsTargets"
                defaultSortDir="desc"
                showFilters
                hideRateSelectors
                hideHeader
                noBorderTable
                searchPadding
                showDownload
                loadRateLabel="Dispatch rate"
                hideLoadColumns
                palletsLoadedLabel="Bins dispatched"
                columnTooltips={{
                  preSortRate: { body: "Average hourly rate at which parcels were actively pre-sorted in pre-sort mode", target: "160 / hr" },
                  sortRate: { body: "Average hourly rate at which parcels were actively scanned to bins", target: "160 / hr" },
                  parcelsSorted: { body: "Total parcels this associate sorted in the selected period" },
                  missorted: { body: "Parcels this associate last scanned in the selected period that were next scanned at the wrong location", target: "0" },
                  lost: { body: "Parcels this associate last scanned in the selected period that were lost and not scanned again for 10 days", target: "0" },
                  loadRate: { body: "Average hourly rate at which bins were actively dispatched to runners", target: "20 / hr" },
                  palletsLoaded: { body: "Total bins this associate dispatched in the selected period" },
                  idleTime: { body: "Cumulative idle time — any 10+ minute gap between scans. All other time-based metrics pause while idle." },
                  targetStatus: { body: "Whether this associate is meeting all individual performance targets" },
                }}
              />
            </div>
          )}
          </div>
        </section>

      </div>
    </div>
  );
}
