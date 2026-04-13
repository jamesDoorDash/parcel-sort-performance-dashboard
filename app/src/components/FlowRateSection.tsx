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
  large: chartStateColors.forecasted,
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
};

export function FlowRateSection({ flowRateWeek }: Props) {
  const [itemType, setItemType] = useState<ItemType>("parcels");
  const [parcelStage, setParcelStage] = useState<ParcelStageType>("presort");
  const [summaryRate, setSummaryRate] = useState<SummaryRateType>("average");
  const [parcelFlowMode, setParcelFlowMode] = useState<ParcelFlowMode>("stage");
  const [hiddenSeries, setHiddenSeries] = useState<Set<"blendedAverage" | "smallOnly" | "largeOnly">>(new Set());
  const [tooltipOpen, setTooltipOpen] = useState(false);

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
  const data: FlowRateDayBucket[] = flowRateWeek[currentCombo];
  const n = data.length;
  const slotW = plotW / n;
  const pointX = (i: number) => PAD.left + slotW * i + slotW / 2;

  const points = (key: keyof Pick<FlowRateDayBucket, "blendedAverage" | "smallOnly" | "largeOnly">) =>
    data.map((d, i): [number, number] => [pointX(i), yPx(d[key])]);
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
      "relative -my-px h-[34px] rounded-button px-3 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
      active ? "z-10 border border-ink bg-white text-ink" : "border border-transparent text-ink-subdued hover:text-ink",
    );

  return (
    <section>
      <h2 className="mb-5 text-display-md text-ink">Flow rate</h2>

      {/* Tab rows */}
      <div className="mb-6 flex items-center gap-2">
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
      <div className="flex gap-8">
      <div className="flex-1">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
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

        {/* Series lines */}
        {isVisible("largeOnly") && <path d={smoothPath(points("largeOnly"))} fill="none" stroke={SERIES_COLORS.large} strokeWidth={2} />}
        {isVisible("smallOnly") && <path d={smoothPath(points("smallOnly"))} fill="none" stroke={SERIES_COLORS.small} strokeWidth={2} />}
        {isVisible("blendedAverage") && <path d={smoothPath(points("blendedAverage"))} fill="none" stroke={SERIES_COLORS.blended} strokeWidth={2.5} />}

        {/* Data point dots */}
        {(["blendedAverage", "smallOnly", "largeOnly"] as const).map((key) => {
          if (!isVisible(key)) return null;
          const color = key === "blendedAverage" ? SERIES_COLORS.blended : key === "smallOnly" ? SERIES_COLORS.small : SERIES_COLORS.large;
          return points(key).map(([x, y], i) => (
            <circle key={`${key}-${i}`} cx={x} cy={y} r={3} fill={color} />
          ));
        })}

        {/* Baseline */}
        <line
          x1={PAD.left}
          x2={CHART_W - PAD.right}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke={chartNeutralColors.baseline}
          strokeWidth={1.5}
        />

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
              <span className="relative h-3 w-3 shrink-0">
                <span className="block h-full w-full rounded-[4px]" style={{ backgroundColor: color }} />
                {!isVisible(key) && (
                  <span
                    className="absolute left-1/2 top-1/2 h-[1.5px] w-[18px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink"
                    aria-hidden="true"
                  />
                )}
              </span>
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
                  <div className="absolute bottom-full left-1/2 z-20 mb-2 w-[280px] -translate-x-1/2 rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
                    <div className="text-body-sm-strong text-white">Blended average</div>
                    <div className="mt-0.5 text-body-sm text-white/80">{BLENDED_TOOLTIP}</div>
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
