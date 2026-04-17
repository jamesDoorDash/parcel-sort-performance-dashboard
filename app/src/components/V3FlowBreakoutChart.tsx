import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import type { FlowRateDayBucket } from "../data/mockV2";
import { cn } from "../lib/cn";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";

const width = 900;
const height = 260;
const topPadding = 24;
const bottomPadding = 32;
const leftPadding = 56;
const rightPadding = 16;
const plotHeight = height - topPadding - bottomPadding;
const plotWidth = width - leftPadding - rightPadding;
const BAR_W = 20;
const BAR_GAP = 8;

const SERIES = [
  { key: "blendedAverage", label: "Weighted rate", color: chartStateColors.primary, showInfo: true },
  { key: "smallOnly", label: "Small parcels only", color: chartStateColors.secondary, showInfo: false },
  { key: "largeOnly", label: "Large parcels only", color: chartStateColors.forecasted, showInfo: false },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];
const WEIGHTED_RATE_TOOLTIP = "2lb+ parcels count 1.8x.";

type Props = {
  data: FlowRateDayBucket[];
  visibleDays?: Set<string>;
};

export function V3FlowBreakoutChart({ data, visibleDays }: Props) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set());
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const chartData = data;

  const visibleSeries = SERIES.filter((series) => !hiddenSeries.has(series.key));
  const yMax = useMemo(() => {
    const values = chartData.flatMap((day) =>
      SERIES
        .filter((series) => !hiddenSeries.has(series.key))
        .map((series) => day[series.key]),
    );
    const maxValue = Math.max(...values, 1);
    if (maxValue <= 50) return 50;
    if (maxValue <= 100) return 100;
    if (maxValue <= 150) return 150;
    if (maxValue <= 200) return 200;
    return Math.ceil(maxValue / 25) * 25;
  }, [chartData, hiddenSeries]);

  const ticks = Array.from({ length: 6 }, (_, index) => (yMax / 5) * index);
  const yPx = (value: number) => topPadding + plotHeight - (value / yMax) * plotHeight;

  const toggleSeries = (key: SeriesKey) => {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {ticks.map((tick) => {
            const y = yPx(tick);
            return (
              <g key={tick}>
                {tick > 0 && (
                  <line
                    x1={leftPadding}
                    x2={leftPadding + plotWidth}
                    y1={y}
                    y2={y}
                    stroke={chartNeutralColors.pending}
                    strokeDasharray="2 4"
                    strokeWidth={1}
                  />
                )}
                <text
                  x={leftPadding - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill={chartNeutralColors.axis}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {tick === 0 ? "0" : Math.round(tick)}
                </text>
              </g>
            );
          })}

          {chartData.map((day, index) => {
            const slot = plotWidth / chartData.length;
            const cx = leftPadding + slot * index + slot / 2;
            const inRange = !visibleDays || visibleDays.has(day.date);
            const activeSeries = visibleSeries;
            const groupWidth = activeSeries.length * BAR_W + Math.max(0, activeSeries.length - 1) * BAR_GAP;
            const startX = cx - groupWidth / 2;

            return (
              <g key={day.date}>
                {inRange && !day.date.endsWith("15") && activeSeries.map((series, seriesIndex) => {
                  const value = day[series.key];
                  const x = startX + seriesIndex * (BAR_W + BAR_GAP);
                  const y = yPx(value);
                  const barHeight = topPadding + plotHeight - y;

                  return (
                    <g key={series.key}>
                      <path d={roundedTopBarPath(x, y, BAR_W, barHeight, 4)} fill={series.color} />
                      <ValueLabel cx={x + BAR_W / 2} y={y - 8} text={String(Math.round(value))} />
                      <text
                        x={x + BAR_W / 2}
                        y={y - 8}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={600}
                        fill={chartNeutralColors.axis}
                        fontFamily="Inter, sans-serif"
                      >
                        {Math.round(value)}
                      </text>
                    </g>
                  );
                })}

                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  fill={inRange ? chartNeutralColors.axis : chartNeutralColors.disabled}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {day.label}
                </text>
              </g>
            );
          })}

          <line
            x1={leftPadding}
            x2={leftPadding + plotWidth}
            y1={topPadding + plotHeight}
            y2={topPadding + plotHeight}
            stroke={chartNeutralColors.baseline}
            strokeWidth={1.5}
          />
        </svg>
      </div>

      <div className="flex min-w-[180px] items-center">
        <div className="flex flex-col gap-4">
          {SERIES.map((series) => {
            const active = !hiddenSeries.has(series.key);
            return (
              <div key={series.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSeries(series.key)}
                  aria-pressed={active}
                  className="flex items-center gap-2 rounded-button text-left transition-opacity hover:opacity-80"
                >
                  <span
                    className="block h-4 w-4 rounded-[4px]"
                    style={{ backgroundColor: series.color, opacity: active ? 1 : 0 }}
                  />
                  <span className={cn("text-body-md text-ink", !active && "line-through opacity-60")}>
                    {series.label}
                  </span>
                </button>
                {series.showInfo && (
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
                        <div className="text-body-sm text-white/80">{WEIGHTED_RATE_TOOLTIP}</div>
                        <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ValueLabel({ cx, y, text }: { cx: number; y: number; text: string }) {
  const width = estimateLabelWidth(text);

  return (
    <rect
      x={cx - width / 2}
      y={y - 11}
      width={width}
      height={16}
      rx={4}
      fill="white"
    />
  );
}

function estimateLabelWidth(text: string) {
  return Math.max(28, text.length * 6.8 + 10);
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
