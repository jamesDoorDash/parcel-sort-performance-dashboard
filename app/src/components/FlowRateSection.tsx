import { useState } from "react";
import { Info } from "lucide-react";
import type { FlowRateDayBucket, FlowRateCombo, FlowRateWeekData } from "../data/mockV2";
import { cn } from "../lib/cn";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";

// ---- Chart constants ----
const CHART_W = 900;
const CHART_H = 260;
const PAD = { top: 24, right: 16, bottom: 32, left: 56 };
const plotH = CHART_H - PAD.top - PAD.bottom;
const plotW = CHART_W - PAD.left - PAD.right;
const Y_MAX = 250;
const Y_TICKS = [0, 50, 100, 150, 200, 250];

const SERIES_COLORS = {
  blended: chartStateColors.primary,
  small: chartStateColors.secondary,
  large: chartStateColors.bad,
};

const BLENDED_TOOLTIP = "2lb + parcels count 1.8x.";

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
function yPx(val: number) {
  return PAD.top + plotH - (val / Y_MAX) * plotH;
}

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");
}

// ---- Component ----
type Props = {
  flowRateWeek: FlowRateWeekData;
  visibleDays?: Set<string>;
};

export function FlowRateSection({ flowRateWeek, visibleDays }: Props) {
  const [itemType, setItemType] = useState<ItemType>("parcels");
  const [parcelStage, setParcelStage] = useState<ParcelStageType>("presort");
  const [summaryRate, setSummaryRate] = useState<SummaryRateType>("average");
  const [parcelFlowMode, setParcelFlowMode] = useState<ParcelFlowMode>("stage");
  const [hiddenSeries, setHiddenSeries] = useState<Set<"blendedAverage" | "smallOnly" | "largeOnly">>(new Set());
  const [tooltipOpen, setTooltipOpen] = useState(false);
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

  const currentCombo = itemType === "pallets"
    ? comboKey("pallets", summaryRate)
    : comboKey("parcels", parcelFlowMode === "stage" ? parcelStage : summaryRate);
  const FUTURE_CUTOFF = "2026-02-15";
  const allData: FlowRateDayBucket[] = flowRateWeek[currentCombo];
  const singleDayMode = visibleDays?.size === 1;
  const data = singleDayMode
    ? allData.filter((d) => visibleDays.has(d.date))
    : allData;
  const n = data.length;
  const slotW = plotW / n;
  const pointX = (i: number) => PAD.left + slotW * i + slotW / 2;
  const isFutureDay = (i: number) => data[i].date >= FUTURE_CUTOFF;

  const points = (key: keyof Pick<FlowRateDayBucket, "blendedAverage" | "smallOnly" | "largeOnly">) =>
    data.filter((d) => d.date < FUTURE_CUTOFF).map((d): [number, number] => {
      const origIdx = data.indexOf(d);
      return [pointX(origIdx), yPx(d[key])];
    });
  const isVisible = (series: "blendedAverage" | "smallOnly" | "largeOnly") => !hiddenSeries.has(series);
  const toggleSeries = (series: "blendedAverage" | "smallOnly" | "largeOnly") => {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(series)) next.delete(series);
      else next.add(series);
      return next;
    });
  };

  const tabGroupClass = "inline-flex items-center rounded-button border border-line-hovered bg-white";
  const tabBtnClass = (active: boolean) =>
    cn(
      "relative -my-px h-[34px] rounded-button px-6 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
      active ? "z-10 bg-white text-ink ring-2 ring-inset ring-ink" : "text-ink-subdued hover:text-ink",
    );

  return (
    <section>
      {/* Tab rows */}
      <div className="mb-6 flex items-center gap-4">
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

      {/* Chart + legend row */}
      <div className="relative z-10 flex gap-8">
      <div className="flex-1">
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
        {!singleDayMode && isVisible("largeOnly") && <path d={smoothPath(points("largeOnly"))} fill="none" stroke={SERIES_COLORS.large} strokeWidth={2} />}
        {!singleDayMode && isVisible("smallOnly") && <path d={smoothPath(points("smallOnly"))} fill="none" stroke={SERIES_COLORS.small} strokeWidth={2} />}
        {!singleDayMode && isVisible("blendedAverage") && <path d={smoothPath(points("blendedAverage"))} fill="none" stroke={SERIES_COLORS.blended} strokeWidth={2.5} />}

        {/* Data point dots */}
        {(["blendedAverage", "smallOnly", "largeOnly"] as const).map((key) => {
          if (!isVisible(key)) return null;
          const color = key === "blendedAverage" ? SERIES_COLORS.blended : key === "smallOnly" ? SERIES_COLORS.small : SERIES_COLORS.large;
          return points(key).map(([x, y], i) => (
            <circle key={`${key}-${i}`} cx={x} cy={y} r={3} fill={color} />
          ));
        })}

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
          const rows = [
            { label: "Blended average", value: d.blendedAverage, color: SERIES_COLORS.blended, visible: isVisible("blendedAverage") },
            { label: "Small parcels only", value: d.smallOnly, color: SERIES_COLORS.small, visible: isVisible("smallOnly") },
            { label: "Large parcels only", value: d.largeOnly, color: SERIES_COLORS.large, visible: isVisible("largeOnly") },
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
                    {Math.round(r.value)} / hr
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
      </div>

      {/* Legend — vertical column to the right of chart */}
      <div className="flex min-w-[180px] flex-col gap-4 pt-6">
        {[
          { key: "blendedAverage" as const, color: SERIES_COLORS.blended, label: "Blended average", showInfo: true },
          { key: "smallOnly" as const, color: SERIES_COLORS.small, label: "Small parcels only", showInfo: false },
          { key: "largeOnly" as const, color: SERIES_COLORS.large, label: "Large parcels only", showInfo: false },
        ].map(({ key, color, label, showInfo }) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSeries(key)}
              aria-pressed={isVisible(key)}
              className="flex items-center gap-2 rounded-button text-left transition-opacity hover:opacity-80"
            >
              <span
                className="block h-4 w-4 shrink-0 rounded-[4px]"
                style={{ backgroundColor: color, opacity: isVisible(key) ? 1 : 0 }}
              />
              <span className={cn("whitespace-nowrap text-body-md text-ink", !isVisible(key) && "line-through opacity-60")}>{label}</span>
            </button>
            {showInfo && (
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center text-ink-subdued"
                  onMouseEnter={() => setTooltipOpen(true)}
                  onMouseLeave={() => setTooltipOpen(false)}
                >
                  <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                {tooltipOpen && (
                  <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg whitespace-nowrap">
                    <div className="text-body-sm text-white/80">{BLENDED_TOOLTIP}</div>
                    <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
