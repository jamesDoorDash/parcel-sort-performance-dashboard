import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

// "Today" for the mockup.
const TODAY = new Date("2026-02-14T00:00:00");

// Days that have data in the mock. Outside of this range the user can
// still click but we just snap to the nearest available data.
const MIN_DATE = new Date("2026-02-02T00:00:00");
const MAX_DATE = new Date("2026-02-22T00:00:00");

type Props = {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function inRange(d: Date, start: Date, end: Date) {
  return d >= start && d <= end;
}

function monthName(d: Date) {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function buildMonthGrid(monthStart: Date) {
  // 6 rows × 7 cols grid. Start on Monday.
  const first = new Date(monthStart);
  const dayOfWeek = (first.getDay() + 6) % 7; // Mon = 0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOfWeek);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function DateRangePicker({ value, onChange, onClose, anchorRef }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(value.start));
  const [pending, setPending] = useState<{ start: Date; end: Date | null }>({
    start: value.start,
    end: value.end,
  });
  const [hover, setHover] = useState<Date | null>(null);

  // Click-away
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const handleDayClick = (d: Date) => {
    if (d < MIN_DATE || d > MAX_DATE) return;
    // Complete selection exists → start a new one
    if (pending.end !== null) {
      setPending({ start: d, end: null });
      return;
    }
    // Waiting for end date
    if (d < pending.start) {
      setPending({ start: d, end: pending.start });
    } else {
      setPending({ start: pending.start, end: d });
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 z-50 mt-2 w-[320px] rounded-card border border-line-hovered bg-white p-4 shadow-lg"
      style={{ boxShadow: "0 8px 24px rgba(17, 19, 24, 0.12)" }}
    >
      {/* Month header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-button text-icon-subdued hover:bg-surface-hovered hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="text-body-md-strong text-ink">{monthName(viewMonth)}</div>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-button text-icon-subdued hover:bg-surface-hovered hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7 text-center text-body-sm text-ink-subdued">
        {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d) => {
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isToday = isSameDay(d, TODAY);
          const isStart = isSameDay(d, pending.start);
          const isEnd = pending.end ? isSameDay(d, pending.end) : false;
          const inBetween =
            pending.end == null && hover
              ? inRange(d, pending.start < hover ? pending.start : hover, pending.start < hover ? hover : pending.start)
              : pending.end
                ? inRange(d, pending.start, pending.end)
                : false;
          const isSelectable = d >= MIN_DATE && d <= MAX_DATE;

          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!isSelectable}
              onClick={() => handleDayClick(d)}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "relative flex h-9 items-center justify-center text-body-md outline-none transition-colors",
                !inMonth && "text-ink-subdued/60",
                inMonth && isSelectable && !isStart && !isEnd && "text-ink",
                !isSelectable && "cursor-not-allowed text-[#c5c7cc]",
                inBetween && !isStart && !isEnd && "bg-surface-hovered",
                (isStart || isEnd) && "bg-ink font-bold text-white",
                isToday && !isStart && !isEnd && "ring-1 ring-inset ring-ink",
                isSelectable && !isStart && !isEnd && "hover:bg-surface-hovered",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-body-sm text-ink-subdued">
          {pending.end
            ? `${pending.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${pending.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "Select end date"}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-button border border-line-hovered px-3 text-body-md-strong text-ink hover:bg-surface-hovered"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!pending.end}
            onClick={() => {
              if (pending.end) {
                onChange({ start: pending.start, end: pending.end });
                onClose();
              }
            }}
            className={cn(
              "h-8 rounded-button px-3 text-body-md-strong",
              pending.end
                ? "bg-ink text-white hover:bg-black"
                : "cursor-not-allowed bg-line text-ink-subdued",
            )}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export { MIN_DATE as CUSTOM_MIN_DATE, MAX_DATE as CUSTOM_MAX_DATE };
