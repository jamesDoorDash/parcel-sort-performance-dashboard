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

function sorterQualityScore(s: SorterV2) {
  // Higher is better. Combines sort rate, throughput, and quality (missort/lost penalties).
  const sortGain = Math.max(0, s.parcelSortRate - 110) / 110;
  const volume = s.parcelsSorted / 1000;
  const missortRate = s.parcelsMissorted / Math.max(1, s.parcelsSorted);
  const lostRate = s.parcelsLost / Math.max(1, s.parcelsSorted);
  return s.parcelSortRate + volume * 5 - missortRate * 1500 - lostRate * 8000 + sortGain * 20;
}

function loaderQualityScore(s: SorterV2) {
  // Higher is better. Combines load rate, pallets loaded, and missload penalty.
  // (Missload count not separately tracked per associate; proxied via parcelsLost as quality signal.)
  const volume = s.palletsLoaded / 100;
  const missloadProxy = s.parcelsLost / Math.max(1, s.parcelsSorted);
  return s.palletRate + volume * 4 - missloadProxy * 4000;
}

function improvementScore(s: SorterV2) {
  // Higher = more in need of improvement. Combines rate gaps, quality issues, and idle time.
  const sortGap = Math.max(0, (110 - s.parcelSortRate) / 110);
  const loadGap = Math.max(0, (110 - s.palletRate) / 110);
  const preSortGap = Math.max(0, (85 - s.parcelPreSortRate) / 85);
  const missortRate = s.parcelsMissorted / Math.max(1, s.parcelsSorted);
  const lostRate = s.parcelsLost / Math.max(1, s.parcelsSorted);
  const idle = s.idleTime / 24;
  return sortGap + loadGap + preSortGap + missortRate * 8 + lostRate * 40 + idle * 0.5;
}

export function AssociatesInsightsV41({ sorters, loadRateLabel = "Load rate" }: Props) {
  const topSorters = [...sorters]
    .sort((a, b) => sorterQualityScore(b) - sorterQualityScore(a))
    .slice(0, 3);

  const topLoaders = [...sorters]
    .sort((a, b) => loaderQualityScore(b) - loaderQualityScore(a))
    .slice(0, 3);

  const needsImprovement = [...sorters]
    .sort((a, b) => improvementScore(b) - improvementScore(a))
    .slice(0, 3);

  const loadersLabel = loadRateLabel === "Dispatch rate" ? "Top dispatchers" : "Top loaders";
  const loadersTooltip =
    loadRateLabel === "Dispatch rate"
      ? "The 3 associates ranked best on a combination of dispatch rate, bins dispatched, and pallet load quality (missloaded pallets)."
      : "The 3 associates ranked best on a combination of load rate, pallets loaded, and load quality";

  return (
    <div className="grid grid-cols-3 gap-4 px-4 pb-4">
      <div className="rounded-[8px] border border-line-hovered bg-white px-4 py-3">
        <SectionLabel
          label="Top sorters"
          tooltip="The 3 associates ranked best on a combination of sort rate, parcels sorted, missorts, and lost items."
        />
        <ol className="mt-3 space-y-1.5">
          {topSorters.map((s, i) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span className="w-3 text-body-sm font-bold text-ink-subdued">{i + 1}.</span>
              <span className="flex-1 truncate text-body-sm text-ink">{s.name}</span>
            </li>
          ))}
          {topSorters.length === 0 && (
            <li className="text-body-sm text-ink-subdued">No associates</li>
          )}
        </ol>
      </div>

      <div className="rounded-[8px] border border-line-hovered bg-white px-4 py-3">
        <SectionLabel label={loadersLabel} tooltip={loadersTooltip} />
        <ol className="mt-3 space-y-1.5">
          {topLoaders.map((s, i) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span className="w-3 text-body-sm font-bold text-ink-subdued">{i + 1}.</span>
              <span className="flex-1 truncate text-body-sm text-ink">{s.name}</span>
            </li>
          ))}
          {topLoaders.length === 0 && (
            <li className="text-body-sm text-ink-subdued">No associates</li>
          )}
        </ol>
      </div>

      <div className="rounded-[8px] border border-line-hovered bg-white px-4 py-3">
        <SectionLabel
          label="Most in need of coaching"
          tooltip="The 3 most underperforming associates based on a combination of sort rates, load rates, missloads, missorts, lost items, idle time, and other quality metrics."
        />
        <ol className="mt-3 space-y-1.5">
          {needsImprovement.map((s, i) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span className="w-3 text-body-sm font-bold text-ink-subdued">{i + 1}.</span>
              <span className="flex-1 truncate text-body-sm text-ink">{s.name}</span>
            </li>
          ))}
          {needsImprovement.length === 0 && (
            <li className="text-body-sm text-ink-subdued">No associates</li>
          )}
        </ol>
      </div>
    </div>
  );
}
