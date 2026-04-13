import { useState } from "react";
import { cn } from "../lib/cn";
import type { V3MetricCard } from "../data/mockV3";

type Props = {
  card: V3MetricCard;
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

export function V3MetricSelectorCard({ card, selected, onClick }: Props) {
  const deltaToneClass =
    card.delta?.tone === "positive" ? "text-positive" : "text-negative";
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const isPlaceholder = card.value === "--" || card.value.startsWith("--");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start rounded-[8px] border border-line-hovered bg-white px-4 py-3 text-left transition-colors",
        "hover:border-line-strong",
        selected && "border-ink shadow-[inset_0_0_0_1px_#191919]",
      )}
    >
      <div
        className="relative"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
      >
        <span className="metric-label-underline text-body-sm-strong text-ink">
          {card.label}
        </span>
        {tooltipOpen && (
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[260px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
            <div className="text-body-sm text-white/80">{card.labelTooltip.body}</div>
            <div className="absolute top-full left-4 h-0 w-0 border-t-[6px] border-r-[6px] border-l-[6px] border-t-[#111318] border-r-transparent border-l-transparent" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className={cn("text-title-md", isPlaceholder ? "text-ink-subdued" : "text-ink")}>
          {card.value}
        </div>
        {card.delta && (
          <div className={cn("flex items-baseline gap-1 text-body-sm-strong", deltaToneClass)}>
            <DeltaTriangle direction={card.delta.direction} />
            <span>{card.delta.value}</span>
            <span className="font-normal text-ink-subdued">vs. target</span>
          </div>
        )}
      </div>
    </button>
  );
}
