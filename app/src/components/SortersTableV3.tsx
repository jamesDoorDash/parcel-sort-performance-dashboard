import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, AlertTriangle, Info, Search } from "lucide-react";
import { cn } from "../lib/cn";
import type { SorterV2 } from "../data/mockV2";

type SortKey =
  | "name"
  | "parcelPreSortRate"
  | "parcelSortRate"
  | "parcelsSorted"
  | "parcelsMissorted"
  | "parcelsLost"
  | "palletRate"
  | "palletsLoaded"
  | "idleTime"
  | "meetsTargets";

type Props = {
  sorters: SorterV2[];
  hideStatusIcons?: boolean;
  showFilters?: boolean;
  hideRateSelectors?: boolean;
  inlineHeader?: boolean;
  hideHeader?: boolean;
  noBorderTable?: boolean;
  searchPadding?: boolean;
  defaultSortKey?: SortKey;
  defaultSortDir?: "asc" | "desc";
};

const WEIGHTED_RATE_TOOLTIP = "Parcels greater than 2 lbs count 1.8x towards sort rate";

function HeaderCell({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  showInfo,
  infoTooltip,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  showInfo?: boolean;
  infoTooltip?: string | { title: string; body: string };
}) {
  const active = activeSortKey === sortKey;
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <th className="border-b border-line bg-[#fafafa] px-4 py-3 text-left text-body-sm-strong text-ink first:rounded-tl-[12px] last:rounded-tr-[12px]">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1.5">
          <span>{label}</span>
        </button>
        {showInfo && (
          <div className="relative flex items-center self-center">
            <button
              type="button"
              className="flex h-4 w-4 items-center justify-center text-ink-subdued"
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
            >
              <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            {tooltipOpen && (
              <div className="absolute top-full left-1/2 z-30 mt-2 w-[260px] -translate-x-1/2 rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
                {typeof infoTooltip === "object" ? (
                  <>
                    <div className="text-body-sm-strong text-white">{infoTooltip.title}</div>
                    <div className="mt-1 text-body-sm text-white/80">{infoTooltip.body}</div>
                  </>
                ) : (
                  <div className="text-body-sm text-white/80">{infoTooltip ?? WEIGHTED_RATE_TOOLTIP}</div>
                )}
                <div className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
              </div>
            )}
          </div>
        )}
        {active &&
          (sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
          ))}
      </div>
    </th>
  );
}

