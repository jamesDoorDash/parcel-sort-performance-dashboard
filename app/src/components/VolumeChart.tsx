import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { DayBucket, MetricConfig, MetricKey } from "../data/mock";
import { getDayStatus } from "../data/mock";
import { cn } from "../lib/cn";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";

type SeriesLabels = {
  processed: string;
  sortedLate?: string;
  lost: string;
  readyToSort: string;
  forecasted: string;
};

type Props = {
  data: DayBucket[]; // always a full Mon–Sun week
  metric: MetricConfig;
  visibleDays?: Set<string>; // ISO date strings that are "in range"
  seriesLabels?: SeriesLabels;
};

const COLORS = {
  processed: chartStateColors.primary,       // blue — sorted on time
  sortedLate: chartStateColors.secondary,    // teal — sorted late
  lost: chartStateColors.bad,                // pink — lost
  readyToSort: chartStateColors.forecasted,  // lavender — ready to sort
  expected: chartStateColors.notCalculated,  // gray — forecasted
  bar: chartStateColors.primary,
  outOfRange: chartNeutralColors.outOfRange,
  pending: chartNeutralColors.pending,
  pendingIcon: chartNeutralColors.ink,
  target: chartNeutralColors.ink,
  axis: chartNeutralColors.axis,
  grid: chartNeutralColors.pending,
};

type ProcessedSeriesKey = "processed" | "sortedLate" | "lost" | "readyToSort" | "expected";

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

const DEFAULT_LABELS: SeriesLabels = {
  processed: "Sorted on time",
  lost: "Lost",
  readyToSort: "Ready to sort",
  forecasted: "Forecasted",
};

