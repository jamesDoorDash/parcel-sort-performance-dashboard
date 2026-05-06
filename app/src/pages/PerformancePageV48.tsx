import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info, RefreshCw } from "lucide-react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { SortersTableV3 } from "../components/SortersTableV3";
import { AssociatesInsightsV41 } from "../components/AssociatesInsightsV41";
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
} from "../data/mockV3";
import { getSortersForRange } from "../data/sortersData";
import { cn } from "../lib/cn";

/* Helpers */
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

/* Hero card — V46 style: standalone rounded card with chevron on the right */
function HeroCard({ card, expanded, onToggle }: { card: V3MetricCard; expanded: boolean; onToggle: () => void }) {
  const isNeutral = card.delta?.tone === "neutral";
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex flex-col items-stretch rounded-[12px] border border-line-hovered bg-white px-5 py-4 text-left transition-all",
        expanded ? "ring-[2.5px] ring-inset ring-ink shadow-card" : "hover:shadow-card",
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

/* Section KPI card */
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

/* Caret pointer between card and detail panel */
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
        <path d="M16 0L0 12H32L16 0Z" fill="#d3d6d9" />
        <path d="M16 1.5L1.5 12H30.5L16 1.5Z" fill="white" />
      </svg>
    </div>
  );
}

/* Main page */
export function PerformancePageV48() {
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

  const cardMap = useMemo(() => new Map(payload.cards.map((c) => [c.id, c])), [payload]);
  const getCard = (id: V3MetricId) => cardMap.get(id);

  const parcelsHero = (() => {
    const c = getCard("parcelsSortedOnTime");
    if (!c) return c;
    const value = parseFloat(c.value);
    const target = 100;
    let delta: V3MetricCard["delta"];
    if (isNaN(value)) {
      delta = c.delta;
    } else {
      const diff = value - target;
      const rounded = Math.abs(Math.round(diff * 10) / 10);
      if (rounded === 0) delta = { value: "on target", direction: "up" as const, tone: "neutral" as const };
      else if (value >= target) delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "up" as const, tone: "positive" as const };
      else delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "down" as const, tone: "negative" as const };
    }
    return { ...c, label: "Sort SLA compliance", labelTooltip: { title: "", body: "% of parcels sorted at least 15m before the first truck CPT of the day" }, delta };
  })();
  const trucksHero = (() => {
    const c = getCard("trucksDepartedOnTime");
    if (!c) return c;
    const value = parseFloat(c.value);
    const target = 100;
    let delta: V3MetricCard["delta"];
    if (isNaN(value)) {
      delta = c.delta;
    } else {
      const diff = value - target;
      const rounded = Math.abs(Math.round(diff * 10) / 10);
      if (rounded === 0) delta = { value: "on target", direction: "up" as const, tone: "neutral" as const };
      else if (value >= target) delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "up" as const, tone: "positive" as const };
      else delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "down" as const, tone: "negative" as const };
    }
    return { ...c, label: "Controllable CPT compliance", labelTooltip: { title: "", body: "% of pallets loaded to truck by the truck's CPT — only for trucks that arrived on time or early" }, delta };
  })();
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
      if (rounded === 0) delta = { value: "on target", direction: "up" as const, tone: "neutral" as const };
      else if (value >= target) delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "up" as const, tone: "positive" as const };
      else delta = { value: `${rounded.toFixed(1).replace(/\.?0+$/, "")}%`, direction: "down" as const, tone: "negative" as const };
    }
    return { ...c, label: "On time returns", labelTooltip: { title: "", body: "% of return parcels loaded onto the soonest scheduled return truck after being scanned as return" }, delta };
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

  const parcelSecondary = [getCard("parcelDwellTime"), getCard("parcelsMissorted"), getCard("parcelsLost")].filter(Boolean) as V3MetricCard[];
  const palletSecondary = [getCard("palletsScannedToTruck"), getCard("palletsMissloaded")].filter(Boolean) as V3MetricCard[];
  const returnsSecondary = [getCard("returnsScannedToPallet"), getCard("returnPalletScannedToTruck")].filter(Boolean) as V3MetricCard[];

  const dwellChartData: DayBucket[] = useMemo(() => {
    const DWELL_COUNTS = range === "lastWeek" ? [3, 5, 8, 12, 4, 6, 9] : [1, 2, 3, 1, 2, 1, 2];
    return payload.processedWeek.map((day, i) => ({
      ...day,
      processed: { processed: 0, sortedLate: 0, lost: day.isFuture ? 0 : DWELL_COUNTS[i % DWELL_COUNTS.length], readyToSort: 0, expectedVolume: 0 },
      values: {},
    }));
  }, [payload.processedWeek, range]);

  const facilityGrade = useMemo(() => {
    let hits = 0;
    if (parcelsHero?.delta && parcelsHero.delta.tone !== "negative") hits += 1;
    if (trucksHero?.delta && trucksHero.delta.tone !== "negative") hits += 1;
    if (returnsHero?.delta && returnsHero.delta.tone !== "negative") hits += 1;
    const total = sorters.length;
    const meeting = sorters.filter((s) => s.meetsTargets).length;
    if (total > 0 && meeting === total) hits += 1;
    const grades = [
      { letter: "F", color: "#b71000", bg: "#fff0ed", border: "#b71000" },
      { letter: "D", color: "#b71000", bg: "#fff0ed", border: "#b71000" },
      { letter: "C", color: "#b71000", bg: "#fff0ed", border: "#b71000" },
      { letter: "B", color: "#a36500", bg: "#fff6d4", border: "#a36500" },
      { letter: "A", color: "#00832d", bg: "#e7fbef", border: "#00832d" },
    ];
    return { ...grades[hits], hits };
  }, [payload, sorters, parcelsHero, trucksHero, returnsHero]);

  const [gradeTooltipOpen, setGradeTooltipOpen] = useState(false);
  const [row1Expanded, setRow1Expanded] = useState<string | null>("parcels");
  const toggleRow1 = (id: string) => setRow1Expanded((prev) => (prev === id ? null : id));

  const caretIndex = row1Expanded === "parcels" ? 0 : row1Expanded === "trucks" ? 1 : row1Expanded === "returns" ? 2 : 3;

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
            hideToday
          />
        </div>

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
                    <div className="text-body-sm text-white/80">Determined by the number of top-level metrics at or above target:</div>
                    <div className="mt-2 space-y-0.5 text-body-sm text-white/80">
                      <div><span className="font-bold text-white">A</span> · 4</div>
                      <div><span className="font-bold text-white">B</span> · 3</div>
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

          <div className="grid grid-cols-4 gap-4">
            {parcelsHero && <HeroCard card={parcelsHero} expanded={row1Expanded === "parcels"} onToggle={() => toggleRow1("parcels")} />}
            {trucksHero && <HeroCard card={trucksHero} expanded={row1Expanded === "trucks"} onToggle={() => toggleRow1("trucks")} />}
            {returnsHero && <HeroCard card={returnsHero} expanded={row1Expanded === "returns"} onToggle={() => toggleRow1("returns")} />}
            <HeroCard card={associatesHero} expanded={row1Expanded === "associates"} onToggle={() => toggleRow1("associates")} />
          </div>

          {row1Expanded && <Caret index={caretIndex} columns={4} />}

          {row1Expanded === "parcels" && (
            <div className="rounded-[12px] border border-line-hovered bg-white px-5 py-5 [&>*+*]:pt-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {parcelSecondary.map((c) => (
                    <SectionKpiCard key={c.id} card={c} />
                  ))}
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
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Sort rate</h3>
                <FlowRateSection
                  flowRateWeek={payload.flowRateWeek}
                  visibleDays={payload.visibleDays}
                  showStageTabsOnly
                  defaultItemType="parcels"
                  aggregatedLabel={useAggregated ? selectedLabel : undefined}
                />
              </div>
            </div>
          )}

          {row1Expanded === "trucks" && (
            <div className="rounded-[12px] border border-line-hovered bg-white px-5 py-5 [&>*+*]:pt-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {palletSecondary.map((c) => (
                    <SectionKpiCard key={c.id} card={c} />
                  ))}
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
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Pallet load rate</h3>
                <FlowRateSection
                  flowRateWeek={payload.flowRateWeek}
                  visibleDays={payload.visibleDays}
                  hideTabs
                  defaultCombo="pallets-average"
                  defaultItemType="pallets"
                  aggregatedLabel={useAggregated ? selectedLabel : undefined}
                />
              </div>
            </div>
          )}

          {row1Expanded === "returns" && (
            <div className="rounded-[12px] border border-line-hovered bg-white px-5 py-5 [&>*+*]:pt-8">
              <div>
                <h3 className="pb-4 text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Related metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {returnsSecondary.map((c) => (
                    <SectionKpiCard key={c.id} card={c} />
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
            <div className="overflow-hidden rounded-[12px] border border-line-hovered bg-white pt-5">
              <AssociatesInsightsV41 sorters={sorters} />
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
                columnTooltips={{
                  preSortRate: { body: "Average hourly rate at which parcels were actively pre-sorted in pre-sort mode", target: "160 / hr" },
                  sortRate: { body: "Average hourly rate at which parcels were actively scanned to pallet", target: "160 / hr" },
                  parcelsSorted: { body: "Total parcels this associate sorted in the selected period" },
                  missorted: { body: "Parcels this associate last scanned in the selected period that were next scanned at the wrong location", target: "0" },
                  lost: { body: "Parcels this associate last scanned in the selected period that were lost and not scanned again for 10 days", target: "0" },
                  loadRate: { body: "Average hourly rate at which pallets were actively scanned to truck", target: "30 / hr" },
                  palletsLoaded: { body: "Total pallets this associate loaded onto trucks in the selected period" },
                  idleTime: { body: "Cumulative idle time — any 10+ minute gap between scans. All other time-based metrics pause while idle." },
                  targetStatus: { body: "Whether this associate is meeting all individual performance targets" },
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
