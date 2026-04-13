import { useMemo, useState } from "react";
import { chartNeutralColors, chartStateColors } from "../lib/chartColors";
import type { V3SimpleSeriesDay } from "../data/mockV3";
import { cn } from "../lib/cn";
import { TODAY_ISO } from "../data/mock";

const width = 900;
const height = 260;
const topPadding = 24;
const bottomPadding = 32;
const leftPadding = 56;
const rightPadding = 16;
const plotHeight = height - topPadding - bottomPadding;
const plotWidth = width - leftPadding - rightPadding;
const BAR_W = 44;

type Props = {
  data: V3SimpleSeriesDay[];
  target?: number;
  targetLabel?: string;
  isPercent?: boolean;
  bakeDays?: number;
  visibleDays?: Set<string>;
  formatValue?: (value: number) => string;
};

export function V3MetricChart({ data, target, targetLabel, isPercent, bakeDays, visibleDays, formatValue }: Props) {
  const singleDayMode = visibleDays?.size === 1;
  const [showTarget, setShowTarget] = useState(true);
  const [hoveredPending, setHoveredPending] = useState<{ cx: number; cy: number; date: string } | null>(null);
  const chartData = singleDayMode
    ? data.filter((point) => visibleDays.has(point.date))
    : data;
  const yDomain = useMemo(() => {
    const values = chartData
      .filter((point) => !point.isFuture && getDayStatus(point.date, bakeDays) === "calculated")
      .map((point) => point.value);
    const maxValue = Math.max(target ?? 0, ...values, 0);

    if (maxValue <= 0) return 1;

    if (isPercent) {
      return getNiceUpperBound(maxValue);
    }

    if (maxValue <= 1) return 1;
    if (maxValue <= 5) return 5;
    if (maxValue <= 10) return 10;
    if (maxValue <= 20) return 20;
    if (maxValue <= 100) return Math.ceil(maxValue / 10) * 10;

    return Math.ceil(maxValue / 25) * 25;
  }, [bakeDays, chartData, isPercent, target]);

  const ticks = useMemo(() => {
    const segments = 5;
    return Array.from({ length: segments + 1 }, (_, index) => (yDomain / segments) * index);
  }, [yDomain]);

  const yPx = (value: number) => topPadding + plotHeight - (value / yDomain) * plotHeight;

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
                  {formatAxisTick(tick, isPercent)}
                </text>
              </g>
            );
          })}

          {target !== undefined && showTarget && (
            <line
              x1={leftPadding}
              x2={leftPadding + plotWidth}
              y1={yPx(target)}
              y2={yPx(target)}
              stroke={chartNeutralColors.ink}
              strokeDasharray="6 6"
              strokeWidth={1.5}
            />
          )}

          {chartData.map((day, index) => {
            const inRange = !visibleDays || visibleDays.has(day.date);
            const slot = plotWidth / chartData.length;
            const cx = leftPadding + slot * index + slot / 2;
            const x = cx - BAR_W / 2;
            const barHeight = (day.value / yDomain) * plotHeight;
            const barY = topPadding + plotHeight - barHeight;
            const fill = chartStateColors.primary;

            return (
              <g key={day.date}>
                {inRange && !day.isFuture ? (
                  getDayStatus(day.date, bakeDays) === "pending" ? (
                    <g
                      onMouseEnter={() =>
                        setHoveredPending({
                          cx,
                          cy: topPadding + plotHeight / 2,
                          date: day.date,
                        })}
                      onMouseLeave={() => setHoveredPending(null)}
                      style={{ cursor: "help" }}
                    >
                      <rect
                        x={x}
                        y={topPadding}
                        width={BAR_W}
                        height={plotHeight}
                        fill={chartNeutralColors.pending}
                      />
                      <circle
                        cx={cx}
                        cy={topPadding + plotHeight / 2}
                        r={9}
                        fill="none"
                        stroke={chartNeutralColors.ink}
                        strokeWidth={1.75}
                      />
                      <circle
                        cx={cx}
                        cy={topPadding + plotHeight / 2 - 3.5}
                        r={1.1}
                        fill={chartNeutralColors.ink}
                      />
                      <line
                        x1={cx}
                        y1={topPadding + plotHeight / 2 - 0.5}
                        x2={cx}
                        y2={topPadding + plotHeight / 2 + 4.5}
                        stroke={chartNeutralColors.ink}
                        strokeWidth={1.75}
                        strokeLinecap="round"
                      />
                    </g>
                  ) : (
                  <>
                    <path d={roundedTopBarPath(x, barY, BAR_W, barHeight, 4)} fill={fill} />
                    <ValueLabel
                      cx={cx}
                      y={barY - 8}
                      text={formatValue ? formatValue(day.value) : formatBarLabel(day.value)}
                    />
                    <text
                      x={cx}
                      y={barY - 8}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill={chartNeutralColors.axis}
                      fontFamily="Inter, sans-serif"
                    >
                      {formatValue ? formatValue(day.value) : formatBarLabel(day.value)}
                    </text>
                  </>
                  )
                ) : !inRange ? (
                  <rect
                    x={x}
                    y={topPadding + plotHeight - 4}
                    width={BAR_W}
                    height={4}
                    fill={chartNeutralColors.pending}
                  />
                ) : null}

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
          {hoveredPending && (() => {
            const text = `Will be calculated on ${formatCalcDate(hoveredPending.date, bakeDays ?? 0)}`;
            const paddingX = 14;
            const boxW = Math.max(156, estimateTooltipWidth(text) + paddingX * 2);
            const tx = Math.max(12, Math.min(hoveredPending.cx - boxW / 2, width - boxW - 12));

            return (
              <g>
                <rect
                  x={tx}
                  y={hoveredPending.cy - 50}
                  width={boxW}
                  height={32}
                  rx={6}
                  fill={chartNeutralColors.ink}
                />
                <text
                  x={tx + boxW / 2}
                  y={hoveredPending.cy - 29}
                  textAnchor="middle"
                  fill={chartNeutralColors.surface}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fontWeight={600}
                >
                  {text}
                </text>
                <polygon
                  points={`${hoveredPending.cx - 5},${hoveredPending.cy - 18} ${hoveredPending.cx + 5},${hoveredPending.cy - 18} ${hoveredPending.cx},${hoveredPending.cy - 13}`}
                  fill={chartNeutralColors.ink}
                />
              </g>
            );
          })()}
        </svg>
      </div>

      {target !== undefined && (
        <div className="flex min-w-[180px] items-center">
          <div className="flex flex-col gap-4">
          <LegendItem
            color={chartNeutralColors.ink}
            label={`Target ${targetLabel ?? formatLegendTarget(target)}`}
            dashed
            active={showTarget}
            onClick={() => setShowTarget((current) => !current)}
          />
          </div>
        </div>
      )}
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

function estimateTooltipWidth(text: string) {
  let width = 0;

  for (const char of text) {
    if ("il1| '".includes(char)) width += 3.8;
    else if ("fjrt".includes(char)) width += 4.8;
    else if ("mwMW@#%&".includes(char)) width += 8.8;
    else if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(char)) width += 7.4;
    else width += 6.6;
  }

  return width;
}

function LegendItem({
  color,
  label,
  dashed,
  active = true,
  onClick,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      {dashed ? (
        <span className="relative h-[2px] w-4 shrink-0">
          <span
            className="absolute inset-0 border-t-[1.5px]"
            style={{
              borderColor: color,
              borderTopStyle: "dashed",
              opacity: active ? 1 : 0,
            }}
          />
        </span>
      ) : (
        <span
          className="relative block h-4 w-4 rounded-[4px]"
          style={{ backgroundColor: color, opacity: active ? 1 : 0 }}
        />
      )}
      <span className={cn("text-body-md text-ink", !active && "line-through opacity-60")}>
        {label}
      </span>
    </>
  );

  if (!onClick) return content;

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

function formatAxisTick(value: number, isPercent?: boolean) {
  if (value === 0) return isPercent ? "0%" : "0";
  if (isPercent) {
    if (value >= 10) return `${value.toFixed(0)}%`;
    if (value >= 1) return `${value.toFixed(1).replace(/\.?0+$/, "")}%`;
    if (value >= 0.1) return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
    return `${value.toFixed(3).replace(/\.?0+$/, "")}%`;
  }
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return value.toFixed(0);
  if (value >= 1) return value.toFixed(1).replace(".0", "");
  return value.toFixed(2);
}

function formatBarLabel(value: number) {
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return value.toFixed(1).replace(".0", "");
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function formatLegendTarget(value: number) {
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return value.toFixed(1).replace(".0", "");
  return value.toFixed(2).replace(/0$/, "");
}

function getNiceUpperBound(value: number) {
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;

  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 1.5) niceNormalized = 1.5;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 2.5) niceNormalized = 2.5;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  return niceNormalized * magnitude;
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

function getDayStatus(dateIso: string, bakeDays?: number) {
  if (dateIso > TODAY_ISO) return "future";
  if (!bakeDays) return "calculated";
  const lastCalculatedIso = addDaysIso(TODAY_ISO, -bakeDays);
  return dateIso <= lastCalculatedIso ? "calculated" : "pending";
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatCalcDate(dateIso: string, bakeDays: number) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + bakeDays);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
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
