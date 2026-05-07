import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { PrismWarningIcon } from "../components/icons/PrismWarningIcon";
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

function HeroCard({ card, expanded, dimmed, bare, onToggle }: { card: V3MetricCard; expanded: boolean; dimmed?: boolean; bare?: boolean; onToggle: () => void }) {
  const isNeutral = card.delta?.tone === "neutral";
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex flex-col items-stretch text-left border-line-hovered",
        bare && "px-5 py-4",
        !bare && (dimmed
          ? "bg-[#F6F7F8] border-t border-b-2 border-r first:border-l pt-[17px] pb-[15px] first:pl-[21px] [&:not(:first-child)]:pl-5 pr-[21px]"
          : "bg-white border-t-2 border-r-2 first:border-l-2"),
        !bare && !dimmed && !expanded && "border-b-2 first:rounded-bl-[12px] last:rounded-br-[12px] py-4 px-5",
        !bare && !dimmed && expanded && "border-l-2 first:ml-0 [&:not(:first-child)]:-ml-px pt-4 pb-[17px] first:px-5 [&:not(:first-child)]:pl-[19px] [&:not(:first-child)]:pr-[19px]",
        !bare && "first:rounded-tl-[12px] last:rounded-tr-[12px]",
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
              {card.labelTooltip.target && (
                <div className="mt-2 text-body-sm-strong text-white">Target: {card.labelTooltip.target}</div>
              )}
              <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
            </div>
          )}
        </div>
        <span className={cn("mt-2 text-[24px] leading-[28px] font-bold tracking-[-0.01em]", isPlaceholder ? "text-ink-subdued" : "text-[#111318]")}>
          {card.value}
        </span>
        <div className="mt-1 flex h-[26px] items-center">
          {card.delta && (
            isNeutral ? (
              <span className="inline-flex items-center rounded-tag bg-positive-bg px-2 py-0.5 text-[13px] leading-[18px] font-bold text-positive">At target</span>
            ) : card.delta.tone === "negative" ? (
              <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-[13px] leading-[18px] font-bold text-negative">
                <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
                {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-tag bg-positive-bg px-2 py-0.5 text-[13px] leading-[18px] font-bold text-positive">
                <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
                {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
              </span>
            )
          )}
        </div>
      </div>
      <div className="mt-3 inline-flex self-start items-center gap-1 text-[14px] leading-[20px] font-bold tracking-[-0.01em] text-[#111318]">
        {expanded ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
        <span className="underline underline-offset-2">{expanded ? "View less" : "View more"}</span>
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
            {card.labelTooltip.target && (
              <div className="mt-2 text-body-sm-strong text-white">Target: {card.labelTooltip.target}</div>
            )}
            <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {card.bakeNote && (
          <div
            className="relative self-center"
            onMouseEnter={() => setBakeTooltipOpen(true)}
            onMouseLeave={() => setBakeTooltipOpen(false)}
          >
            <PrismWarningIcon className="h-4 w-4 text-ink" />
            {bakeTooltipOpen && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[280px] -translate-x-1/2 whitespace-normal rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
                <div className="text-body-sm-strong text-white">{card.bakeNote.title}</div>
                <div className="mt-1 text-body-sm text-white/80">{card.bakeNote.body}</div>
                <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
              </div>
            )}
          </div>
        )}
        <span className={cn("text-[24px] leading-[28px] font-bold tracking-[-0.01em]", isPlaceholder ? "text-ink-subdued" : "text-[#111318]")}>
          {card.value}
        </span>
        {card.delta && (
          isNeutral ? (
            <span className="inline-flex items-center rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">At target</span>
          ) : card.delta.tone === "negative" ? (
            <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
              <svg aria-hidden viewBox="0 0 8 7" className={cn("h-2 w-2", card.delta.direction === "down" && "rotate-180")} fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
              {card.delta.value} {card.delta.direction === "up" ? "above" : "below"} target
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">
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
/*  DualShapeContainer — exactly 2 shapes: gray rect (back) + white L  */
/*                                                                     */
/*  Renders a single SVG with a rounded gray rectangle and a single    */
/*  white "L" path (orientation depends on which column is selected).  */
/*  Concave inner corners use sweep-reversed arcs so they bulge        */
/*  outward into the gray — a fillet stacked CSS rectangles cannot     */
/*  produce. Dimensions are measured via ResizeObserver so the L       */
/*  scales cleanly with content height.                                */
/*                                                                     */
/*  selectedCol semantics:                                             */
/*    0 = far-left  tower (1 concave: right)                           */
/*    1 = mid-left  tower (2 concaves: left + right)                   */
/*    2 = mid-right tower (2 concaves: left + right)                   */
/*    3 = far-right tower (1 concave: left)                            */
/* ------------------------------------------------------------------ */

function buildLPath(selectedCol: 0 | 1 | 2 | 3, w: number, h: number, cardH: number, r: number): string {
  const towerLeft = selectedCol * (w / 4);
  const towerRight = (selectedCol + 1) * (w / 4);
  const hasLeft = selectedCol > 0;   // gray exposed left of tower in cards row
  const hasRight = selectedCol < 3;  // gray exposed right of tower in cards row

  const path: string[] = [];

  // Top of tower — convex top-left, then top edge, then convex top-right
  path.push(`M ${towerLeft + r} 0`);
  path.push(`L ${towerRight - r} 0`);
  path.push(`A ${r} ${r} 0 0 1 ${towerRight} ${r}`);

  if (hasRight) {
    // Down tower's right edge → concave (outward fillet) → across panel top → convex top-right of panel → down to bottom
    path.push(`L ${towerRight} ${cardH - r}`);
    path.push(`A ${r} ${r} 0 0 0 ${towerRight + r} ${cardH}`);
    path.push(`L ${w - r} ${cardH}`);
    path.push(`A ${r} ${r} 0 0 1 ${w} ${cardH + r}`);
    path.push(`L ${w} ${h - r}`);
  } else {
    // Tower right IS the overall right edge — no concave, straight down
    path.push(`L ${w} ${h - r}`);
  }

  // Bottom-right convex → bottom edge → bottom-left convex
  path.push(`A ${r} ${r} 0 0 1 ${w - r} ${h}`);
  path.push(`L ${r} ${h}`);
  path.push(`A ${r} ${r} 0 0 1 0 ${h - r}`);

  if (hasLeft) {
    // Up panel's left edge → convex top-left of panel → across panel top → concave (outward fillet) → up tower's left edge
    path.push(`L 0 ${cardH + r}`);
    path.push(`A ${r} ${r} 0 0 1 ${r} ${cardH}`);
    path.push(`L ${towerLeft - r} ${cardH}`);
    path.push(`A ${r} ${r} 0 0 0 ${towerLeft} ${cardH - r}`);
    path.push(`L ${towerLeft} ${r}`);
  } else {
    // Tower left IS the overall left edge — no concave, straight up
    path.push(`L 0 ${r}`);
  }

  // Top-left of tower convex (closes the path)
  path.push(`A ${r} ${r} 0 0 1 ${towerLeft + r} 0`);
  path.push("Z");

  return path.join(" ");
}

function DualShapeContainer({
  selectedCol,
  cardsRow,
  panel,
}: {
  selectedCol: 0 | 1 | 2 | 3;
  cardsRow: React.ReactNode;
  panel: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const cardsRowRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0, cardH: 0 });

  useLayoutEffect(() => {
    if (!outerRef.current || !cardsRowRef.current) return;

    const measure = () => {
      const outer = outerRef.current!.getBoundingClientRect();
      const cards = cardsRowRef.current!.getBoundingClientRect();
      setDims({ w: outer.width, h: outer.height, cardH: cards.height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outerRef.current);
    ro.observe(cardsRowRef.current);
    return () => ro.disconnect();
  }, []);

  const r = 12;
  const { w, h, cardH } = dims;
  const ready = w > 0 && h > 0 && cardH > 0;

  const lPath = ready ? buildLPath(selectedCol, w, h, cardH, r) : "";

  return (
    <div ref={outerRef} className="relative">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${w || 1} ${h || 1}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* Strokes clipped to each shape so only the inside half renders. Drawing 2× the desired width means visible inner half = the requested thickness. Result: gray = 1px inside, L = 2px inside, no 3px overlap anywhere because both strokes live entirely inside their own shape's interior. */}
        <defs>
          <clipPath id="dual-shape-gray-clip">
            <rect x={0} y={0} width={w || 0} height={h || 0} rx={r} ry={r} />
          </clipPath>
          {ready && (
            <clipPath id="dual-shape-l-clip">
              <path d={lPath} />
            </clipPath>
          )}
        </defs>
        {/* Shape 1 (back): gray rounded rectangle. 2px stroke clipped to its own interior → 1px visible inside. */}
        <rect
          x={0}
          y={0}
          width={w || 0}
          height={h || 0}
          rx={r}
          ry={r}
          fill="#F6F7F8"
          stroke="#D3D6D9"
          strokeWidth={2}
          clipPath="url(#dual-shape-gray-clip)"
        />
        {/* Shape 2 (front): single white L path with concave outward fillet. 4px stroke clipped to its own interior → 2px visible inside. */}
        {ready && (
          <path
            d={lPath}
            fill="#FFFFFF"
            stroke="#D3D6D9"
            strokeWidth={4}
            clipPath="url(#dual-shape-l-clip)"
          />
        )}
      </svg>

      <div className="relative">
        <div ref={cardsRowRef}>{cardsRow}</div>
        {panel}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function PerformancePageV56() {
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

  // Hero cards for row 1
  // V46 override: Sort SLA compliance — target 100%, custom tooltip
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
      label: "Sort SLA compliance",
      labelTooltip: { title: "", body: "% of parcels sorted at least 15m before the first truck CPT of the day", target: "100%" },
      delta,
    };
  })();
  // V46 override: Controllable CPT compliance — target 100%, custom tooltip
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
      label: "Controllable CPT compliance",
      labelTooltip: { title: "", body: "% of pallets loaded to truck by the truck's CPT — only for trucks that arrived on time or early", target: "100%" },
      delta,
    };
  })();
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
      labelTooltip: { title: "", body: "% of return parcels loaded onto the soonest scheduled return truck after being scanned as return", target: "100%" },
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
      labelTooltip: { title: "", body: "Number of associates meeting all individual performance targets", target: `${total} / ${total}` },
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
  // Row-level accordion: only one expanded per row (null = all collapsed)
  const [row1Expanded, setRow1Expanded] = useState<string | null>("parcels");
  const [associatesSearch, setAssociatesSearch] = useState("");

  const toggleRow1 = (id: string) => setRow1Expanded((prev) => (prev === id ? null : id));

  return (
    <div className="theme-v56 flex h-full flex-col overflow-y-scroll bg-white">
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
            {/* Overall grade hidden for now — may bring back later */}
          </div>
          {row1Expanded === "parcels" ? (
            // ── Sort SLA selected: TWO shapes only — gray rounded rect (back) + single white L path (front). All visuals come from one SVG; content is layered on top. The concave inner corner uses a sweep-reversed arc so it bulges OUTWARD into the gray (proper fillet). See DualShapeContainer above. ──
            <DualShapeContainer
              selectedCol={0}
              cardsRow={
                <div className="grid grid-cols-4">
                  {parcelsHero && (
                    <HeroCard card={parcelsHero} expanded={true} bare onToggle={() => toggleRow1("parcels")} />
                  )}
                  <div className="col-span-3 grid grid-cols-3 divide-x divide-line-hovered">
                    {trucksHero && <HeroCard card={trucksHero} expanded={false} bare onToggle={() => toggleRow1("trucks")} />}
                    {returnsHero && <HeroCard card={returnsHero} expanded={false} bare onToggle={() => toggleRow1("returns")} />}
                    <HeroCard card={associatesHero} expanded={false} bare onToggle={() => toggleRow1("associates")} />
                  </div>
                </div>
              }
              panel={
                <div className="px-5 py-5 [&>*+*]:pt-8">
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
                      largeColor="#7c3aed"
                    />
                  </div>
                </div>
              }
            />
          ) : row1Expanded === "trucks" ? (
            <DualShapeContainer
              selectedCol={1}
              cardsRow={
                <div className="grid grid-cols-4">
                  {parcelsHero && <HeroCard card={parcelsHero} expanded={false} bare onToggle={() => toggleRow1("parcels")} />}
                  {trucksHero && <HeroCard card={trucksHero} expanded={true} bare onToggle={() => toggleRow1("trucks")} />}
                  <div className="col-span-2 grid grid-cols-2 divide-x divide-line-hovered">
                    {returnsHero && <HeroCard card={returnsHero} expanded={false} bare onToggle={() => toggleRow1("returns")} />}
                    <HeroCard card={associatesHero} expanded={false} bare onToggle={() => toggleRow1("associates")} />
                  </div>
                </div>
              }
              panel={
                <div className="px-5 py-5 [&>*+*]:pt-8">
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
                      largeColor="#7c3aed"
                      palletLabel="Avg. load rate"
                    />
                  </div>
                </div>
              }
            />
          ) : row1Expanded === "returns" ? (
            <DualShapeContainer
              selectedCol={2}
              cardsRow={
                <div className="grid grid-cols-4">
                  <div className="col-span-2 grid grid-cols-2 divide-x divide-line-hovered">
                    {parcelsHero && <HeroCard card={parcelsHero} expanded={false} bare onToggle={() => toggleRow1("parcels")} />}
                    {trucksHero && <HeroCard card={trucksHero} expanded={false} bare onToggle={() => toggleRow1("trucks")} />}
                  </div>
                  {returnsHero && <HeroCard card={returnsHero} expanded={true} bare onToggle={() => toggleRow1("returns")} />}
                  <HeroCard card={associatesHero} expanded={false} bare onToggle={() => toggleRow1("associates")} />
                </div>
              }
              panel={
                <div className="px-5 py-5 [&>*+*]:pt-8">
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
                      hideForecasted
                    />
                  </div>
                </div>
              }
            />
          ) : row1Expanded === "associates" ? (
            <DualShapeContainer
              selectedCol={3}
              cardsRow={
                <div className="grid grid-cols-4">
                  <div className="col-span-3 grid grid-cols-3 divide-x divide-line-hovered">
                    {parcelsHero && <HeroCard card={parcelsHero} expanded={false} bare onToggle={() => toggleRow1("parcels")} />}
                    {trucksHero && <HeroCard card={trucksHero} expanded={false} bare onToggle={() => toggleRow1("trucks")} />}
                    {returnsHero && <HeroCard card={returnsHero} expanded={false} bare onToggle={() => toggleRow1("returns")} />}
                  </div>
                  <HeroCard card={associatesHero} expanded={true} bare onToggle={() => toggleRow1("associates")} />
                </div>
              }
              panel={
                // SortersTable runs in transparentBg mode so the L's white fill (from the SVG) provides the bg — no opaque rectangle to cover the L's rounded BL/BR corners or strokes.
                <div className="pt-5">
                  <AssociatesInsightsV41 sorters={sorters} onNameClick={setAssociatesSearch} coachingSectionLabel="Worst performers" />
                  <SortersTableV3
                    sorters={sorters}
                    searchValue={associatesSearch}
                    onSearchChange={setAssociatesSearch}
                    hideStatusIcons
                    defaultSortKey="meetsTargets"
                    defaultSortDir="desc"
                    showFilters
                    hideRateSelectors
                    hideHeader
                    noBorderTable
                    transparentBg
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
              }
            />
          ) : (
            // No card expanded — plain 4-card row, no L
            <div className="grid grid-cols-4">
              {parcelsHero && <HeroCard card={parcelsHero} expanded={false} onToggle={() => toggleRow1("parcels")} />}
              {trucksHero && <HeroCard card={trucksHero} expanded={false} onToggle={() => toggleRow1("trucks")} />}
              {returnsHero && <HeroCard card={returnsHero} expanded={false} onToggle={() => toggleRow1("returns")} />}
              <HeroCard card={associatesHero} expanded={false} onToggle={() => toggleRow1("associates")} />
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
