import { useMemo, useState } from "react";
import { TODAY_ISO, getDayStatus, type MetricKey } from "../data/mock";
import type { ErrorBreakdownDayBucket } from "../data/mockV2";
import { cn } from "../lib/cn";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";

type ErrorSeriesKey = "anyError" | "sortedLate" | "lost" | "missorted";

const COLORS = {
  anyError: chartStateColors.primary,
  sortedLate: chartStateColors.forecasted,
  lost: chartStateColors.bad,
  missorted: chartStateColors.secondary,
  pending: chartNeutralColors.pending,
  pendingIcon: chartNeutralColors.ink,
  axis: chartNeutralColors.axis,
  grid: chartNeutralColors.pending,
  baseline: chartNeutralColors.baseline,
  future: chartNeutralColors.outOfRange,
};

const width = 900;
const height = 260;
const topPadding = 24;
const bottomPadding = 32;
const leftPadding = 56;
const rightPadding = 16;
const plotHeight = height - topPadding - bottomPadding;
const plotWidth = width - leftPadding - rightPadding;
const BAR_W = 12;
const SERIES_GAP = 4;

const PARCEL_SERIES: {
  key: ErrorSeriesKey;
  label: string;
  color: string;
  bakeMetricKey?: MetricKey;
}[] = [
  { key: "anyError", label: "Any error", color: COLORS.anyError },
  { key: "sortedLate", label: "Sorted late", color: COLORS.sortedLate },
  { key: "lost", label: "Lost", color: COLORS.lost, bakeMetricKey: "loss" },
  { key: "missorted", label: "Missorted", color: COLORS.missorted, bakeMetricKey: "missort" },
];

const PALLET_SERIES: {
  key: ErrorSeriesKey;
  label: string;
  color: string;
  bakeMetricKey?: MetricKey;
}[] = [
  { key: "anyError", label: "Any error", color: COLORS.anyError },
  { key: "sortedLate", label: "Loaded late", color: COLORS.sortedLate },
  { key: "missorted", label: "Misloaded", color: COLORS.missorted },
];

function formatCalcDate(dateIso: string, bakeDays: number) {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + bakeDays);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

type Props = {
  data: ErrorBreakdownDayBucket[];
  mode: "parcel" | "pallet";
  visibleDays?: Set<string>;
};

