import { useState } from "react";
import type { SorterV2 } from "../data/mockV2";

type Props = {
  sorters: SorterV2[];
  // Spoke uses "Dispatch rate"; default for hub is "Load rate".
  loadRateLabel?: string;
};

function SectionLabel({ label, tooltip }: { label: string; tooltip: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em] text-ink-subdued">{label}</span>
      {open && (
        <div className="pointer-events-none absolute top-full left-0 z-20 mt-2 w-[280px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
          <div className="text-body-sm text-white/80">{tooltip}</div>
          <div className="absolute bottom-full left-4 h-0 w-0 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
        </div>
      )}
    </div>
  );
}

export function AssociatesInsights({ sorters, loadRateLabel = "Load rate" }: Props) {
  // Top sorters: among associates meeting target, ranked by total parcels sorted (volume)
  const topSorters = sorters
    .filter((s) => s.meetsTargets)
    .sort((a, b) => b.parcelsSorted - a.parcelsSorted)
    .slice(0, 3);

  // Top loaders: among associates meeting target, ranked by total pallets loaded (volume)
  const topLoaders = sorters
    .filter((s) => s.meetsTargets)
    .sort((a, b) => b.palletsLoaded - a.palletsLoaded)
    .slice(0, 3);

  // Associates to coach: everyone below target, sorted by name
  const toCoach = sorters
    .filter((s) => !s.meetsTargets && s.belowTargetMetric)
    .sort((a, b) => a.name.localeCompare(b.name));

  const loadersLabel = loadRateLabel === "Dispatch rate" ? "Top dispatchers" : "Top loaders";

  return (
    <div className="grid grid-cols-3 gap-8 px-4 pb-4">
      {/* Top sorters — by volume */}
      <div>
        <SectionLabel
          label="Top sorters"
          tooltip="The 3 associates with the most parcels sorted in the selected period, among those meeting all targets."
        />
        <ol className="mt-3 space-y-1.5">
          {topSorters.map((s, i) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span className="w-3 text-body-sm font-bold text-ink-subdued">{i + 1}.</span>
              <span className="flex-1 truncate text-body-sm text-ink">{s.name}</span>
            </li>
          ))}
          {topSorters.length === 0 && (
            <li className="text-body-sm text-ink-subdued">No associates meeting target</li>
          )}
        </ol>
      </div>

      {/* Top loaders — by volume */}
      <div>
        <SectionLabel
          label={loadersLabel}
          tooltip={
            loadRateLabel === "Dispatch rate"
              ? "The 3 associates with the most bins dispatched in the selected period, among those meeting all targets."
              : "The 3 associates with the most pallets loaded in the selected period, among those meeting all targets."
          }
        />
        <ol className="mt-3 space-y-1.5">
          {topLoaders.map((s, i) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span className="w-3 text-body-sm font-bold text-ink-subdued">{i + 1}.</span>
              <span className="flex-1 truncate text-body-sm text-ink">{s.name}</span>
            </li>
          ))}
          {topLoaders.length === 0 && (
            <li className="text-body-sm text-ink-subdued">No associates meeting target</li>
          )}
        </ol>
      </div>

      {/* Associates to coach */}
      <div>
        <SectionLabel
          label="Associates to coach"
          tooltip="Associates who are below target on at least one metric in the selected period, with the metric they're behind on."
        />
        {toCoach.length === 0 ? (
          <div className="mt-3 text-body-sm text-ink-subdued">All associates on target</div>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {toCoach.map((s) => (
              <li key={s.id} className="truncate text-body-sm text-ink">{s.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
