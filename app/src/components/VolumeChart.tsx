import { useMemo, useState } from "react";
import type { DayBucket, MetricConfig, MetricKey } from "../data/mock";
import { getDayStatus } from "../data/mock";
import { cn } from "../lib/cn";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";

type Props = {
  data: DayBucket[]; // always a full Mon–Sun week
  metric: MetricConfig;
  visibleDays?: Set<string>; // ISO date strings that are "in range"
};

const COLORS = {
  processed: chartStateColors.primary,
  lost: chartStateColors.bad,
  readyToSort: chartStateColors.secondary,
  expected: chartStateColors.forecasted,
  bar: chartStateColors.primary,
  outOfRange: chartNeutralColors.outOfRange,
  pending: chartNeutralColors.pending,
  pendingIcon: chartNeutralColors.ink,
  target: chartNeutralColors.ink,
  axis: chartNeutralColors.axis,
  grid: chartNeutralColors.pending,
};

type ProcessedSeriesKey = "processed" | "lost" | "readyToSort" | "expected";

function estimateTooltipWidth(text: string) {
  let width = 0;

  for (const char of text) {
    if ("il1| '".includes(char)) {
      width += 3.8;
      continue;
    }
    if ("fjrt".includes(char)) {
      width += 4.8;
      continue;
    }
    if ("mwMW@#%&".includes(char)) {
      width += 8.8;
      continue;
    }
    if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(char)) {
      width += 7.4;
      continue;
    }
    width += 6.6;
  }

  return width;
}

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
  const singleDayMode = visibleDays?.size === 1;
  const chartData = singleDayMode
    ? data.filter((day) => visibleDays.has(day.date))
    : data;
  const [hiddenSeries, setHiddenSeries] = useState<Set<ProcessedSeriesKey>>(new Set());
  const [hoveredPending, setHoveredPending] = useState<{
    date: string;
    // SVG user-space coords (same as viewBox)
    cx: number;
    cy: number;
  } | null>(null);
  const isSeriesVisible = (series: ProcessedSeriesKey) => !hiddenSeries.has(series);
  const toggleSeries = (series: ProcessedSeriesKey) => {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(series)) next.delete(series);
      else next.add(series);
      return next;
    });
  };

  // ---- Compute y-axis max ----
  const maxValue = useMemo(() => {
    if (isProcessed) {
        const max = Math.max(
        ...chartData.map((d) =>
          Math.max(
            (isSeriesVisible("processed") ? d.processed.processed : 0) +
              (isSeriesVisible("lost") ? d.processed.lost : 0) +
              (isSeriesVisible("readyToSort") ? d.processed.readyToSort : 0),
            isSeriesVisible("expected") ? d.processed.expectedVolume : 0,
          ),
        ),
      );
      if (max <= 0) return 100;
      if (max <= 10) return 10;
      if (max <= 25) return 25;
      if (max <= 50) return 50;
      if (max <= 100) return 100;
      if (max <= 250) return 250;
      if (max <= 500) return 500;
      if (max <= 1000) return 1000;
      return Math.ceil(max / 500) * 500;
    }
    const values = chartData
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
  }, [chartData, metric, isProcessed, hiddenSeries]);

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
          {chartData.map((d, i) => {
            const slot = plotWidth / chartData.length;
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
                fill={inRange ? COLORS.axis : chartNeutralColors.disabled}
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
                if (!isSeriesVisible("expected")) {
                  return <g key={d.label}>{xAxisLabel}</g>;
                }
                const y = scaleY(d.processed.expectedVolume);
                const h = topPadding + plotHeight - y;
                return (
                  <g key={d.label}>
                    <path d={roundedTopBarPath(x, y, barWidth, h, 4)} fill={COLORS.expected} />
                    <ValueLabel cx={cx} y={y - 8} text={d.processed.expectedVolume.toLocaleString()} />
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

              const processedValue = isSeriesVisible("processed") ? d.processed.processed : 0;
              const lostValue = isSeriesVisible("lost") ? d.processed.lost : 0;
              const readyValue = isSeriesVisible("readyToSort") ? d.processed.readyToSort : 0;
              const visibleTotal = processedValue + lostValue + readyValue;
              const yProcessed = scaleY(processedValue);
              const hProcessed = processedValue > 0 ? topPadding + plotHeight - yProcessed : 0;

              const processedAndLost = processedValue + lostValue;
              const yLost = scaleY(processedAndLost);
              const hLost = lostValue > 0 ? scaleY(processedValue) - yLost : 0;

              const yReady = scaleY(visibleTotal);
              const hReady = readyValue > 0 ? scaleY(processedAndLost) - yReady : 0;

              const labelValue = visibleTotal;
              const labelY = labelValue > 0 ? scaleY(labelValue) - 8 : topPadding + plotHeight - 8;
              const labelText = labelValue > 0 ? labelValue.toLocaleString() : null;

              return (
                <g key={d.label}>
                  {(() => {
                    const topSegment = hReady > 0 ? "ready" : hLost > 0 ? "lost" : hProcessed > 0 ? "processed" : null;

                    return (
                      <>
                  {hProcessed > 0 && (
                    topSegment === "processed" ? (
                      <path d={roundedTopBarPath(x, yProcessed, barWidth, hProcessed, 4)} fill={COLORS.processed} />
                    ) : (
                      <rect
                        x={x}
                        y={yProcessed}
                        width={barWidth}
                        height={hProcessed}
                        fill={COLORS.processed}
                      />
                    )
                  )}
                  {hLost > 0 && (
                    topSegment === "lost" ? (
                      <path d={roundedTopBarPath(x, yLost, barWidth, hLost, 4)} fill={COLORS.lost} />
                    ) : (
                      <rect
                        x={x}
                        y={yLost}
                        width={barWidth}
                        height={hLost}
                        fill={COLORS.lost}
                      />
                    )
                  )}
                  {hReady > 0 && (
                    <path d={roundedTopBarPath(x, yReady, barWidth, hReady, 4)} fill={COLORS.readyToSort} />
                  )}
                      </>
                    );
                  })()}
                  {labelText && (
                    <>
                      <ValueLabel cx={cx} y={labelY} text={labelText} />
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
                    </>
                  )}
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
              return <g key={d.label}>{xAxisLabel}</g>;
            }

            // Pending (past not yet baked) OR future days of baked metrics
            // both render as the "not calculated yet" info box.
            if (status === "future") {
              return <g key={d.label}>{xAxisLabel}</g>;
            }

            if (status === "pending") {
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
                <path d={roundedTopBarPath(x, y, barWidth, h, 4)} fill={fill} />
                <ValueLabel cx={cx} y={y - 8} text={metric.format(value)} />
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
            stroke={chartNeutralColors.baseline}
            strokeWidth={1.5}
          />

          {/* Tooltip for hovered pending bar — drawn last to sit on top */}
          {hoveredPending &&
            (() => {
              const text = `Will be calculated on ${formatCalcDate(
                hoveredPending.date,
                metric.bakeDays ?? 0,
              )}`;
              const paddingX = 16;
              const textW = estimateTooltipWidth(text);
              const boxW = textW + paddingX * 2;
              const boxH = 32;
              const edgePadding = 12;
              const iconTop = hoveredPending.cy - 9; // info circle radius
              const tailGap = 6; // clearance between tail tip and icon top
              const tailHeight = 5;
              const boxBottom = iconTop - tailGap - tailHeight;
              const ty = boxBottom - boxH;
              const tx = Math.max(
                edgePadding,
                Math.min(hoveredPending.cx - boxW / 2, width - boxW - edgePadding),
              );
              const textX = tx + boxW / 2;
              return (
                <g pointerEvents="none">
                  <rect
                    x={tx}
                    y={ty}
                    width={boxW}
                    height={boxH}
                    rx={6}
                    fill={chartNeutralColors.ink}
                  />
                  <text
                    x={textX}
                    y={ty + boxH / 2 + 4.5}
                    textAnchor="middle"
                    fill={chartNeutralColors.surface}
                    fontSize={12}
                    fontFamily="Inter, sans-serif"
                    fontWeight={600}
                  >
                    {text}
                  </text>
                  {/* tail */}
                  <polygon
                    points={`${hoveredPending.cx - 5},${ty + boxH} ${hoveredPending.cx + 5},${ty + boxH} ${hoveredPending.cx},${ty + boxH + 5}`}
                    fill={chartNeutralColors.ink}
                  />
                </g>
              );
            })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex min-w-[180px] items-center">
        <div className="flex flex-col gap-4">
          {isProcessed ? (
            <>
              <LegendItem
                color={COLORS.processed}
                label="Processed"
                active={isSeriesVisible("processed")}
                onClick={() => toggleSeries("processed")}
              />
              <LegendItem
                color={COLORS.lost}
                label="Lost"
                active={isSeriesVisible("lost")}
                onClick={() => toggleSeries("lost")}
              />
              <LegendItem
                color={COLORS.readyToSort}
                label="Ready to sort"
                active={isSeriesVisible("readyToSort")}
                onClick={() => toggleSeries("readyToSort")}
              />
              <LegendItem
                color={COLORS.expected}
                label="Forecasted"
                active={isSeriesVisible("expected")}
                onClick={() => toggleSeries("expected")}
              />
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

function LegendItem({
  color,
  label,
  dashed,
  outlined,
  targetLine,
  active = true,
  onClick,
}: {
  color?: string;
  label: string;
  dashed?: boolean;
  outlined?: boolean;
  targetLine?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      {dashed ? (
        <span
          className="relative h-4 w-4 rounded-[4px] border-[1.5px] border-dashed"
          style={{ borderColor: chartNeutralColors.disabled, opacity: active ? 1 : 0 }}
        />
      ) : targetLine ? (
        <span
          className="h-[2px] w-4"
          style={{
            borderTop: `1.5px dashed ${chartNeutralColors.ink}`,
            background: "none",
            opacity: active ? 1 : 0,
          }}
        />
      ) : outlined ? (
        <span
          className="h-4 w-4 rounded-[4px] border-[1.5px]"
          style={{
            background: color,
            borderColor: chartStateColors.primary,
            opacity: active ? 1 : 0,
          }}
        />
      ) : (
        <span
          className="block h-4 w-4 rounded-[4px]"
          style={{ backgroundColor: color, opacity: active ? 1 : 0 }}
        />
      )}
      <span className={cn("text-body-md text-ink", !active && "line-through opacity-60")}>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="flex items-center gap-2 rounded-button text-left transition-opacity hover:opacity-80"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {content}
    </div>
  );
}
