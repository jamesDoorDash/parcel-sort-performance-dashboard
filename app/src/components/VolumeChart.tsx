import { useMemo, useState } from "react";
import type { DayBucket, MetricConfig, MetricKey } from "../data/mock";
import { getDayStatus } from "../data/mock";

type Props = {
  data: DayBucket[]; // always a full Mon–Sun week
  metric: MetricConfig;
  visibleDays?: Set<string>; // ISO date strings that are "in range"
};

const COLORS = {
  processed: "#4969f5",
  lost: "#d91400",
  readyToSort: "#d3d6d9",
  expected: "#aeb1b7",
  bar: "#4969f5",
  outOfRange: "#f1f1f1",
  pending: "#e9eaec",
  pendingIcon: "#111318",
  target: "#111318",
  axis: "#606060",
  grid: "#e9eaec",
};

// Return date that the metric for `dateIso` will be fully calculated,
// formatted like "Feb 15th".
function formatCalcDate(dateIso: string, bakeDays: number): string {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + bakeDays);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${month} ${day}${suffix}`;
}

export function VolumeChart({ data, metric, visibleDays }: Props) {
  const isProcessed = metric.key === "processed";
  const [hoveredPending, setHoveredPending] = useState<{
    date: string;
    // SVG user-space coords (same as viewBox)
    cx: number;
    cy: number;
  } | null>(null);

  // ---- Compute y-axis max ----
  const maxValue = useMemo(() => {
    if (isProcessed) {
      const max = Math.max(
        ...data.map((d) =>
          Math.max(
            d.processed.processed + d.processed.lost + d.processed.readyToSort,
            d.processed.expectedVolume,
          ),
        ),
      );
      return Math.max(Math.ceil(max / 500) * 500, 2500);
    }
    const values = data
      .map((d) => d.values[metric.key as MetricKey])
      .filter((v): v is number => typeof v === "number");
    // High-% metrics (target > 80%): lock Y axis to 0–100%.
    if (metric.unit === "percent" && metric.target > 80) {
      return 100;
    }
    // Low-% metrics (missort, loss): fit tightly to max.
    if (metric.unit === "percent") {
      const max = Math.max(...values, metric.target);
      if (max <= 0.1) return 0.1;
      if (max <= 0.5) return 0.5;
      if (max <= 1) return 1;
      if (max <= 5) return 5;
      return 10;
    }
    // Rate metrics (/hr): fit the Y axis tightly to the max data value,
    // rounded up to the nearest 10.
    const rawMax = Math.max(...values, metric.target);
    return Math.ceil(rawMax / 10) * 10;
  }, [data, metric, isProcessed]);

  const ticks = useMemo(() => {
    const step = maxValue / 5;
    return Array.from({ length: 6 }, (_, i) => Math.round(i * step * 100) / 100);
  }, [maxValue]);

  // Chart geometry
  const height = 260;
  const topPadding = 24;
  const bottomPadding = 32;
  const leftPadding = 56;
  const rightPadding = 16;
  const width = 900;
  const plotHeight = height - topPadding - bottomPadding;
  const plotWidth = width - leftPadding - rightPadding;

  const scaleY = (value: number) => topPadding + plotHeight - (value / maxValue) * plotHeight;

  const formatTick = (v: number) => {
    if (metric.unit === "count") return v.toLocaleString();
    if (metric.unit === "percent") return `${v}%`;
    return `${v}`;
  };

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${metric.label} by day`}
        >
          {/* Grid + y-axis labels (dashed lines only, baseline drawn last) */}
          {ticks.map((t, i) => {
            if (t === 0) {
              // Labels for the baseline — draw text now, line later
              return (
                <text
                  key={`tick-label-${i}`}
                  x={leftPadding - 12}
                  y={scaleY(t) + 4}
                  textAnchor="end"
                  fill={COLORS.axis}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {formatTick(t)}
                </text>
              );
            }
            const y = scaleY(t);
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={leftPadding}
                  x2={width - rightPadding}
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
                  {formatTick(t)}
                </text>
              </g>
            );
          })}

          {/* Target line (non-processed) */}
          {!isProcessed && (
            <line
              x1={leftPadding}
              x2={width - rightPadding}
              y1={scaleY(metric.target)}
              y2={scaleY(metric.target)}
              stroke={COLORS.target}
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
          )}

          {/* Bars */}
          {data.map((d, i) => {
            const slot = plotWidth / data.length;
            const barWidth = 44;
            const cx = leftPadding + slot * i + slot / 2;
            const x = cx - barWidth / 2;
            const inRange = !visibleDays || visibleDays.has(d.date);

            // Common label
            const xAxisLabel = (
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                fill={inRange ? COLORS.axis : "#c5c7cc"}
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontWeight={500}
              >
                {d.label}
              </text>
            );

            // ---- OUT OF RANGE: render a faint outline only, no label value ----
            if (!inRange) {
              const y = scaleY(maxValue * 0.1);
              const h = topPadding + plotHeight - y;
              return (
                <g key={d.label}>
                  <rect
                    x={x}
                    y={topPadding + plotHeight - 4}
                    width={barWidth}
                    height={4}
                    fill={COLORS.outOfRange}
                  />
                  {xAxisLabel}
                  {/* silence unused warning */}
                  <g opacity={0}>
                    <rect x={0} y={y} width={0} height={h} />
                  </g>
                </g>
              );
            }

            // ---- PROCESSED: stacked bar ----
            if (isProcessed) {
              if (d.isFuture) {
                const y = scaleY(d.processed.expectedVolume);
                const h = topPadding + plotHeight - y;
                return (
                  <g key={d.label}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      fill="#ffffff"
                      stroke={COLORS.expected}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                    <text
                      x={cx}
                      y={y - 8}
                      textAnchor="middle"
                      fill={COLORS.axis}
                      fontSize={12}
                      fontFamily="Inter, sans-serif"
                      fontWeight={600}
                    >
                      {d.processed.expectedVolume.toLocaleString()}
                    </text>
                    {xAxisLabel}
                  </g>
                );
              }

              const total = d.processed.processed + d.processed.lost + d.processed.readyToSort;
              const yProcessed = scaleY(d.processed.processed);
              const hProcessed = topPadding + plotHeight - yProcessed;

              const yLost = scaleY(d.processed.processed + d.processed.lost);
              const hLost = scaleY(d.processed.processed) - yLost;

              const yReady = scaleY(
                d.processed.processed + d.processed.lost + d.processed.readyToSort,
              );
              const hReady = scaleY(d.processed.processed + d.processed.lost) - yReady;

              const labelY = scaleY(total) - 8;
              const labelText = d.isPartial
                ? d.processed.expectedVolume.toLocaleString()
                : total.toLocaleString();

              return (
                <g key={d.label}>
                  {hProcessed > 0 && (
                    <rect
                      x={x}
                      y={yProcessed}
                      width={barWidth}
                      height={hProcessed}
                      fill={COLORS.processed}
                      
                    />
                  )}
                  {hLost > 0 && (
                    <rect
                      x={x}
                      y={yLost}
                      width={barWidth}
                      height={hLost}
                      fill={COLORS.lost}
                      
                    />
                  )}
                  {hReady > 0 && (
                    <rect
                      x={x}
                      y={yReady}
                      width={barWidth}
                      height={hReady}
                      fill={COLORS.readyToSort}
                      
                    />
                  )}
                  <text
                    x={cx}
                    y={labelY}
                    textAnchor="middle"
                    fill={COLORS.axis}
                    fontSize={12}
                    fontFamily="Inter, sans-serif"
                    fontWeight={600}
                  >
                    {labelText}
                  </text>
                  {xAxisLabel}
                </g>
              );
            }

            // ---- OTHER METRICS: simple bar ----
            const value = d.values[metric.key as MetricKey];
            const status = getDayStatus(metric.key as MetricKey, d.date);
            const hasBake = (metric.bakeDays ?? 0) > 0;

            // Future days with NO bake time: flat tick on the baseline
            if ((d.isFuture || status === "future") && !hasBake) {
              return (
                <g key={d.label}>
                  <rect
                    x={x}
                    y={topPadding + plotHeight - 4}
                    width={barWidth}
                    height={4}
                    fill={COLORS.outOfRange}
                  />
                  {xAxisLabel}
                </g>
              );
            }

            // Pending (past not yet baked) OR future days of baked metrics
            // both render as the "not calculated yet" info box.
            if (status === "pending" || (hasBake && status === "future")) {
              const boxY = topPadding;
              const boxHeight = plotHeight;
              const centerY = boxY + boxHeight / 2;
              return (
                <g
                  key={d.label}
                  onMouseEnter={() =>
                    setHoveredPending({ date: d.date, cx, cy: centerY })
                  }
                  onMouseLeave={() => setHoveredPending(null)}
                  style={{ cursor: "help" }}
                >
                  <rect
                    x={x}
                    y={boxY}
                    width={barWidth}
                    height={boxHeight}
                    fill={COLORS.pending}
                  />
                  {/* Info glyph (circle + "i") */}
                  <circle
                    cx={cx}
                    cy={centerY}
                    r={9}
                    fill="none"
                    stroke={COLORS.pendingIcon}
                    strokeWidth={1.75}
                  />
                  <circle cx={cx} cy={centerY - 3.5} r={1.1} fill={COLORS.pendingIcon} />
                  <line
                    x1={cx}
                    y1={centerY - 0.5}
                    x2={cx}
                    y2={centerY + 4.5}
                    stroke={COLORS.pendingIcon}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                  />
                  {xAxisLabel}
                </g>
              );
            }

            if (value == null) {
              return (
                <g key={d.label}>
                  <rect
                    x={x}
                    y={topPadding + plotHeight - 4}
                    width={barWidth}
                    height={4}
                    fill={COLORS.outOfRange}
                  />
                  {xAxisLabel}
                </g>
              );
            }

            const y = scaleY(value);
            const h = topPadding + plotHeight - y;
            const belowTarget =
              metric.unit === "percent" && (metric.key === "missort" || metric.key === "loss")
                ? value > metric.target // lower is better
                : value < metric.target;

            const fill = belowTarget ? COLORS.lost : COLORS.bar;

            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  fill={fill}
                />
                <text
                  x={cx}
                  y={y - 8}
                  textAnchor="middle"
                  fill={COLORS.axis}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={600}
                >
                  {metric.format(value)}
                </text>
                {xAxisLabel}
              </g>
            );
          })}

          {/* Baseline — drawn last so it sits on top of every bar's bottom edge */}
          <line
            x1={leftPadding}
            x2={width - rightPadding}
            y1={scaleY(0)}
            y2={scaleY(0)}
            stroke="#6c707a"
            strokeWidth={1.5}
          />

          {/* Tooltip for hovered pending bar — drawn last to sit on top */}
          {hoveredPending &&
            (() => {
              const text = `Will be calculated on ${formatCalcDate(
                hoveredPending.date,
                metric.bakeDays ?? 0,
              )}`;
              const paddingX = 12;
              const paddingY = 8;
              const charW = 6.2; // approx
              const textW = text.length * charW;
              const boxW = textW + paddingX * 2;
              const boxH = 28;
              const tx = hoveredPending.cx - boxW / 2;
              const ty = hoveredPending.cy - 36;
              return (
                <g pointerEvents="none">
                  <rect
                    x={tx}
                    y={ty}
                    width={boxW}
                    height={boxH}
                    rx={6}
                    fill="#111318"
                  />
                  <text
                    x={hoveredPending.cx}
                    y={ty + boxH / 2 + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={12}
                    fontFamily="Inter, sans-serif"
                    fontWeight={600}
                  >
                    {text}
                  </text>
                  {/* tail */}
                  <polygon
                    points={`${hoveredPending.cx - 5},${ty + boxH} ${hoveredPending.cx + 5},${ty + boxH} ${hoveredPending.cx},${ty + boxH + 5}`}
                    fill="#111318"
                  />
                </g>
              );
            })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex min-w-[180px] flex-col gap-4 pt-6">
        {isProcessed ? (
          <>
            <LegendItem color={COLORS.processed} label="Processed" />
            <LegendItem color={COLORS.lost} label="Lost" />
            <LegendItem color={COLORS.readyToSort} label="Ready to sort" />
            <LegendItem dashed label="Expected volume" />
          </>
        ) : (
          <>
            <LegendItem color={COLORS.bar} label={metric.label} />
            <LegendItem color={COLORS.lost} label="Below target" />
            {(metric.bakeDays ?? 0) > 0 && (
              <LegendItem color={COLORS.pending} label="Not calculated yet" />
            )}
            <LegendItem targetLine label={`Target ${metric.format(metric.target)}`} />
          </>
        )}
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed,
  outlined,
  targetLine,
}: {
  color?: string;
  label: string;
  dashed?: boolean;
  outlined?: boolean;
  targetLine?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <span
          className="h-3 w-3 border-[1.5px] border-dashed"
          style={{ borderColor: "#aeb1b7" }}
        />
      ) : targetLine ? (
        <span
          className="h-[2px] w-4"
          style={{
            borderTop: "1.5px dashed #111318",
            background: "none",
          }}
        />
      ) : outlined ? (
        <span
          className="h-3 w-3 border-[1.5px]"
          style={{ background: color, borderColor: "#4969f5" }}
        />
      ) : (
        <span className="h-3 w-3" style={{ backgroundColor: color }} />
      )}
      <span className="text-body-md text-ink">{label}</span>
    </div>
  );
}
