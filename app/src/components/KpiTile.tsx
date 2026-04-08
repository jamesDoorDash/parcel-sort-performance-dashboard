import { useState } from "react";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import type { Kpi } from "../data/mock";
import { cn } from "../lib/cn";

type Props = {
  kpi: Kpi;
  selected?: boolean;
  onClick?: () => void;
};

export function KpiTile({ kpi, selected, onClick }: Props) {
  const isPlaceholder = kpi.value === "--" || kpi.value.startsWith("--");
  const hasTooltip = !!kpi.tooltip;
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full flex-col items-start gap-4 rounded-card border border-line-hovered bg-white px-5 py-5 text-left shadow-card outline-none transition-shadow",
        "focus:outline-none focus-visible:outline-none",
        selected && "ring-[3px] ring-inset ring-ink",
      )}
    >
      <div className="text-body-md text-ink-subdued">{kpi.label}</div>

      {isPlaceholder ? (
        <div className="text-display-md text-ink-subdued">{kpi.value}</div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="text-display-md text-ink">{kpi.value}</div>
          {kpi.delta && (
            <div
              className={cn(
                "flex items-center gap-0.5 pb-1 text-body-sm-strong",
                kpi.delta.direction === "up" ? "text-positive" : "text-negative",
              )}
            >
              {kpi.delta.direction === "up" ? (
                <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
              )}
              <span>{kpi.delta.value}</span>
              {kpi.deltaLabel && (
                <span className="ml-1 font-normal text-ink-subdued">{kpi.deltaLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Partial / placeholder caption */}
      {(kpi.partialNote || (isPlaceholder && kpi.placeholderNote)) && (
        <div
          className="relative mt-auto flex items-center gap-1.5 text-body-sm text-ink-subdued"
          onMouseEnter={() => hasTooltip && setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
        >
          <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>{kpi.partialNote ?? kpi.placeholderNote}</span>

          {/* Tooltip */}
          {hasTooltip && tooltipOpen && kpi.tooltip && (
            <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[240px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
              <div className="text-body-sm-strong text-white">{kpi.tooltip.title}</div>
              <div className="mt-0.5 text-body-sm text-white/80">{kpi.tooltip.body}</div>
              {/* little tail */}
              <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
            </div>
          )}
        </div>
      )}
    </button>
  );
}