export function ErrorBreakdownChart({ data, mode, visibleDays }: Props) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<ErrorSeriesKey>>(new Set());
  const [hoveredPending, setHoveredPending] = useState<{
    cx: number;
    cy: number;
    text: string;
  } | null>(null);
  const series = mode === "parcel" ? PARCEL_SERIES : PALLET_SERIES;
  const visibleSeries = series.filter((seriesDef) => !hiddenSeries.has(seriesDef.key));
  const isVisible = (seriesKey: ErrorSeriesKey) => !hiddenSeries.has(seriesKey);
  const toggleSeries = (seriesKey: ErrorSeriesKey) => {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(seriesKey)) next.delete(seriesKey);
      else next.add(seriesKey);
      return next;
    });
  };

  const yMax = useMemo(() => {
    const max = Math.max(
      0,
      ...data.flatMap((day) => visibleSeries.map((seriesDef) => day[seriesDef.key])),
    );
    return Math.max(50, Math.ceil(max / 50) * 50);
  }, [data, visibleSeries]);

  const yTicks = useMemo(() => {
    const step = yMax / 5;
    return Array.from({ length: 6 }, (_, i) => i * step);
  }, [yMax]);

  const scaleY = (value: number) => topPadding + plotHeight - (value / yMax) * plotHeight;

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${mode === "parcel" ? "Parcel" : "Pallet"} error breakdown by day`}
        >
          {yTicks.map((tick) => {
            if (tick === 0) {
              return (
                <text
                  key={tick}
                  x={leftPadding - 12}
                  y={scaleY(tick) + 4}
                  textAnchor="end"
                  fill={COLORS.axis}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {tick}
                </text>
              );
            }

            const y = scaleY(tick);
            return (
              <g key={tick}>
                <line
                  x1={leftPadding}
                  x2={leftPadding + plotWidth}
                  y1={y}
                  y2={y}
                  stroke={COLORS.grid}
                  strokeDasharray="2 4"
                  strokeWidth={1}
                />
                <text
                  x={leftPadding - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill={COLORS.axis}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          {data.map((day, i) => {
            const inRange = !visibleDays || visibleDays.has(day.date);
            const slot = plotWidth / data.length;
            const groupWidth = series.length * BAR_W + (series.length - 1) * SERIES_GAP;
            const groupX = leftPadding + slot * i + (slot - groupWidth) / 2;
            const cx = groupX + groupWidth / 2;
            const labelColor = inRange ? COLORS.axis : chartNeutralColors.disabled;

            const xAxisLabel = (
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                fill={labelColor}
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontWeight={500}
              >
                {day.label}
              </text>
            );

            if (!inRange) {
              return (
                <g key={day.date}>
                  {series.map((seriesDef, seriesIndex) => (
                    <rect
                      key={seriesDef.key}
                      x={groupX + seriesIndex * (BAR_W + SERIES_GAP)}
                      y={topPadding + plotHeight - 4}
                      width={BAR_W}
                      height={4}
                      fill={COLORS.future}
                    />
                  ))}
                  {xAxisLabel}
                </g>
              );
            }

            return (
              <g key={day.date}>
                {series.map((seriesDef, seriesIndex) => {
                  if (!isVisible(seriesDef.key)) return null;
                  const x = groupX + seriesIndex * (BAR_W + SERIES_GAP);
                  const barCx = x + BAR_W / 2;
                  const status = seriesDef.bakeMetricKey
                    ? getDayStatus(seriesDef.bakeMetricKey, day.date)
                    : day.date > TODAY_ISO
                      ? "future"
                      : "calculated";

                  if (status === "pending" || status === "future") {
                    if (!seriesDef.bakeMetricKey) {
                      return (
                        <rect
                          key={seriesDef.key}
                          x={x}
                          y={topPadding + plotHeight - 4}
                          width={BAR_W}
                          height={4}
                          fill={COLORS.future}
                        />
                      );
                    }

                    const centerY = topPadding + plotHeight / 2;
                    const calcText = `Will be calculated on ${formatCalcDate(
                      day.date,
                      seriesDef.bakeMetricKey === "loss" ? 9 : 1,
                    )}`;

                    return (
                      <g
                        key={seriesDef.key}
                        onMouseEnter={() => setHoveredPending({ cx: barCx, cy: centerY, text: calcText })}
                        onMouseLeave={() => setHoveredPending(null)}
                        style={{ cursor: "help" }}
                      >
                        <rect
                          x={x}
                          y={topPadding}
                          width={BAR_W}
                          height={plotHeight}
                          fill={COLORS.pending}
                        />
                        <circle
                          cx={barCx}
                          cy={centerY}
                          r={4.5}
                          fill="none"
                          stroke={COLORS.pendingIcon}
                          strokeWidth={1.25}
                        />
                        <circle cx={barCx} cy={centerY - 1.6} r={0.7} fill={COLORS.pendingIcon} />
                        <line
                          x1={barCx}
                          y1={centerY - 0.2}
                          x2={barCx}
                          y2={centerY + 2.3}
                          stroke={COLORS.pendingIcon}
                          strokeWidth={1.1}
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  }

                  const value = day[seriesDef.key];
                  const y = scaleY(value);
                  const h = topPadding + plotHeight - y;

                  return (
                    <rect
                      key={seriesDef.key}
                      x={x}
                      y={y}
                      width={BAR_W}
                      height={h}
                      fill={seriesDef.color}
                    />
                  );
                })}

                {(() => {
                  const labelSeries = visibleSeries.find((seriesDef) => seriesDef.key === "anyError") ?? visibleSeries[0];
                  if (!labelSeries) return null;
                  const labelIndex = series.findIndex((seriesDef) => seriesDef.key === labelSeries.key);
                  const labelValue = day[labelSeries.key];
                  return (
                    <text
                      x={groupX + labelIndex * (BAR_W + SERIES_GAP) + BAR_W / 2}
                      y={scaleY(labelValue) - 8}
                      textAnchor="middle"
                      fill={COLORS.axis}
                      fontSize={12}
                      fontFamily="Inter, sans-serif"
                      fontWeight={600}
                    >
                      {labelValue}
                    </text>
                  );
                })()}
                {xAxisLabel}
              </g>
            );
          })}

          <line
            x1={leftPadding}
            x2={leftPadding + plotWidth}
            y1={topPadding + plotHeight}
            y2={topPadding + plotHeight}
            stroke={COLORS.baseline}
            strokeWidth={1.5}
          />

          {hoveredPending && (
            (() => {
              const boxW = 152;
              const boxH = 28;
              const edgePadding = 8;
              const boxX = Math.max(
                edgePadding,
                Math.min(hoveredPending.cx - boxW / 2, width - boxW - edgePadding),
              );
              const textX = boxX + boxW / 2;

              return (
                <g pointerEvents="none">
              <rect
                x={boxX}
                y={hoveredPending.cy - 52}
                width={boxW}
                height={boxH}
                rx={6}
                fill={chartNeutralColors.ink}
              />
              <text
                x={textX}
                y={hoveredPending.cy - 34}
                textAnchor="middle"
                fill={chartNeutralColors.surface}
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontWeight={600}
              >
                {hoveredPending.text}
              </text>
              <polygon
                points={`${hoveredPending.cx - 5},${hoveredPending.cy - 24} ${hoveredPending.cx + 5},${hoveredPending.cy - 24} ${hoveredPending.cx},${hoveredPending.cy - 19}`}
                fill={chartNeutralColors.ink}
              />
            </g>
              );
            })()
          )}
        </svg>
      </div>

      <div className="flex min-w-[180px] flex-col gap-4 pt-6">
        {series.map((seriesDef) => (
          <LegendToggle
            key={seriesDef.key}
            color={seriesDef.color}
            label={seriesDef.label}
            active={isVisible(seriesDef.key)}
            onClick={() => toggleSeries(seriesDef.key)}
          />
        ))}
      </div>
    </div>
  );
}

function LegendToggle({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-2 rounded-button text-left transition-opacity hover:opacity-80"
    >
      <span className="relative h-3 w-3 rounded-[3px]">
        <span className="block h-full w-full rounded-[3px]" style={{ backgroundColor: color }} />
        {!active && (
          <span
            className="absolute left-1/2 top-1/2 h-[1.5px] w-[18px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink"
            aria-hidden="true"
          />
        )}
      </span>
      <span className={cn("text-body-md text-ink", !active && "line-through opacity-60")}>{label}</span>
    </button>
  );
}
