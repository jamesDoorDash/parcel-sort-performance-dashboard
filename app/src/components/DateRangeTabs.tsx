import { useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { dateRangeTabs, type DateRangeKey } from "../data/mock";
import { DateRangePicker } from "./DateRangePicker";

type Props = {
  value: DateRangeKey;
  onChange: (key: DateRangeKey) => void;
  selectedLabel: string;
  customRange: { start: Date; end: Date };
  onCustomRangeChange: (range: { start: Date; end: Date }) => void;
  hidePickerRangeLabel?: boolean;
  simpleCustomPill?: boolean;
  hideNextWeek?: boolean;
};

export function DateRangeTabs({
  value,
  onChange,
  selectedLabel,
  customRange,
  onCustomRangeChange,
  hidePickerRangeLabel,
  simpleCustomPill,
  hideNextWeek,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const isCustom = value === "custom";

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-button border border-line-hovered bg-white">
        {dateRangeTabs.filter((tab) => !hideNextWeek || tab.key !== "nextWeek").map((tab) => {
          const active = tab.key === value;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "relative -my-px h-10 rounded-button px-6 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
                active
                  ? "z-10 bg-white text-ink ring-2 ring-inset ring-ink"
                  : "text-ink-subdued hover:text-ink",
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
              "inline-flex h-10 items-center gap-2 rounded-button border border-line-hovered bg-white px-6 text-body-md-strong text-ink outline-none transition-colors hover:border-ink",
              pickerOpen && "ring-2 ring-inset ring-ink",
            )}
          >
            {!simpleCustomPill && <Calendar className="h-3.5 w-3.5 text-icon-subdued" strokeWidth={2} />}
            {selectedLabel}
            {simpleCustomPill && <ChevronDown className={cn("h-4 w-4 text-ink transition-transform", pickerOpen && "rotate-180")} strokeWidth={2} />}
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
            hideRangeLabel={hidePickerRangeLabel}
          />
        )}
      </div>
    </div>
  );
}
