import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, AlertTriangle, Info } from "lucide-react";
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
  | "meetsTargets";

type Props = {
  sorters: SorterV2[];
};

const WEIGHTED_RATE_TOOLTIP = "2lb+ parcels count 1.8x.";

function HeaderCell({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  showInfo,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  showInfo?: boolean;
}) {
  const active = activeSortKey === sortKey;
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <th className="border-b border-line bg-[#fafafa] px-4 py-3 text-left text-body-sm-strong text-ink first:rounded-tl-[12px] last:rounded-tr-[12px]">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1.5">
          <span>{label}</span>
          {active &&
            (sortDir === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
            ))}
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
              <div className="absolute top-full left-1/2 z-30 mt-2 -translate-x-1/2 rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg whitespace-nowrap">
                <div className="text-body-sm text-white/80">{WEIGHTED_RATE_TOOLTIP}</div>
                <div className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

export function SortersTableV3({ sorters }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const items = [...sorters];
    items.sort((a, b) => {
      const av = a[sortKey] as string | number | boolean;
      const bv = b[sortKey] as string | number | boolean;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      if (typeof av === "boolean" && typeof bv === "boolean") return av === bv ? 0 : av ? -1 : 1;
      return String(av).localeCompare(String(bv));
    });
    if (sortDir === "desc") items.reverse();
    return items;
  }, [sorters, sortDir, sortKey]);

  const meetingCount = sorters.filter((sorter) => sorter.meetsTargets).length;

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
      <div className="mb-3 flex items-end justify-between">
        <h3 className="text-body-lg-strong text-ink">{sorters.length} sorters active</h3>
        <div className="flex items-end gap-1 text-body-sm text-ink-subdued">
          <span className="text-body-lg-strong text-ink">
            {meetingCount} / {sorters.length}
          </span>
          <span>meeting targets</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-line-hovered bg-white">
        <table className="min-w-max w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <HeaderCell label="Name" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Pre-sort rate" sortKey="parcelPreSortRate" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} showInfo />
              <HeaderCell label="Sort rate" sortKey="parcelSortRate" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} showInfo />
              <HeaderCell label="Parcels sorted" sortKey="parcelsSorted" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Missorted" sortKey="parcelsMissorted" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Lost" sortKey="parcelsLost" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Load rate" sortKey="palletRate" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <HeaderCell label="Pallets loaded" sortKey="palletsLoaded" activeSortKey={sortKey} sortDir={sortDir} onSort={onSort} />
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
                  {sorter.parcelPreSortRate} / hr
                </td>
                <td className={cn(
                  "whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink",
                  sorter.belowTargetMetric === "parcelSortRate" && "font-bold text-negative",
                )}>
                  {sorter.parcelSortRate} / hr
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
                  {sorter.palletRate} / hr
                </td>
                <td className="whitespace-nowrap border-b border-line px-4 py-3 text-body-sm text-ink">{sorter.palletsLoaded}</td>
                <td className="whitespace-nowrap border-b border-line px-4 py-3">
                  {sorter.meetsTargets ? (
                    <span className="inline-flex items-center gap-1 rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                      Meets targets
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
                      <AlertTriangle className="h-3 w-3" strokeWidth={2.25} />
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
