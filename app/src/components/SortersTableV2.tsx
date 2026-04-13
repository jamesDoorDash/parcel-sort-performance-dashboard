import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Check, AlertTriangle, Info } from "lucide-react";
import type { SorterV2 } from "../data/mockV2";
import { cn } from "../lib/cn";

type Props = {
  sorters: SorterV2[];
};

type SortKey = "name" | "parcelRate" | "parcelsSorted" | "parcelsMissorted" | "parcelsLost" | "palletRate" | "palletsLoaded" | "meetsTargets";

const BLENDED_TOOLTIP = "2lb + parcels count 1.8x.";

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
  const [tipOpen, setTipOpen] = useState(false);
  const isActive = activeSortKey === sortKey;

  return (
    <th className="relative whitespace-nowrap border-b border-line bg-[#fafafa] px-6 py-3 text-left text-body-md-strong text-ink first:rounded-tl-[12px] last:rounded-tr-[12px]">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="inline-flex items-center gap-1.5 outline-none focus:outline-none"
        >
          <span className="text-body-md-strong text-ink">{label}</span>
          {isActive &&
            (sortDir === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
            ))}
        </button>
        {showInfo && (
          <div className="relative">
            <button
              type="button"
              className="text-ink-subdued"
              onMouseEnter={() => setTipOpen(true)}
              onMouseLeave={() => setTipOpen(false)}
            >
              <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            {tipOpen && (
              <div className="absolute top-full left-1/2 z-30 mt-2 w-[260px] -translate-x-1/2 rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
                <div className="text-body-sm-strong text-white">Blended average</div>
                <div className="mt-0.5 text-body-sm text-white/80">{BLENDED_TOOLTIP}</div>
                <div className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

export function SortersTableV2({ sorters }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const copy = [...sorters];
    copy.sort((a, b) => {
      const av = a[sortKey] as number | string | boolean;
      const bv = b[sortKey] as number | string | boolean;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      if (typeof av === "boolean" && typeof bv === "boolean") return av === bv ? 0 : av ? -1 : 1;
      return String(av).localeCompare(String(bv));
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [sorters, sortKey, sortDir]);

  const meeting = sorters.filter((s) => s.meetsTargets).length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const colProps = { activeSortKey: sortKey, sortDir, onSort: handleSort };

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-title-md text-ink">{sorters.length} sorters active</h3>
        <div className="flex items-baseline gap-1.5 text-body-md">
          <span className="text-body-md-strong text-ink">
            {meeting} / {sorters.length}
          </span>
          <span className="text-ink-subdued">meeting targets</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-card border border-line-hovered bg-white">
        <table className="min-w-max w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <HeaderCell label="Name" sortKey="name" {...colProps} />
              <HeaderCell label="Parcel rate" sortKey="parcelRate" showInfo {...colProps} />
              <HeaderCell label="Parcels sorted" sortKey="parcelsSorted" {...colProps} />
              <HeaderCell label="Missorted" sortKey="parcelsMissorted" {...colProps} />
              <HeaderCell label="Lost" sortKey="parcelsLost" {...colProps} />
              <HeaderCell label="Pallet rate" sortKey="palletRate" showInfo {...colProps} />
              <HeaderCell label="Pallets loaded" sortKey="palletsLoaded" {...colProps} />
              <HeaderCell label="Target status" sortKey="meetsTargets" {...colProps} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr
                key={s.id}
                className={cn(
                  "border-t border-line transition-colors hover:bg-surface-hovered",
                  i === 0 && "border-t",
                )}
              >
                <td className="whitespace-nowrap px-6 py-4 text-body-md text-ink">{s.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-body-md text-ink">{s.parcelRate} / hr</td>
                <td className="whitespace-nowrap px-6 py-4 text-body-md text-ink">{s.parcelsSorted.toLocaleString()}</td>
                <td className="whitespace-nowrap px-6 py-4 text-body-md text-ink">{s.parcelsMissorted}</td>
                <td className="whitespace-nowrap px-6 py-4 text-body-md text-ink">{s.parcelsLost}</td>
                <td className="whitespace-nowrap px-6 py-4 text-body-md text-ink">{s.palletRate} / hr</td>
                <td className="whitespace-nowrap px-6 py-4 text-body-md text-ink">{s.palletsLoaded}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  {s.meetsTargets ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">
                      <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                      Meets targets
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
                      <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                      Below target
                    </span>
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
