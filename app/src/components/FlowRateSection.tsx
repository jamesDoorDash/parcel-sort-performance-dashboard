import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { FlowRateDayBucket, FlowRateCombo, FlowRateWeekData } from "../data/mockV2";
import { cn } from "../lib/cn";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";
import { PrismInfoIcon } from "./icons/PrismInfoIcon";

// ---- Chart constants ----
const CHART_W = 900;
const CHART_H = 260;
const PAD = { top: 24, right: 16, bottom: 32, left: 56 };
const plotH = CHART_H - PAD.top - PAD.bottom;
const plotW = CHART_W - PAD.left - PAD.right;

function computeYAxis(data: FlowRateDayBucket[], aggregated: { blendedAverage: number; smallOnly: number; largeOnly: number } | null) {
  const values: number[] = [];
  for (const d of data) {
    values.push(d.blendedAverage, d.smallOnly, d.largeOnly);
  }
  if (aggregated) {
    values.push(aggregated.blendedAverage, aggregated.smallOnly, aggregated.largeOnly);
  }
  const dataMax = values.length ? Math.max(...values) : 0;
  // Round up to next 50, with at least 100 floor (so empty data still has axis), padded ~10% above peak
  const target = dataMax < 50
    ? Math.max(10, Math.ceil(dataMax * 1.2 / 5) * 5)
    : Math.max(100, Math.ceil(dataMax * 1.1 / 50) * 50);
  const step = target / 5;
  const ticks: number[] = [];
  for (let v = 0; v <= target; v += step) ticks.push(Math.round(v));
  return { yMax: target, yTicks: ticks };
}

const SERIES_COLORS = {
  blended: chartStateColors.primary,
  small: chartStateColors.secondary,
  large: chartStateColors.bad,
};

const LEGEND_TOOLTIPS: Record<string, string> = {
  blendedAverage: "Average hourly rate at which parcels were actively pre-sorted in pre-sort mode",
  smallOnly: "Parcels pre-sorted that ultimately go into gaylord containers",
  largeOnly: "Parcels pre-sorted that ultimately go into wooden pallets",
};

// ---- Tab definitions ----
type ItemType = "parcels" | "pallets";
type ParcelStageType = "presort" | "sort";
type SummaryRateType = "average" | "max";
type ParcelFlowMode = "stage" | "summary";

const itemTabs: { key: ItemType; label: string }[] = [
  { key: "parcels", label: "Parcels" },
  { key: "pallets", label: "Pallets" },
];

const parcelStageTabs: { key: ParcelStageType; label: string }[] = [
  { key: "presort", label: "Pre-sort" },
  { key: "sort", label: "Sort to pallet" },
];

const rateSummaryTabs: { key: SummaryRateType; label: string }[] = [
  { key: "average", label: "Average rate" },
  { key: "max", label: "Max rate" },
];

function comboKey(item: ItemType, rate: ParcelStageType | SummaryRateType): FlowRateCombo {
  if (item === "pallets") return `pallets-${rate as SummaryRateType}` as FlowRateCombo;
  const map: Record<ParcelStageType | SummaryRateType, string> = {
    presort: "parcels-presort",
    sort: "parcels-sort",
    average: "parcels-average",
    max: "parcels-max",
  };
  return map[rate] as FlowRateCombo;
}

// ---- SVG helpers ----
function makeYPx(yMax: number) {
  return (val: number) => PAD.top + plotH - (val / yMax) * plotH;
}

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");
}

function roundedTopBarPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  const bottom = y + height;
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${bottom}`,
    "Z",
  ].join(" ");
}

// ---- Component ----
type Props = {
  flowRateWeek: FlowRateWeekData;
  visibleDays?: Set<string>;
  hideTabs?: boolean;
  // Show ONLY the Pre-sort / Sort to pallet selector. Hides item-type tabs and rate-summary tabs.
  showStageTabsOnly?: boolean;
  // Override the label for the "sort" stage tab (e.g. "Sort to bin" on spoke).
  sortStageLabel?: string;
  // Render a single line/series — hides Smalls and Larges and shows only the blendedAverage data
  // with the provided label and (optional) info tooltip. valueSuffix overrides the default "/ hr"
  // unit shown in tooltips and bar labels.
  singleSeriesMode?: { label: string; infoTooltip?: string; valueSuffix?: string };
  defaultCombo?: FlowRateCombo;
  defaultItemType?: ItemType;
  aggregatedLabel?: string; // When set, switch to bar chart mode with aggregated data
  palletLabel?: string; // Override for the "Pallets loaded" series label (e.g. "Bin dispatch rate" on spoke)
  largeColor?: string; // Override the color of the "Larges" series
};

export function FlowRateSection({ flowRateWeek, visibleDays, hideTabs, showStageTabsOnly, defaultCombo, defaultItemType, aggregatedLabel, palletLabel = "Pallet load rate", singleSeriesMode, largeColor }: Props) {
  const [itemType, setItemType] = useState<ItemType>(defaultItemType ?? "parcels");
  useEffect(() => { if (defaultItemType) setItemType(defaultItemType); }, [defaultItemType]);
  const [parcelStage, setParcelStage] = useState<ParcelStageType>("presort");
  const [summaryRate, setSummaryRate] = useState<SummaryRateType>("average");
  const [parcelFlowMode, setParcelFlowMode] = useState<ParcelFlowMode>("stage");
  const [hiddenSeries, setHiddenSeries] = useState<Set<"blendedAverage" | "smallOnly" | "largeOnly">>(new Set());
  const [hoveredSeries, setHoveredSeries] = useState<"blendedAverage" | "smallOnly" | "largeOnly" | null>(null);
  const allSeriesKeys: Array<"blendedAverage" | "smallOnly" | "largeOnly"> = ["blendedAverage", "smallOnly", "largeOnly"];
  const hiddenCount = hiddenSeries.size;
  const [tooltipOpen, setTooltipOpen] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const handleItemType = (t: ItemType) => {
    setItemType(t);
    if (t === "pallets") {
      setParcelFlowMode("summary");
      return;
    }
    setParcelStage("presort");
    setParcelFlowMode("stage");
  };

  const currentCombo = defaultCombo ?? (itemType === "pallets"
    ? comboKey("pallets", summaryRate)
    : comboKey("parcels", parcelFlowMode === "stage" ? parcelStage : summaryRate));
  const FUTURE_CUTOFF = "2026-02-15";
  const allData: FlowRateDayBucket[] = flowRateWeek[currentCombo];
  const singleDayMode = visibleDays?.size === 1;
  const isAggregated = !!aggregatedLabel;
  const data = singleDayMode
    ? allData.filter((d) => visibleDays.has(d.date))
    : allData;

  // Aggregate flow rate data for custom range bar chart
  const aggregated = useMemo(() => {
    if (!isAggregated) return null;
    const visible = allData.filter((d) => d.date < FUTURE_CUTOFF && (!visibleDays || visibleDays.has(d.date)));
    if (visible.length === 0) return { blendedAverage: 0, smallOnly: 0, largeOnly: 0 };
    return {
      blendedAverage: Math.round(visible.reduce((s, d) => s + d.blendedAverage, 0) / visible.length),
      smallOnly: Math.round(visible.reduce((s, d) => s + d.smallOnly, 0) / visible.length),
      largeOnly: Math.round(visible.reduce((s, d) => s + d.largeOnly, 0) / visible.length),
    };
  }, [allData, isAggregated, visibleDays]);

  const { yTicks: Y_TICKS } = computeYAxis(data, aggregated);
  const yPx = makeYPx(computeYAxis(data, aggregated).yMax);

  const n = data.length;
  const slotW = plotW / n;
  const pointX = (i: number) => PAD.left + slotW * i + slotW / 2;

  const points = (key: keyof Pick<FlowRateDayBucket, "blendedAverage" | "smallOnly" | "largeOnly">) =>
    data.filter((d) => d.date < FUTURE_CUTOFF).map((d): [number, number] => {
      const origIdx = data.indexOf(d);
      return [pointX(origIdx), yPx(d[key])];
    });
  const isVisible = (series: "blendedAverage" | "smallOnly" | "largeOnly") =>
    !hiddenSeries.has(series) && (hoveredSeries == null || hoveredSeries === series) && !(singleSeriesMode && series !== "blendedAverage");
  const isActive = (series: "blendedAverage" | "smallOnly" | "largeOnly") => !hiddenSeries.has(series) && !(singleSeriesMode && series !== "blendedAverage");
  const toggleSeries = (series: "blendedAverage" | "smallOnly" | "largeOnly") => {
    setHiddenSeries((current) => {
      if (current.has(series)) {
        const next = new Set(current);
        next.delete(series);
        return next;
      }
      return new Set(allSeriesKeys.filter((k) => k !== series));
    });
  };

  const tabGroupClass = "inline-flex items-center rounded-button border border-line-hovered bg-white";
  const tabBtnClass = (active: boolean) =>
    cn(
      "relative -my-px h-10 rounded-button px-6 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
      active ? "z-10 bg-white text-ink ring-2 ring-inset ring-ink" : "text-ink-subdued hover:text-ink",
    );

  return (
    <section>
      {/* Tab rows */}
      {!hideTabs && !showStageTabsOnly && (
      <div className="mb-2 flex items-center gap-4">
        {/* Group 1 — Parcels / Pallets */}
        <div className={tabGroupClass}>
          {itemTabs.map((tab) => (
            <button key={tab.key} type="button" onClick={() => handleItemType(tab.key)} className={tabBtnClass(itemType === tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Group 2 — Pre-sort / Sort to pallet (parcels only) */}
        {itemType === "parcels" && (
          <div className={tabGroupClass}>
            {parcelStageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setParcelStage(tab.key);
                  setParcelFlowMode("stage");
                }}
                className={tabBtnClass(parcelStage === tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Group 3 — Average rate / Max rate */}
        <div className={tabGroupClass}>
          {rateSummaryTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSummaryRate(tab.key);
                setParcelFlowMode("summary");
              }}
              className={tabBtnClass(summaryRate === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {showStageTabsOnly && (
        <div className="mb-2 flex items-center gap-4">
          <div className={tabGroupClass}>
            {parcelStageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setParcelStage(tab.key);
                  setParcelFlowMode("stage");
                }}
                className={tabBtnClass(parcelStage === tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart + legend row */}
      <div className="relative z-10 flex items-center gap-8">
      <div className="flex-1">

      {/* Aggregated bar chart for custom range */}
      {isAggregated && aggregated ? (
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          overflow="visible"
          role="img"
          aria-label="Flow rate aggregated"
        >
          {/* Grid + y-axis */}
          {Y_TICKS.map((tick, i) => {
            const y = yPx(tick);
            return (
              <g key={`agg-tick-${i}`}>
                {tick > 0 && <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y} y2={y} stroke={chartNeutralColors.pending} strokeDasharray="2 4" strokeWidth={1} />}
                <text x={PAD.left - 12} y={y + 4} textAnchor="end" fill={chartNeutralColors.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={500}>{tick}</text>
              </g>
            );
          })}
          {/* Baseline */}
          <line x1={PAD.left} x2={CHART_W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={chartNeutralColors.baseline} strokeWidth={1.5} />
          {/* X-axis label */}
          <text x={PAD.left + plotW / 2} y={CHART_H - 10} textAnchor="middle" fill={chartNeutralColors.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={500}>{aggregatedLabel}</text>
          {/* Bars */}
          {itemType === "pallets" ? (() => {
            const barW = 44;
            const cx = PAD.left + plotW / 2;
            const x = cx - barW / 2;
            const val = aggregated.blendedAverage;
            const y = yPx(val);
            const h = PAD.top + plotH - y;
            return (
              <g>
                <path d={roundedTopBarPath(x, y, barW, h, 4)} fill={SERIES_COLORS.blended} />
                <text x={cx} y={y - 8} textAnchor="middle" fill={chartNeutralColors.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={600}>{val} / hr</text>
              </g>
            );
          })() : (() => {
            const barW = 36;
            const gap = 4;
            const groupW = barW * 3 + gap * 2;
            const cx = PAD.left + plotW / 2;
            const startX = cx - groupW / 2;
            const bars = [
              { key: "blendedAverage" as const, val: aggregated.blendedAverage, color: SERIES_COLORS.blended },
              { key: "smallOnly" as const, val: aggregated.smallOnly, color: SERIES_COLORS.small },
              { key: "largeOnly" as const, val: aggregated.largeOnly, color: (largeColor ?? SERIES_COLORS.large) },
            ].filter((b) => isVisible(b.key));
            return (
              <g>
                {bars.map((b, bi) => {
                  const x = startX + bi * (barW + gap);
                  const y = yPx(b.val);
                  const h = PAD.top + plotH - y;
                  return (
                    <g key={b.key}>
                      <path d={roundedTopBarPath(x, y, barW, h, 4)} fill={b.color} />
                      <text x={x + barW / 2} y={y - 8} textAnchor="middle" fill={chartNeutralColors.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={600}>{b.val} / hr</text>
                    </g>
                  );
                })}
              </g>
            );
          })()}
        </svg>
      ) : (

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        role="img"
        aria-label="Flow rate by day"
      >
        {/* Grid + y-axis labels (dashed lines only, baseline drawn last) */}
        {Y_TICKS.map((tick, i) => {
          if (tick === 0) {
            return (
              <text
                key={`tick-label-${i}`}
                x={PAD.left - 12}
                y={yPx(tick) + 4}
                textAnchor="end"
                fill={chartNeutralColors.axis}
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontWeight={500}
              >
                {tick}
              </text>
            );
          }

          const y = yPx(tick);
          return (
            <g key={`tick-${i}`}>
              <line
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={y}
                y2={y}
                stroke={chartNeutralColors.pending}
                strokeDasharray="2 4"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 12}
                y={y + 4}
                textAnchor="end"
                fill={chartNeutralColors.axis}
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontWeight={500}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={d.date}
            x={pointX(i)}
            y={CHART_H - 10}
            textAnchor="middle"
            fill={chartNeutralColors.axis}
            fontSize={12}
            fontFamily="Inter, sans-serif"
            fontWeight={500}
          >
            {d.label}
          </text>
        ))}

        {/* Series lines (skip in single-day mode) */}
        {itemType === "pallets" ? (
          <>
            {!singleDayMode && <path d={smoothPath(points("blendedAverage"))} fill="none" stroke={SERIES_COLORS.blended} strokeWidth={2.5} />}
            {points("blendedAverage").map(([x, y], i) => (
              <circle key={`pallets-${i}`} cx={x} cy={y} r={3} fill={SERIES_COLORS.blended} />
            ))}
          </>
        ) : (
          <>
            {!singleDayMode && isVisible("largeOnly") && <path d={smoothPath(points("largeOnly"))} fill="none" stroke={(largeColor ?? SERIES_COLORS.large)} strokeWidth={2} />}
            {!singleDayMode && isVisible("smallOnly") && <path d={smoothPath(points("smallOnly"))} fill="none" stroke={SERIES_COLORS.small} strokeWidth={2} />}
            {!singleDayMode && isVisible("blendedAverage") && <path d={smoothPath(points("blendedAverage"))} fill="none" stroke={SERIES_COLORS.blended} strokeWidth={2.5} />}
            {(["blendedAverage", "smallOnly", "largeOnly"] as const).map((key) => {
              if (!isVisible(key)) return null;
              const color = key === "blendedAverage" ? SERIES_COLORS.blended : key === "smallOnly" ? SERIES_COLORS.small : (largeColor ?? SERIES_COLORS.large);
              return points(key).map(([x, y], i) => (
                <circle key={`${key}-${i}`} cx={x} cy={y} r={3} fill={color} />
              ));
            })}
          </>
        )}

        {/* Hover zones per day (non-future only) */}
        {data.map((d, i) => d.date >= FUTURE_CUTOFF ? null : (
          <rect
            key={`hover-${i}`}
            x={PAD.left + slotW * i}
            y={PAD.top}
            width={slotW}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHoveredPoint(i)}
            onMouseLeave={() => setHoveredPoint(null)}
            style={{ cursor: "default" }}
          />
        ))}

        {/* Baseline */}
        <line
          x1={PAD.left}
          x2={CHART_W - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke={chartNeutralColors.baseline}
          strokeWidth={1.5}
        />

        {/* Hover tooltip */}
        {hoveredPoint !== null && (() => {
          const d = data[hoveredPoint];
          const cx = pointX(hoveredPoint);
          const rows = itemType === "pallets"
            ? [{ label: palletLabel, value: d.blendedAverage, color: SERIES_COLORS.blended, visible: true }]
            : singleSeriesMode
            ? [{ label: singleSeriesMode.label, value: d.blendedAverage, color: SERIES_COLORS.blended, visible: isVisible("blendedAverage") }].filter((r) => r.visible)
            : [
                { label: "Average", value: d.blendedAverage, color: SERIES_COLORS.blended, visible: isVisible("blendedAverage") },
                { label: "Smalls", value: d.smallOnly, color: SERIES_COLORS.small, visible: isVisible("smallOnly") },
                { label: "Larges", value: d.largeOnly, color: (largeColor ?? SERIES_COLORS.large), visible: isVisible("largeOnly") },
              ].filter((r) => r.visible);
          if (rows.length === 0) return null;

          const boxW = 210;
          const rowH = 20;
          const padY = 10;
          const padX = 12;
          const boxH = padY * 2 + rows.length * rowH + 18;
          const tailH = 6;
          const minY = Math.min(...rows.map((r) => yPx(r.value)));
          const ty = minY - 8 - tailH - boxH;
          const tx = Math.max(12, Math.min(cx - boxW / 2, CHART_W - boxW - 12));

          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={boxW} height={boxH} rx={6} fill={chartNeutralColors.ink} />
              <text x={tx + padX} y={ty + padY + 12} fill="white" fontSize={12} fontFamily="Inter, sans-serif" fontWeight={600}>
                {d.label}
              </text>
              {rows.map((r, ri) => (
                <g key={ri}>
                  <rect x={tx + padX} y={ty + padY + 22 + ri * rowH + 4} width={8} height={8} rx={2} fill={r.color} />
                  <text x={tx + padX + 14} y={ty + padY + 22 + ri * rowH + 12} fill="white" opacity={0.8} fontSize={11} fontFamily="Inter, sans-serif">
                    {r.label}
                  </text>
                  <text x={tx + boxW - padX} y={ty + padY + 22 + ri * rowH + 12} fill="white" fontSize={11} fontFamily="Inter, sans-serif" fontWeight={600} textAnchor="end">
                    {Math.round(r.value)}{singleSeriesMode?.valueSuffix ?? " / hr"}
                  </text>
                </g>
              ))}
              <polygon
                points={`${cx - 5},${ty + boxH} ${cx + 5},${ty + boxH} ${cx},${ty + boxH + tailH}`}
                fill={chartNeutralColors.ink}
              />
            </g>
          );
        })()}

      </svg>
      )}
      </div>

      {/* Legend — vertical column to the right of chart, vertically centered */}
      <div className="flex min-w-[180px] flex-col gap-2">
        {itemType === "pallets" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="block h-4 w-4 shrink-0 rounded-[4px]" style={{ backgroundColor: SERIES_COLORS.blended }} />
              <span className="whitespace-nowrap text-body-md text-ink">{palletLabel}</span>
            </div>
            {/* Invisible spacers so the legend column has the same height as the parcels variant
                and ends up centered at the same vertical position relative to the chart. */}
            <div className="invisible flex items-center gap-2">
              <span className="block h-4 w-4 shrink-0 rounded-[4px]" />
              <span className="whitespace-nowrap text-body-md text-ink">spacer</span>
            </div>
            <div className="invisible flex items-center gap-2">
              <span className="block h-4 w-4 shrink-0 rounded-[4px]" />
              <span className="whitespace-nowrap text-body-md text-ink">spacer</span>
            </div>
            <div className="invisible mt-2 flex items-center gap-2">
              <span className="block h-4 w-4 shrink-0 rounded-[4px]" />
              <span className="whitespace-nowrap text-body-md text-ink">spacer</span>
            </div>
          </>
        ) : (
          <>
            {(singleSeriesMode
              ? [{ key: "blendedAverage" as const, color: SERIES_COLORS.blended, label: singleSeriesMode.label }]
              : [
                  { key: "blendedAverage" as const, color: SERIES_COLORS.blended, label: "Average" },
                  { key: "smallOnly" as const, color: SERIES_COLORS.small, label: "Smalls" },
                  { key: "largeOnly" as const, color: (largeColor ?? SERIES_COLORS.large), label: "Larges" },
                ]
            ).map(({ key, color, label }) => (
              <div key={label} className="flex items-center gap-1">
                {singleSeriesMode ? (
                  <div className="flex items-center gap-2">
                    <span className="block h-4 w-4 shrink-0 rounded-[4px]" style={{ backgroundColor: color }} />
                    <span className="whitespace-nowrap text-body-md text-ink">{label}</span>
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => toggleSeries(key)}
                  onMouseEnter={() => !hiddenSeries.has(key) && setHoveredSeries(key)}
                  onMouseLeave={() => setHoveredSeries(null)}
                  aria-pressed={isActive(key)}
                  className="flex items-center gap-2 rounded-button px-1.5 py-0.5 -mx-1.5 text-left transition-all hover:bg-surface-hovered"
                >
                  <span
                    className="block h-4 w-4 shrink-0 rounded-[4px]"
                    style={{ backgroundColor: color, opacity: isActive(key) ? 1 : 0 }}
                  />
                  <span className={cn("whitespace-nowrap text-body-md text-ink underline underline-offset-2", !isActive(key) && "opacity-60")}>{label}</span>
                </button>
                )}
                {(singleSeriesMode?.infoTooltip ?? LEGEND_TOOLTIPS[key]) && (
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center text-ink"
                      onMouseEnter={() => setTooltipOpen(key)}
                      onMouseLeave={() => setTooltipOpen(null)}
                    >
                      <PrismInfoIcon className="h-3.5 w-3.5" />
                    </button>
                    {tooltipOpen === key && (
                      <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg whitespace-nowrap">
                        <div className="text-body-sm text-white/80">{singleSeriesMode?.infoTooltip ?? LEGEND_TOOLTIPS[key]}</div>
                        <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className={cn("mt-2 flex items-center gap-2", hiddenCount > 0 ? "" : "invisible")}>
              <button
                type="button"
                onClick={() => setHiddenSeries(new Set())}
                className="flex items-center gap-2 rounded-button px-1.5 py-0.5 -mx-1.5 transition-all hover:bg-surface-hovered"
              >
                <Trash2 className="h-4 w-4 shrink-0 text-ink" strokeWidth={1.75} />
                <span className="text-body-md text-ink">{hiddenCount} {hiddenCount === 1 ? "filter" : "filters"} active</span>
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </section>
  );
}
