import { useState } from "react";
import { Info } from "lucide-react";
import type { Kpi } from "../data/mock";
import { cn } from "../lib/cn";

type Props = {
  kpi: Kpi;
  selected?: boolean;
  onClick?: () => void;
};

function DeltaTriangle({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 8"
      className={cn("h-2 w-2 shrink-0", direction === "down" && "rotate-180")}
      fill="currentColor"
    >
      <path d="M4 1 7 6H1z" />
    </svg>
  );
}

export function KpiTile({ kpi, selected, onClick }: Props) {
  const isPlaceholder = kpi.value === "--" || kpi.value.startsWith("--");
  const hasFooterTooltip = !!kpi.tooltip;
  const hasLabelTooltip = !!kpi.labelTooltip;
  const [footerTooltipOpen, setFooterTooltipOpen] = useState(false);
  const [labelTooltipOpen, setLabelTooltipOpen] = useState(false);

  const deltaColor = kpi.deltaColor
    ? kpi.deltaColor === "positive" ? "text-positive" : "text-negative"
    : kpi.delta?.direction === "up" ? "text-positive" : "text-negative";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full flex-col items-start gap-4 rounded-card border border-line-hovered bg-white px-5 py-5 text-left outline-none transition-shadow",
        "focus:outline-none focus-visible:outline-none",
        selected && "ring-[3px] ring-inset ring-ink",
      )}
    >
      {/* Label row — with optional bake badge */}
      <div className="flex items-center gap-2 text-body-md text-ink-subdued">
        <div
          className="relative"
          onMouseEnter={() => hasLabelTooltip && setLabelTooltipOpen(true)}
          onMouseLeave={() => setLabelTooltipOpen(false)}
        >
          <span
            className={cn(
              hasLabelTooltip && "metric-label-underline",
            )}
          >
            {kpi.label}
          </span>
          {hasLabelTooltip && labelTooltipOpen && kpi.labelTooltip && (
            <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[260px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
              <div className="text-body-sm-strong text-white">{kpi.labelTooltip.title}</div>
              <div className="mt-0.5 text-body-sm text-white/80">{kpi.labelTooltip.body}</div>
              <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
            </div>
          )}
        </div>
        {kpi.bakeBadge && (
          <span className="rounded-sm bg-negative-bg px-1.5 py-0.5 text-body-sm text-negative leading-none">
            {kpi.bakeBadge}
          </span>
        )}
      </div>

      {isPlaceholder ? (
        <div className="text-display-md text-ink-subdued">{kpi.value}</div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="text-display-md text-ink">{kpi.value}</div>
          {kpi.delta && (
            <div className={cn("flex items-center gap-0.5 pb-1 text-body-sm-strong", deltaColor)}>
              <DeltaTriangle direction={kpi.delta.direction} />
              <span>{kpi.delta.value}</span>
              {kpi.deltaLabel && (
                <span className="ml-1 font-normal text-ink-subdued">{kpi.deltaLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alert note (pink, no icon) */}
      {kpi.alertNote && (
        <div className="mt-auto text-body-sm text-[#e8348e]">{kpi.alertNote}</div>
      )}

      {/* Partial / placeholder caption */}
      {!kpi.alertNote && kpi.partialNote && (
        <div
          className="relative mt-auto flex items-center gap-1.5 text-body-sm text-ink-subdued"
          onMouseEnter={() => hasFooterTooltip && setFooterTooltipOpen(true)}
          onMouseLeave={() => setFooterTooltipOpen(false)}
        >
          <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>{kpi.partialNote}</span>

          {/* Tooltip */}
          {hasFooterTooltip && footerTooltipOpen && kpi.tooltip && (
            <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[240px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
              <div className="text-body-sm-strong text-white">{kpi.tooltip.title}</div>
              <div className="mt-0.5 text-body-sm text-white/80">{kpi.tooltip.body}</div>
              <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
            </div>
          )}
        </div>
      )}
    </button>
  );
}
