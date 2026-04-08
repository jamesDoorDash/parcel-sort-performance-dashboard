import { useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "../lib/cn";
import { dateRangeTabs, type DateRangeKey } from "../data/mock";
import { DateRangePicker } from "./DateRangePicker";

type Props = {
  value: DateRangeKey;
  onChange: (key: DateRangeKey) => void;
  selectedLabel: string;
  customRange: { start: Date; end: Date };
  onCustomRangeChange: (range: { start: Date; end: Date }) => void;
};

export function DateRangeTabs({
  value,
  onChange,
  selectedLabel,
  customRange,
  onCustomRangeChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const isCustom = value === "custom";

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-button border border-line-hovered bg-white">
        {dateRangeTabs.map((tab) => {
          const active = tab.key === value;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "relative -my-px h-[34px] rounded-button px-3 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
                active
                  ? "z-10 border border-ink bg-white text-ink"
                  : "border border-transparent text-ink-subdued hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        {isCustom ? (
          <button
            ref={pillRef}
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-button border border-line-hovered bg-white px-3 text-body-md-strong text-ink outline-none transition-colors hover:border-ink",
              pickerOpen && "border-ink",
            )}
          >
            <Calendar className="h-3.5 w-3.5 text-icon-subdued" strokeWidth={2} />
            {selectedLabel}
          </button>
        ) : (
          <span className="text-body-md text-ink-subdued">{selectedLabel}</span>
        )}
        {isCustom && pickerOpen && (
          <DateRangePicker
            value={customRange}
            onChange={onCustomRangeChange}
            onClose={() => setPickerOpen(false)}
            anchorRef={pillRef}
          />
        )}
      </div>
    </div>
  );
}