export function SortersTableV3({ sorters, hideStatusIcons, showFilters, hideRateSelectors, inlineHeader, hideHeader, noBorderTable, searchPadding, defaultSortKey, defaultSortDir }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>(defaultSortKey ?? "name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir ?? "asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [rateType, setRateType] = useState<"average" | "max">("average");
  const [parcelType, setParcelType] = useState<"blended" | "small" | "large">("blended");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorters;
    const q = searchQuery.toLowerCase();
    return sorters.filter((s) => s.name.toLowerCase().includes(q));
  }, [sorters, searchQuery]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a, b) => {
      const av = a[sortKey] as string | number | boolean;
      const bv = b[sortKey] as string | number | boolean;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      if (typeof av === "boolean" && typeof bv === "boolean") return av === bv ? 0 : av ? -1 : 1;
      return String(av).localeCompare(String(bv));
    });
    if (sortDir === "desc") items.reverse();
    return items;
  }, [filtered, sortDir, sortKey]);

  const meetingCount = sorters.filter((sorter) => sorter.meetsTargets).length;

  // Derive variant rates from base values
  const getRate = (base: number, sorterName: string, field: string) => {
    // Deterministic seed from name+field
    let h = 0;
    const s = `${sorterName}-${field}`;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    const seed = (h >>> 0) % 100;

    // Parcel type multiplier
    const parcelMult = parcelType === "small" ? 1.15 + (seed % 10) / 100
      : parcelType === "large" ? 0.75 + (seed % 15) / 100
      : 1;

    // Rate type: max adds 10-25% on top
    const rateMult = rateType === "max" ? 1.1 + (seed % 16) / 100 : 1;

    return Math.round(base * parcelMult * rateMult);
  };

  const getPreSortRate = (s: SorterV2) => showFilters ? getRate(s.parcelPreSortRate, s.name, "presort") : s.parcelPreSortRate;
  const getSortRate = (s: SorterV2) => showFilters ? getRate(s.parcelSortRate, s.name, "sort") : s.parcelSortRate;
  const getLoadRate = (s: SorterV2) => showFilters && rateType === "max" ? getRate(s.palletRate, s.name, "load") : s.palletRate;

  const onSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir("asc");
  };

  return (
    <div>
      {!showFilters && !hideHeader && (
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-body-lg-strong text-ink">{sorters.length} workers active</h3>
          <div className="flex items-end gap-1 text-body-sm text-ink-subdued">
            <span className="text-body-lg-strong text-ink">
              {meetingCount} / {sorters.length}
            </span>
            <span>meeting targets</span>
          </div>
        </div>
      )}

      {showFilters && (
        <div className={searchPadding ? "px-4" : ""}>
        <>
        {hideRateSelectors ? (
          <div className={`mb-4 flex items-center ${hideHeader ? "" : "justify-between"}`}>
            {!hideHeader && (inlineHeader ? (
              <div className="flex flex-col">
                <span className="text-[18px] leading-[24px] font-bold tracking-[-0.01em] text-ink">Active associates</span>
                <span className="text-body-sm text-ink-subdued">{meetingCount} / {sorters.length} meeting targets</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[18px] leading-[24px] font-bold tracking-[-0.01em] text-ink">Active associates</span>
                <span className="text-body-sm text-ink-subdued">{meetingCount} / {sorters.length} meeting targets</span>
              </div>
            ))}
            <div className={`relative ${hideHeader ? "w-full" : ""}`}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subdued" strokeWidth={2} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name"
                className={`h-10 rounded-button border border-line-hovered bg-white pl-9 pr-3 text-body-md text-ink outline-none placeholder:text-ink-subdued focus:border-ink ${hideHeader ? "w-full" : "w-[330px]"}`}
              />
            </div>
          </div>
        ) : (
        <>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-body-lg-strong text-ink">Active associates</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-body-lg-strong text-ink">{meetingCount} / {sorters.length}</span>
            <span className="text-body-sm text-ink-subdued">meeting targets</span>
          </div>
        </div>
        <div className="mb-2 flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subdued" strokeWidth={2} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name"
                className="h-10 w-full rounded-button border border-line-hovered bg-white pl-9 pr-3 text-body-md text-ink outline-none placeholder:text-ink-subdued focus:border-ink"
              />
            </div>

            {/* Rate type selector */}
            <div className="inline-flex items-center rounded-button border border-line-hovered bg-white">
              {(["average", "max"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRateType(t)}
                  className={cn(
                    "relative -my-px h-10 rounded-button px-6 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
                    rateType === t
                      ? "z-10 bg-white text-ink ring-2 ring-inset ring-ink"
                      : "text-ink-subdued hover:text-ink",
                  )}
                >
                  {t === "average" ? "Average rate" : "Max rate"}
                </button>
              ))}
            </div>

            {/* Parcel type selector */}
            <div className="inline-flex items-center rounded-button border border-line-hovered bg-white">
              {([
                { key: "blended" as const, label: "Blended average" },
                { key: "small" as const, label: "Small parcels" },
                { key: "large" as const, label: "Large parcels" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setParcelType(opt.key)}
                  className={cn(
                    "relative -my-px h-10 rounded-button px-6 text-body-md-strong transition-colors first:-ml-px last:-mr-px",
                    parcelType === opt.key
                      ? "z-10 bg-white text-ink ring-2 ring-inset ring-ink"
                      : "text-ink-subdued hover:text-ink",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
        </div>
        </>
        )}
        </>
        </div>
      )}

      <div className={`overflow-x-auto ${noBorderTable ? "[&_th]:!rounded-none" : "rounded-card border border-line-hovered"} bg-white`}>
        <table className="min-w-max w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <HeaderCell label="Name" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Pre-sort rate" sortKey="parcelPreSortRate" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} showInfo infoTooltip={!hideRateSelectors ? {
                title: `${rateType === "max" ? "Max" : "Avg."} pre-sort rate · ${parcelType === "small" ? "Small" : parcelType === "large" ? "Large" : "Blended"}`,
                body: parcelType === "blended"
                  ? "Weighted across all sizes — parcels over 2 lbs count 1.8x toward the rate."
                  : parcelType === "small"
                  ? "Only parcels under 2 lbs. No weighting applied."
                  : "Only parcels 2 lbs and over, each counted at 1.8x weight.",
              } : undefined} />
              <HeaderCell label="Sort rate" sortKey="parcelSortRate" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} showInfo infoTooltip={!hideRateSelectors ? {
                title: `${rateType === "max" ? "Max" : "Avg."} sort-to-pallet rate · ${parcelType === "small" ? "Small" : parcelType === "large" ? "Large" : "Blended"}`,
                body: parcelType === "blended"
                  ? "Weighted across all sizes — parcels over 2 lbs count 1.8x toward the rate."
                  : parcelType === "small"
                  ? "Only parcels under 2 lbs. No weighting applied."
                  : "Only parcels 2 lbs and over, each counted at 1.8x weight.",
              } : undefined} />
              <HeaderCell label="Parcels sorted" sortKey="parcelsSorted" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Missorted" sortKey="parcelsMissorted" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Lost" sortKey="parcelsLost" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Load rate" sortKey="palletRate" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} showInfo={!hideRateSelectors} infoTooltip={!hideRateSelectors ? {
                title: `${rateType === "max" ? "Max" : "Avg."} pallet load rate`,
                body: "Pallets loaded to truck per hour. Not affected by parcel size selection.",
              } : undefined} />
              <HeaderCell label="Pallets loaded" sortKey="palletsLoaded" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Idle time" sortKey="idleTime" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} showInfo infoTooltip={!hideRateSelectors ? {
                title: "Idle time",
                body: "Time signed in but not actively sorting, loading, or scanning. Includes breaks and wait time between tasks.",
              } : "Time a worker is signed in but not actively sorting, loading, or scanning"} />
              <HeaderCell label="Target status" sortKey="meetsTargets" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((sorter, index) => (
              <tr key={sorter.id} className={cn("transition-colors hover:bg-surface-hovered", index > 0 && "border-t border-line")}>
                <td className="whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink">{sorter.name}</td>
                <td className={cn(
                  "whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink",
                  sorter.belowTargetMetric === "parcelPreSortRate" && "font-bold text-negative",
                )}>
                  {getPreSortRate(sorter)} / hr
                </td>
                <td className={cn(
                  "whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink",
                  sorter.belowTargetMetric === "parcelSortRate" && "font-bold text-negative",
                )}>
                  {getSortRate(sorter)} / hr
                </td>
                <td className="whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink">{sorter.parcelsSorted.toLocaleString()}</td>
                <td className={cn(
                  "whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink",
                  sorter.belowTargetMetric === "parcelsMissorted" && "font-bold text-negative",
                )}>
                  {sorter.parcelsMissorted}
                </td>
                <td className={cn(
                  "whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink",
                  sorter.belowTargetMetric === "parcelsLost" && "font-bold text-negative",
                )}>
                  {sorter.parcelsLost}
                </td>
                <td className={cn(
                  "whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink",
                  sorter.belowTargetMetric === "palletRate" && "font-bold text-negative",
                )}>
                  {getLoadRate(sorter)} / hr
                </td>
                <td className="whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink">{sorter.palletsLoaded}</td>
                <td className="whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink">{sorter.idleTime} hrs</td>
                <td className="whitespace-nowrap border-b border-line px-4 py-3">
                  {sorter.meetsTargets ? (
                    <span className="inline-flex items-center gap-1 rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">
                      {!hideStatusIcons && <Check className="h-3 w-3" strokeWidth={2.5} />}
                      Meets targets
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
                      {!hideStatusIcons && <AlertTriangle className="h-3 w-3" strokeWidth={2.25} />}
                      <span>Below target</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
