import { useState } from "react";
import type { WaitingDayBucket } from "../data/mockV2";
import { cn } from "../lib/cn";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";

const COLORS = {
  waitingForSort: chartStateColors.primary,
  waitingOnPallet: chartStateColors.secondary,
  future: chartNeutralColors.pending,
  baseline: chartNeutralColors.baseline,
  axisText: chartNeutralColors.axis,
  gridLine: chartNeutralColors.pending,
  labelText: chartNeutralColors.axis,
};

// Match VolumeChart geometry exactly
const width = 900;
const height = 260;
const topPadding = 24;
const bottomPadding = 32;
const leftPadding = 56;
const rightPadding = 16;
const plotHeight = height - topPadding - bottomPadding;
const plotWidth = width - leftPadding - rightPadding;
const BAR_W = 44; // fixed, same as V1

const Y_MAX = 250;
const Y_TICKS = [0, 50, 100, 150, 200, 250];

type Props = {
  data: WaitingDayBucket[];
  visibleDays?: Set<string>;
};

export function WaitingStackChart({ data, visibleDays }: Props) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<"waitingForSort" | "waitingOnPallet">>(new Set());
  const singleDayMode = visibleDays?.size === 1;
  const chartData = singleDayMode
    ? data.filter((day) => visibleDays.has(day.date))
    : data;
  const n = chartData.length;
  const isVisible = (series: "waitingForSort" | "waitingOnPallet") => !hiddenSeries.has(series);
  const toggleSeries = (series: "waitingForSort" | "waitingOnPallet") => {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(series)) next.delete(series);
      else next.add(series);
      return next;
    });
  };

  function yPx(val: number) {
    return topPadding + plotHeight - (val / Y_MAX) * plotHeight;
  }

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {/* Grid lines + y-axis labels */}
          {Y_TICKS.map((tick) => {
            if (tick === 0) {
              return (
                <text
                  key={tick}
                  x={leftPadding - 12}
                  y={yPx(tick) + 4}
                  textAnchor="end"
                  fill={COLORS.axisText}
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
              <g key={tick}>
                <line
                  x1={leftPadding}
                  x2={leftPadding + plotWidth}
                  y1={y}
                  y2={y}
                  stroke={COLORS.gridLine}
                  strokeDasharray="2 4"
                  strokeWidth={1}
                />
                <text
                  x={leftPadding - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill={COLORS.axisText}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((day, i) => {
            const inRange = !visibleDays || visibleDays.has(day.date);
            const isFuture = !!day.isFuture;
            const slot = plotWidth / n;
            const cx = leftPadding + slot * i + slot / 2;
            const x = cx - BAR_W / 2;

            const xAxisLabel = (
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                fill={inRange ? COLORS.axisText : chartNeutralColors.disabled}
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontWeight={500}
              >
                {day.label}
              </text>
            );

            // Out-of-range: faint tick stub, no data
            if (!inRange) {
              return (
                <g key={day.date}>
                  <rect
                    x={x}
                    y={topPadding + plotHeight - 4}
                    width={BAR_W}
                    height={4}
                    fill={COLORS.future}
                  />
                  {xAxisLabel}
                </g>
              );
            }

            // Future day: solid grey bar, no label
            if (isFuture) {
              return <g key={day.date}>{xAxisLabel}</g>;
            }

            // Normal stacked bar
            const waitingForSort = isVisible("waitingForSort") ? day.waitingForSort : 0;
            const waitingOnPallet = isVisible("waitingOnPallet") ? day.waitingOnPallet : 0;
            const total = waitingForSort + waitingOnPallet;
            const sortH = (waitingForSort / Y_MAX) * plotHeight;
            const palletH = (waitingOnPallet / Y_MAX) * plotHeight;
            const sortY = topPadding + plotHeight - sortH;
            const palletY = sortY - palletH;

            return (
              <g key={day.date}>
                {/* Waiting for sort (bottom) */}
                {sortH > 0 && (
                  palletH > 0 ? (
                    <rect x={x} y={sortY} width={BAR_W} height={sortH} fill={COLORS.waitingForSort} />
                  ) : (
                    <path d={roundedTopBarPath(x, sortY, BAR_W, sortH, 4)} fill={COLORS.waitingForSort} />
                  )
                )}
                {/* Waiting on pallet (top) */}
                {palletH > 0 && (
                  <path d={roundedTopBarPath(x, palletY, BAR_W, palletH, 4)} fill={COLORS.waitingOnPallet} />
                )}
                {/* Total label above bar */}
                {total > 0 && (
                  <>
                    <ValueLabel cx={cx} y={(palletH > 0 ? palletY : sortY) - 8} text={String(total)} />
                    <text
                      x={cx}
                      y={(palletH > 0 ? palletY : sortY) - 8}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill={COLORS.labelText}
                      fontFamily="Inter, sans-serif"
                    >
                      {total}
                    </text>
                  </>
                )}
                {xAxisLabel}
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={leftPadding}
            x2={leftPadding + plotWidth}
            y1={topPadding + plotHeight}
            y2={topPadding + plotHeight}
            stroke={COLORS.baseline}
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {/* Legend — matches VolumeChart side legend layout */}
      <div className="flex min-w-[180px] items-center">
        <div className="flex flex-col gap-4">
          <LegendToggle
            color={COLORS.waitingOnPallet}
            label="Dwell on pallet"
            active={isVisible("waitingOnPallet")}
            onClick={() => toggleSeries("waitingOnPallet")}
          />
          <LegendToggle
            color={COLORS.waitingForSort}
            label="Dwell before sort"
            active={isVisible("waitingForSort")}
            onClick={() => toggleSeries("waitingForSort")}
          />
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
      <span className="relative h-4 w-4 shrink-0 rounded-[4px]">
        <span className="block h-full w-full rounded-[4px]" style={{ backgroundColor: color, opacity: active ? 1 : 0 }} />
      </span>
      <span className={cn("text-body-md text-ink", !active && "line-through opacity-60")}>{label}</span>
    </button>
  );
}
