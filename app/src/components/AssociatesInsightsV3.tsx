import { useState } from "react";
import type { SorterV2 } from "../data/mockV2";

type Props = {
  sorters: SorterV2[];
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

export function AssociatesInsightsV3({ sorters, loadRateLabel = "Load rate" }: Props) {
  const topSorters = sorters
    .filter((s) => s.meetsTargets)
    .sort((a, b) => b.parcelsSorted - a.parcelsSorted)
    .slice(0, 3);

  const topLoaders = sorters
    .filter((s) => s.meetsTargets)
    .sort((a, b) => b.palletsLoaded - a.palletsLoaded)
    .slice(0, 3);

  const notMeeting = sorters.filter((s) => !s.meetsTargets).length;

  const loadersLabel = loadRateLabel === "Dispatch rate" ? "Top dispatchers" : "Top loaders";

  return (
    <div className="grid grid-cols-3 gap-8 px-4 pb-4">
      {/* Top sorters */}
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

      {/* Top loaders */}
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

      {/* Associates not meeting targets — count + above-target pill */}
      <div>
        <SectionLabel
          label="Associates not meeting targets"
          tooltip="Number of associates below target on at least one metric in the selected period. Target is 0."
        />
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-[24px] leading-[28px] font-bold tracking-[-0.01em] text-ink">{notMeeting}</span>
          {notMeeting === 0 ? (
            <span className="text-[14px] leading-[20px] font-normal text-ink-subdued">At target</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
              <svg aria-hidden viewBox="0 0 8 7" className="h-2 w-2" fill="currentColor"><path d="M4 0 8 7H0z" /></svg>
              {notMeeting} above target
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
