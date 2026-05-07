import { useMemo, useState } from "react";
import { Info, Trash2 } from "lucide-react";
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
  simpleLegend?: { color: string; label: string };
  secondaryBars?: { values: number[]; color: string; label: string };
  // An additional series stacked on top of the existing lost segment (e.g. "Runner returns" on spoke).
  extraTopStack?: { values: number[]; color: string; label: string };
  colorOverrides?: Partial<Record<"processed" | "sortedLate" | "lost" | "readyToSort" | "expected", string>>;
  // Hide the Lost data category entirely (chart segments + legend + tooltip).
  hideLost?: boolean;
  // Hide the Forecasted data category entirely (chart segments + legend + tooltip).
  hideForecasted?: boolean;
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

export function VolumeChart({ data, metric, visibleDays, seriesLabels, simpleLegend, secondaryBars, extraTopStack, colorOverrides, hideLost, hideForecasted }: Props) {
  const labels = seriesLabels ?? DEFAULT_LABELS;
  const colors = colorOverrides ? { ...COLORS, ...colorOverrides } : COLORS;
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
  const [hoveredSeries, setHoveredSeries] = useState<ProcessedSeriesKey | null>(null);
  const [secondaryHidden, setSecondaryHidden] = useState(false);
  const [hoveredSecondary, setHoveredSecondary] = useState(false);
  const [extraHidden, setExtraHidden] = useState(false);
  const allProcessedKeys: ProcessedSeriesKey[] = ["processed", "sortedLate", "lost", "readyToSort", "expected"];
  const isSeriesVisible = (series: ProcessedSeriesKey) =>
    !hiddenSeries.has(series) && !(hideLost && series === "lost") && !(hideForecasted && series === "expected") && (hoveredSeries == null || hoveredSeries === series) && (!hoveredSecondary);
  const isSeriesActive = (series: ProcessedSeriesKey) => !hiddenSeries.has(series) && !(hideLost && series === "lost") && !(hideForecasted && series === "expected");
  const isSecondaryVisible = secondaryBars && !secondaryHidden && !hoveredSeries;
  const isExtraVisible = !!extraTopStack && !extraHidden && (hoveredSeries == null || hoveredSeries === ("extra" as unknown as ProcessedSeriesKey)) && !hoveredSecondary;
  const hiddenCount = hiddenSeries.size + (secondaryBars && secondaryHidden ? 1 : 0) + (extraTopStack && extraHidden ? 1 : 0);
  const anyFilterActive = hiddenCount > 0;
  const visibleCount = (allProcessedKeys.length - hiddenSeries.size) +
    (secondaryBars && !secondaryHidden ? 1 : 0) +
    (extraTopStack && !extraHidden ? 1 : 0);

  const toggleExtra = () => {
    if (extraHidden) {
      setExtraHidden(false);
      return;
    }
    if (visibleCount <= 1) return;
    if (!anyFilterActive) {
      // First action: isolate to extra
      setHiddenSeries(new Set(allProcessedKeys));
      if (secondaryBars) setSecondaryHidden(true);
      setExtraHidden(false);
      return;
    }
    setExtraHidden(true);
  };
  const toggleSeries = (series: ProcessedSeriesKey) => {
    if (hiddenSeries.has(series)) {
      // Clicking a hidden item unhides it
      setHiddenSeries((current) => {
        const next = new Set(current);
        next.delete(series);
        return next;
      });
      return;
    }
    if (visibleCount <= 1) return;
    if (!anyFilterActive) {
      // First action: isolate to this series
      if (secondaryBars) setSecondaryHidden(true);
      if (extraTopStack) setExtraHidden(true);
      setHiddenSeries(new Set(allProcessedKeys.filter((k) => k !== series)));
      return;
    }
    setHiddenSeries((current) => {
      const next = new Set(current);
      next.add(series);
      return next;
    });
  };
  const anyPrimaryVisible = !hoveredSecondary && allProcessedKeys.some((k) => !hiddenSeries.has(k));

  // ---- Compute y-axis max ----
  const maxValue = useMemo(() => {
    if (isProcessed) {
        const max = Math.max(
        ...chartData.map((d, i) =>
          Math.max(
            (isSeriesVisible("processed") ? d.processed.processed : 0) +
              (isSeriesVisible("sortedLate") ? (d.processed.sortedLate ?? 0) : 0) +
              (isSeriesVisible("lost") ? d.processed.lost : 0) +
              (isSeriesVisible("readyToSort") ? d.processed.readyToSort : 0) +
              (isExtraVisible && extraTopStack ? (extraTopStack.values[i] ?? 0) : 0),
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
  }, [chartData, metric, isProcessed, hiddenSeries, hoveredSeries, hoveredSecondary, isExtraVisible, extraTopStack]);

  const ticks = useMemo(() => {
    const step = maxValue / 5;
    return Array.from({ length: 6 }, (_, i) => Math.round(i * step * 100) / 100);
  }, [maxValue]);

  // Chart geometry
  const height = 260;
  const topPadding = 24;
  const bottomPadding = 32;
  const leftPadding = 56;
  const rightPadding = secondaryBars ? 56 : 16;
  const width = 900;
  const plotHeight = height - topPadding - bottomPadding;
  const plotWidth = width - leftPadding - rightPadding;

  const scaleY = (value: number) => topPadding + plotHeight - (value / maxValue) * plotHeight;

  // Secondary Y-axis for dual-bar mode
  const secondaryMax = useMemo(() => {
    if (!secondaryBars || !isSecondaryVisible) return 1;
    const raw = Math.max(...secondaryBars.values.filter((v) => v > 0), 1);
    if (raw <= 5) return 5;
    if (raw <= 10) return 10;
    if (raw <= 15) return 15;
    if (raw <= 25) return 25;
    if (raw <= 50) return 50;
    return Math.ceil(raw / 10) * 10;
  }, [secondaryBars, isSecondaryVisible]);
  const scaleY2 = (value: number) => topPadding + plotHeight - (value / secondaryMax) * plotHeight;
  const secondaryTicks = useMemo(() => {
    const step = secondaryMax / 5;
    return Array.from({ length: 6 }, (_, i) => Math.round(i * step));
  }, [secondaryMax]);

  const formatTick = (v: number) => {
    if (metric.unit === "count") return v.toLocaleString();
    if (metric.unit === "percent") return `${v}%`;
    return `${v}`;
  };

  return (
    <div className="flex gap-8">
      <div className="relative flex-1">
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
              return anyPrimaryVisible ? (
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
              ) : <g key={`tick-label-${i}`} />;
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
                {anyPrimaryVisible && (
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
                )}
              </g>
            );
          })}

          {/* Right Y-axis for secondary bars */}
          {isSecondaryVisible && secondaryBars && secondaryTicks.map((t, i) => {
            const y = scaleY2(t);
            return (
              <text
                key={`sec-tick-${i}`}
                x={width - rightPadding + 12}
                y={y + 4}
                textAnchor="start"
                fill={COLORS.axis}
                fontSize={12}
                fontFamily="Inter, sans-serif"
                fontWeight={500}
              >
                {t}
              </text>
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

          {/* Secondary bars (rendered first so primary overlaps on z) */}
          {isSecondaryVisible && secondaryBars && chartData.map((d, i) => {
            const slot = plotWidth / chartData.length;
            const hasPrimary = !hoveredSecondary && (!hiddenSeries.has("processed") || !hiddenSeries.has("sortedLate") || !hiddenSeries.has("lost") || !hiddenSeries.has("readyToSort"));
            const barWidth = hasPrimary ? 20 : 44;
            const cx = leftPadding + slot * i + slot / 2;
            const x = hasPrimary ? cx + 2 : cx - barWidth / 2;
            const inRange = !visibleDays || visibleDays.has(d.date);
            const val = secondaryBars.values[i] ?? 0;
            if (!inRange || d.isFuture) return null;
            if (val === 0) {
              // Zero-bump for secondary bar when isolated (no primary showing)
              if (!hasPrimary) {
                const bumpH = 4;
                const bumpY = topPadding + plotHeight - bumpH;
                return (
                  <g key={`sec-${d.date}`}>
                    <path d={roundedTopBarPath(x, bumpY, barWidth, bumpH, 2)} fill={secondaryBars.color} />
                    <text x={x + barWidth / 2} y={bumpY - 6} textAnchor="middle" fill={COLORS.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={600}>0</text>
                  </g>
                );
              }
              return null;
            }
            const y = scaleY2(val);
            const h = topPadding + plotHeight - y;
            return (
              <g key={`sec-${d.date}`}>
                <path d={roundedTopBarPath(x, y, barWidth, h, 4)} fill={secondaryBars.color} />
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((d, i) => {
            const slot = plotWidth / chartData.length;
            const hasSec = isSecondaryVisible && secondaryBars;
            const barWidth = hasSec ? 20 : 44;
            const cx = leftPadding + slot * i + slot / 2;
            const x = hasSec ? cx - barWidth - 2 : cx - barWidth / 2;
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
                    <ValueLabel cx={x + barWidth / 2} y={y - 8} text={d.processed.expectedVolume.toLocaleString()} />
                    <text
                      x={x + barWidth / 2}
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
              const extraValue = isExtraVisible && extraTopStack ? (extraTopStack.values[i] ?? 0) : 0;

              // Detect single-series isolation for zero-bump treatment
              const visibleKeys = allProcessedKeys.filter((k) => k !== "expected" && isSeriesVisible(k));
              const isSingleSeries = visibleKeys.length === 1;
              // Bake cutoffs: lost = 9 days, sortedLate = 1 day from latest observed day
              const BAKE_CUTOFF_LOST = "2026-02-06"; // 9 days before Feb 15
              const BAKE_CUTOFF_LATE = "2026-02-14"; // 1 day before Feb 15

              // Stack order bottom→top: readyToSort, processed, sortedLate, lost, extra
              const cumAfterReady = readyValue;
              const cumAfterProcessed = cumAfterReady + processedValue;
              const cumAfterLate = cumAfterProcessed + sortedLateValue;
              const cumAfterLost = cumAfterLate + lostValue;
              const visibleTotal = cumAfterLost + extraValue;

              const yReady = scaleY(cumAfterReady);
              const hReady = readyValue > 0 ? topPadding + plotHeight - yReady : 0;

              const yProcessed = scaleY(cumAfterProcessed);
              const hProcessed = processedValue > 0 ? scaleY(cumAfterReady) - yProcessed : 0;

              const yLate = scaleY(cumAfterLate);
              const hLate = sortedLateValue > 0 ? scaleY(cumAfterProcessed) - yLate : 0;

              const yLost = scaleY(cumAfterLost);
              const hLost = lostValue > 0 ? scaleY(cumAfterLate) - yLost : 0;

              const yExtra = scaleY(visibleTotal);
              const hExtra = extraValue > 0 ? scaleY(cumAfterLost) - yExtra : 0;

              const labelValue = visibleTotal;
              const labelY = labelValue > 0 ? scaleY(labelValue) - 8 : topPadding + plotHeight - 8;
              const labelText = labelValue > 0 ? labelValue.toLocaleString() : null;

              // Determine which segment is on top (gets rounded corners)
              const segments = [
                { key: "extra", h: hExtra },
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
                      <path d={roundedTopBarPath(x, yLost, barWidth, hLost, 4)} fill={colors.lost} />
                    ) : (
                      <rect x={x} y={yLost} width={barWidth} height={hLost} fill={colors.lost} />
                    )
                  )}
                  {hExtra > 0 && extraTopStack && (
                    topSegment === "extra" ? (
                      <path d={roundedTopBarPath(x, yExtra, barWidth, hExtra, 4)} fill={extraTopStack.color} />
                    ) : (
                      <rect x={x} y={yExtra} width={barWidth} height={hExtra} fill={extraTopStack.color} />
                    )
                  )}
                  {/* Zero-bump: show a tiny bar + "0" when a single series is isolated and has zero value */}
                  {isSingleSeries && visibleTotal === 0 && !d.isFuture && (() => {
                    const isolated = visibleKeys[0];
                    // Don't show zero bump if the data is still baking
                    if (isolated === "lost" && d.date > BAKE_CUTOFF_LOST) return null;
                    if (isolated === "sortedLate" && d.date > BAKE_CUTOFF_LATE) return null;
                    const bumpH = 4;
                    const bumpY = topPadding + plotHeight - bumpH;
                    const bumpColor = isolated === "processed" ? COLORS.processed
                      : isolated === "sortedLate" ? COLORS.sortedLate
                      : isolated === "lost" ? colors.lost
                      : COLORS.readyToSort;
                    return (
                      <>
                        <path d={roundedTopBarPath(x, bumpY, barWidth, bumpH, 2)} fill={bumpColor} />
                        <text x={x + barWidth / 2} y={bumpY - 6} textAnchor="middle" fill={COLORS.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={600}>0</text>
                      </>
                    );
                  })()}
                  {labelText && (() => {
                    const barCenterX = x + barWidth / 2;
                    const secVal = isSecondaryVisible && secondaryBars ? (secondaryBars.values[i] ?? 0) : 0;
                    const secY = secVal > 0 ? scaleY2(secVal) - 8 : 0;
                    const yCollide = hasSec && secVal > 0 && Math.abs(labelY - secY) < 16;
                    // When labels are at the same height, right-align primary to its bar's right edge
                    const adjustedX = yCollide ? x + barWidth : barCenterX;
                    const anchor = yCollide ? "end" as const : "middle" as const;
                    const primaryLabelBgWidth = estimateLabelWidth(labelText);
                    const primaryLabelCenter = yCollide ? x + barWidth - primaryLabelBgWidth / 2 : barCenterX;
                    return (
                      <>
                        <ValueLabel cx={primaryLabelCenter} y={labelY} text={labelText} />
                        <text x={adjustedX} y={labelY} textAnchor={anchor} fill={COLORS.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={600}>{labelText}</text>
                      </>
                    );
                  })()}
                  {/* Hover zone — covers both primary and (when present) secondary bars */}
                  <rect
                    x={hasSec ? x : x}
                    y={topPadding}
                    width={hasSec ? barWidth * 2 + 4 : barWidth}
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

            const fill = belowTarget ? colors.lost : COLORS.bar;

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

          {/* Secondary bar labels (rendered after primary bars so they aren't occluded) */}
          {isSecondaryVisible && secondaryBars && chartData.map((d, i) => {
            const slot = plotWidth / chartData.length;
            const hasPrimary = !hoveredSecondary && (!hiddenSeries.has("processed") || !hiddenSeries.has("sortedLate") || !hiddenSeries.has("lost") || !hiddenSeries.has("readyToSort"));
            const barWidth = hasPrimary ? 20 : 44;
            const cx = leftPadding + slot * i + slot / 2;
            const x = hasPrimary ? cx + 2 : cx - barWidth / 2;
            const inRange = !visibleDays || visibleDays.has(d.date);
            const val = secondaryBars.values[i] ?? 0;
            if (!inRange || d.isFuture || val === 0) return null;
            const y = scaleY2(val);
            const secLabelY = y - 8;
            const primaryTotal = (isSeriesVisible("processed") ? d.processed.processed : 0) + (isSeriesVisible("sortedLate") ? (d.processed.sortedLate ?? 0) : 0) + (isSeriesVisible("lost") ? d.processed.lost : 0) + (isSeriesVisible("readyToSort") ? d.processed.readyToSort : 0);
            const primaryLabelY = primaryTotal > 0 ? scaleY(primaryTotal) - 8 : 0;
            const secCenterX = x + barWidth / 2;
            const secTextW = estimateTextWidth(val.toLocaleString());
            const yCollide = hasPrimary && primaryTotal > 0 && Math.abs(secLabelY - primaryLabelY) < 16;
            // When labels are at same height: left-align to bar's left edge only if text overflows bar
            const secOverflows = secTextW > barWidth;
            const shouldShiftSec = yCollide && secOverflows;
            const adjustedSecX = shouldShiftSec ? x : secCenterX;
            const secAnchor = shouldShiftSec ? "start" as const : "middle" as const;
            const secLabelBgWidth = estimateLabelWidth(val.toLocaleString());
            const secLabelCenter = shouldShiftSec ? x + secLabelBgWidth / 2 : secCenterX;
            return (
              <g key={`sec-label-${d.date}`}>
                <ValueLabel cx={secLabelCenter} y={secLabelY} text={val.toLocaleString()} />
                <text x={adjustedSecX} y={secLabelY} textAnchor={secAnchor} fill={COLORS.axis} fontSize={12} fontFamily="Inter, sans-serif" fontWeight={600}>{val.toLocaleString()}</text>
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

          {/* Bar tooltip moved to HTML layer below */}
        </svg>
        {/* HTML bar tooltip — rendered outside SVG for proper z-index */}
        {hoveredBar && isProcessed &&
          (() => {
            const d = chartData[hoveredBar.idx];
            if (!d) return null;
            const secondaryValue = isSecondaryVisible && secondaryBars ? (secondaryBars.values[hoveredBar.idx] ?? 0) : 0;
            const extraValue = isExtraVisible && extraTopStack ? (extraTopStack.values[hoveredBar.idx] ?? 0) : 0;
            const rows = d.isFuture
              ? [
                  { label: labels.forecasted, value: d.processed.expectedVolume, color: COLORS.expected },
                ].filter((r) => isSeriesVisible("expected") && r.value > 0)
              : [
                  ...(extraTopStack && extraValue > 0 ? [{ label: extraTopStack.label, value: extraValue, color: extraTopStack.color }] : []),
                  { label: labels.lost, value: d.processed.lost, color: colors.lost },
                  { label: labels.sortedLate ?? "Sorted late", value: d.processed.sortedLate ?? 0, color: COLORS.sortedLate },
                  { label: labels.processed, value: d.processed.processed, color: COLORS.processed },
                  { label: labels.readyToSort, value: d.processed.readyToSort, color: COLORS.readyToSort },
                  ...(secondaryBars && secondaryValue > 0 ? [{ label: secondaryBars.label, value: secondaryValue, color: secondaryBars.color }] : []),
                ].filter((r) => {
                  if (r.value <= 0) return false;
                  if (r.color === colors.lost) return isSeriesVisible("lost");
                  if (r.color === COLORS.sortedLate) return isSeriesVisible("sortedLate");
                  if (r.color === COLORS.processed) return isSeriesVisible("processed");
                  if (r.color === COLORS.readyToSort) return isSeriesVisible("readyToSort");
                  return true;
                });
            if (rows.length === 0) return null;

            const boxW = 200;
            const rowH = 20;
            const padY = 10;
            const boxH = padY * 2 + rows.length * rowH + 18;
            const tailH = 6;
            const gap = 6;
            const ty = hoveredBar.topY - gap - tailH - boxH;
            const tx = Math.max(12, Math.min(hoveredBar.cx - boxW / 2, width - boxW - 12));

            return (
              <div
                className="pointer-events-none absolute z-50"
                style={{
                  left: `${(tx / width) * 100}%`,
                  top: `${(ty / height) * 100}%`,
                  width: `${(boxW / width) * 100}%`,
                }}
              >
                <div className="rounded-[6px] px-3 py-2.5 text-left shadow-lg" style={{ backgroundColor: chartNeutralColors.ink }}>
                  <div className="text-[12px] font-semibold text-white">{d.label}</div>
                  <div className="mt-1.5 space-y-1">
                    {rows.map((r, ri) => (
                      <div key={ri} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="block h-2 w-2 rounded-sm" style={{ backgroundColor: r.color }} />
                          <span className="text-[11px] text-white/80">{r.label}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-white">{r.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="absolute h-0 w-0"
                  style={{
                    left: `${((hoveredBar.cx - tx) / boxW) * 100}%`,
                    transform: "translateX(-50%)",
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: `${tailH}px solid ${chartNeutralColors.ink}`,
                  }}
                />
              </div>
            );
          })()}
      </div>

      {/* Legend */}
      <div className="flex min-w-[180px] items-center">
        <div className="flex flex-col gap-2">
          {simpleLegend ? (
            <div className="flex items-center gap-2">
              <span className="block h-4 w-4 rounded-[4px]" style={{ backgroundColor: simpleLegend.color }} />
              <span className="text-body-md text-ink">{simpleLegend.label}</span>
            </div>
          ) : isProcessed ? (
            <>
              {extraTopStack && (
                <LegendItem
                  color={extraTopStack.color}
                  label={extraTopStack.label}
                  active={!extraHidden}
                  onClick={toggleExtra}
                />
              )}
              {secondaryBars && (
                <LegendItem
                  color={secondaryBars.color}
                  label={secondaryBars.label}
                  active={!secondaryHidden}
                  onClick={() => {
                    if (secondaryHidden) {
                      setSecondaryHidden(false);
                      return;
                    }
                    if (visibleCount <= 1) return;
                    if (!anyFilterActive) {
                      // First action: isolate to secondary
                      setHiddenSeries(new Set(allProcessedKeys));
                      if (extraTopStack) setExtraHidden(true);
                      setSecondaryHidden(false);
                      return;
                    }
                    setSecondaryHidden(true);
                  }}
                  onMouseEnter={() => !secondaryHidden && !anyFilterActive && setHoveredSecondary(true)}
                  onMouseLeave={() => setHoveredSecondary(false)}
                />
              )}
              {!hideLost && (
                <LegendItem
                  color={colors.lost}
                  label={labels.lost}
                  active={isSeriesActive("lost")}
                  onClick={() => toggleSeries("lost")}
                  onMouseEnter={() => !anyFilterActive && !hiddenSeries.has("lost") && setHoveredSeries("lost")}
                  onMouseLeave={() => setHoveredSeries(null)}
                  infoTooltip="Takes 9 days to finalize. Only days with confirmed data are shown"
                />
              )}
              <LegendItem
                color={COLORS.sortedLate}
                label={labels.sortedLate ?? "Sorted late"}
                active={isSeriesActive("sortedLate")}
                onClick={() => toggleSeries("sortedLate")}
                onMouseEnter={() => !anyFilterActive && !hiddenSeries.has("sortedLate") && setHoveredSeries("sortedLate")}
                onMouseLeave={() => setHoveredSeries(null)}
              />
              <LegendItem
                color={COLORS.processed}
                label={labels.processed}
                active={isSeriesActive("processed")}
                onClick={() => toggleSeries("processed")}
                onMouseEnter={() => !anyFilterActive && !hiddenSeries.has("processed") && setHoveredSeries("processed")}
                onMouseLeave={() => setHoveredSeries(null)}
              />
              <LegendItem
                color={COLORS.readyToSort}
                label={labels.readyToSort}
                active={isSeriesActive("readyToSort")}
                onClick={() => toggleSeries("readyToSort")}
                onMouseEnter={() => !anyFilterActive && !hiddenSeries.has("readyToSort") && setHoveredSeries("readyToSort")}
                onMouseLeave={() => setHoveredSeries(null)}
              />
              {!hideForecasted && (
                <LegendItem
                  color={COLORS.expected}
                  label={labels.forecasted}
                  active={isSeriesActive("expected")}
                  onClick={() => toggleSeries("expected")}
                  onMouseEnter={() => !anyFilterActive && !hiddenSeries.has("expected") && setHoveredSeries("expected")}
                  onMouseLeave={() => setHoveredSeries(null)}
                />
              )}
            </>
          ) : (
            <>
              <LegendItem color={COLORS.bar} label={metric.label} />
              <LegendItem color={colors.lost} label="Below target" />
              {(metric.bakeDays ?? 0) > 0 && (
                <LegendItem color={COLORS.pending} label="Not calculated yet" />
              )}
              <LegendItem targetLine label={`Target ${metric.format(metric.target)}`} />
            </>
          )}
          {isProcessed && (
            <div className={cn("mt-2", hiddenCount > 0 ? "" : "invisible")}>
              <button
                type="button"
                onClick={() => { setHiddenSeries(new Set()); setSecondaryHidden(false); setExtraHidden(false); }}
                className="flex items-center gap-2 rounded-button px-1.5 py-0.5 -mx-1.5 transition-all hover:bg-surface-hovered"
              >
                <Trash2 className="h-4 w-4 shrink-0 text-ink" strokeWidth={1.75} />
                <span className="text-body-md text-ink">{hiddenCount} {hiddenCount === 1 ? "filter" : "filters"} active</span>
              </button>
            </div>
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

function estimateTextWidth(text: string) {
  return text.length * 6.8;
}

function estimateLabelWidth(text: string) {
  return Math.max(28, estimateTextWidth(text) + 10);
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
  onMouseEnter,
  onMouseLeave,
  infoTooltip,
}: {
  color?: string;
  label: string;
  dashed?: boolean;
  outlined?: boolean;
  targetLine?: boolean;
  active?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
      <span className={cn("text-body-md text-ink", onClick && "underline underline-offset-2", !active && "opacity-60")}>{label}</span>
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
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          aria-pressed={active}
          className="flex items-center gap-2 rounded-button px-1.5 py-0.5 -mx-1.5 text-left transition-all hover:bg-surface-hovered"
        >
          {content}
        </button>
        {infoIcon}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {content}
      {infoIcon}
    </div>
  );
}