export function VolumeChart({ data, metric, visibleDays, seriesLabels }: Props) {
  const labels = seriesLabels ?? DEFAULT_LABELS;
  const isProcessed = metric.key === "processed";
  const singleDayMode = visibleDays?.size === 1;
  const chartData = singleDayMode
    ? data.filter((day) => visibleDays.has(day.date))
    : data;
  const [hiddenSeries, setHiddenSeries] = useState<Set<ProcessedSeriesKey>>(new Set());
  const [hoveredBar, setHoveredBar] = useState<{ idx: number; cx: number; topY: number } | null>(null);
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
              (isSeriesVisible("sortedLate") ? (d.processed.sortedLate ?? 0) : 0) +
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
          overflow="visible"
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
                    <rect
                      x={x}
                      y={topPadding}
                      width={barWidth}
                      height={plotHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredBar({ idx: i, cx, topY: y })}
                      onMouseLeave={() => setHoveredBar(null)}
                      style={{ cursor: "default" }}
                    />
                    {xAxisLabel}
                  </g>
                );
              }

              const processedValue = isSeriesVisible("processed") ? d.processed.processed : 0;
              const sortedLateValue = isSeriesVisible("sortedLate") ? (d.processed.sortedLate ?? 0) : 0;
              const lostValue = isSeriesVisible("lost") ? d.processed.lost : 0;
              const readyValue = isSeriesVisible("readyToSort") ? d.processed.readyToSort : 0;

              // Stack order bottom→top: readyToSort, processed, sortedLate, lost
              const cumAfterReady = readyValue;
              const cumAfterProcessed = cumAfterReady + processedValue;
              const cumAfterLate = cumAfterProcessed + sortedLateValue;
              const visibleTotal = cumAfterLate + lostValue;

              const yReady = scaleY(cumAfterReady);
              const hReady = readyValue > 0 ? topPadding + plotHeight - yReady : 0;

              const yProcessed = scaleY(cumAfterProcessed);
              const hProcessed = processedValue > 0 ? scaleY(cumAfterReady) - yProcessed : 0;

              const yLate = scaleY(cumAfterLate);
              const hLate = sortedLateValue > 0 ? scaleY(cumAfterProcessed) - yLate : 0;

              const yLost = scaleY(visibleTotal);
              const hLost = lostValue > 0 ? scaleY(cumAfterLate) - yLost : 0;

              const labelValue = visibleTotal;
              const labelY = labelValue > 0 ? scaleY(labelValue) - 8 : topPadding + plotHeight - 8;
              const labelText = labelValue > 0 ? labelValue.toLocaleString() : null;

              // Determine which segment is on top (gets rounded corners)
              const segments = [
                { key: "lost", h: hLost },
                { key: "late", h: hLate },
                { key: "processed", h: hProcessed },
                { key: "ready", h: hReady },
              ];
              const topSegment = segments.find((s) => s.h > 0)?.key ?? null;

              return (
                <g key={d.label}>
                  {hReady > 0 && (
                    topSegment === "ready" ? (
                      <path d={roundedTopBarPath(x, yReady, barWidth, hReady, 4)} fill={COLORS.readyToSort} />
                    ) : (
                      <rect x={x} y={yReady} width={barWidth} height={hReady} fill={COLORS.readyToSort} />
                    )
                  )}
                  {hProcessed > 0 && (
                    topSegment === "processed" ? (
                      <path d={roundedTopBarPath(x, yProcessed, barWidth, hProcessed, 4)} fill={COLORS.processed} />
                    ) : (
                      <rect x={x} y={yProcessed} width={barWidth} height={hProcessed} fill={COLORS.processed} />
                    )
                  )}
                  {hLate > 0 && (
                    topSegment === "late" ? (
                      <path d={roundedTopBarPath(x, yLate, barWidth, hLate, 4)} fill={COLORS.sortedLate} />
                    ) : (
                      <rect x={x} y={yLate} width={barWidth} height={hLate} fill={COLORS.sortedLate} />
                    )
                  )}
                  {hLost > 0 && (
                    topSegment === "lost" ? (
                      <path d={roundedTopBarPath(x, yLost, barWidth, hLost, 4)} fill={COLORS.lost} />
                    ) : (
                      <rect x={x} y={yLost} width={barWidth} height={hLost} fill={COLORS.lost} />
                    )
                  )}
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
                  {/* Hover zone */}
                  <rect
                    x={x}
                    y={topPadding}
                    width={barWidth}
                    height={plotHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredBar({ idx: i, cx, topY: labelValue > 0 ? scaleY(labelValue) : topPadding + plotHeight })}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{ cursor: "default" }}
                  />
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

          {/* Tooltip for hovered stacked bar */}
          {hoveredBar && isProcessed &&
            (() => {
              const d = chartData[hoveredBar.idx];
              if (!d) return null;
              const rows = d.isFuture
                ? [
                    { label: labels.forecasted, value: d.processed.expectedVolume, color: COLORS.expected },
                  ].filter((r) => isSeriesVisible("expected") && r.value > 0)
                : [
                    { label: labels.lost, value: d.processed.lost, color: COLORS.lost },
                    { label: labels.sortedLate ?? "Sorted late", value: d.processed.sortedLate ?? 0, color: COLORS.sortedLate },
                    { label: labels.processed, value: d.processed.processed, color: COLORS.processed },
                    { label: labels.readyToSort, value: d.processed.readyToSort, color: COLORS.readyToSort },
                  ].filter((r) => {
                    if (r.value <= 0) return false;
                    if (r.color === COLORS.lost) return isSeriesVisible("lost");
                    if (r.color === COLORS.sortedLate) return isSeriesVisible("sortedLate");
                    if (r.color === COLORS.processed) return isSeriesVisible("processed");
                    if (r.color === COLORS.readyToSort) return isSeriesVisible("readyToSort");
                    return true;
                  });
              if (rows.length === 0) return null;

              const boxW = 200;
              const rowH = 20;
              const padY = 10;
              const padX = 12;
              const boxH = padY * 2 + rows.length * rowH + 18;
              const tailH = 6;
              const gap = 6;
              const ty = hoveredBar.topY - gap - tailH - boxH;
              const tx = Math.max(12, Math.min(hoveredBar.cx - boxW / 2, width - boxW - 12));

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
                        {r.value.toLocaleString()}
                      </text>
                    </g>
                  ))}
                  <polygon
                    points={`${hoveredBar.cx - 5},${ty + boxH} ${hoveredBar.cx + 5},${ty + boxH} ${hoveredBar.cx},${ty + boxH + tailH}`}
                    fill={chartNeutralColors.ink}
                  />
                </g>
              );
            })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex min-w-[180px] items-center">
        <div className="flex flex-col gap-3">
          {isProcessed ? (
            <>
              <LegendItem
                color={COLORS.lost}
                label={labels.lost}
                active={isSeriesVisible("lost")}
                onClick={() => toggleSeries("lost")}
                infoTooltip="Takes 9 days to finalize. Only days with confirmed data are shown"
              />
              <LegendItem
                color={COLORS.sortedLate}
                label={labels.sortedLate ?? "Sorted late"}
                active={isSeriesVisible("sortedLate")}
                onClick={() => toggleSeries("sortedLate")}
              />
              <LegendItem
                color={COLORS.processed}
                label={labels.processed}
                active={isSeriesVisible("processed")}
                onClick={() => toggleSeries("processed")}
              />
              <LegendItem
                color={COLORS.readyToSort}
                label={labels.readyToSort}
                active={isSeriesVisible("readyToSort")}
                onClick={() => toggleSeries("readyToSort")}
              />
              <LegendItem
                color={COLORS.expected}
                label={labels.forecasted}
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
  infoTooltip,
}: {
  color?: string;
  label: string;
  dashed?: boolean;
  outlined?: boolean;
  targetLine?: boolean;
  active?: boolean;
  onClick?: () => void;
  infoTooltip?: string;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
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

  const infoIcon = infoTooltip ? (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setInfoOpen(true)}
      onMouseLeave={() => setInfoOpen(false)}
    >
      <Info className="h-3.5 w-3.5 text-ink-subdued" strokeWidth={1.75} />
      {infoOpen && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[220px] -translate-x-1/2 whitespace-normal rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
          <div className="text-body-sm text-white/80">{infoTooltip}</div>
          <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
        </div>
      )}
    </div>
  ) : null;

  if (onClick) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          className="flex items-center gap-2 rounded-button text-left transition-opacity hover:opacity-80"
        >
          {content}
        </button>
        {infoIcon}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {content}
      {infoIcon}
    </div>
  );
}
