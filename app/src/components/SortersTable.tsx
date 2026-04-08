import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Check, AlertTriangle } from "lucide-react";
import type { Sorter } from "../data/mock";
import { cn } from "../lib/cn";

type Props = {
  sorters: Sorter[];
};

type SortKey = "name" | "preSort" | "sort" | "load" | "missort" | "loss" | "meetsTargets";

const columns: { key: SortKey; label: string; align?: "left" | "right" }[] = [
  { key: "name", label: "Name", align: "left" },
  { key: "preSort", label: "Pre-sort speed" },
  { key: "sort", label: "Sort speed" },
  { key: "load", label: "Load speed" },
  { key: "missort", label: "Missort rate" },
  { key: "loss", label: "Loss rate" },
  { key: "meetsTargets", label: "Target status" },
];

export function SortersTable({ sorters }: Props) {
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
      <div className="overflow-hidden rounded-card border border-line-hovered bg-white shadow-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line bg-[#fafafa]">
              {columns.map((col) => {
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className="px-6 py-3 text-left text-body-md-strong text-ink"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1.5 outline-none focus:outline-none"
                    >
                      <span className="text-body-md-strong text-ink">{col.label}</span>
                      {isActive &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
                        ))}
                    </button>
                  </th>
                );
              })}
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
                <td className="px-6 py-4 text-body-md text-ink">{s.name}</td>
                <td className="px-6 py-4 text-body-md text-ink">{s.preSort} / hr</td>
                <td className="px-6 py-4 text-body-md text-ink">{s.sort} / hr</td>
                <td className="px-6 py-4 text-body-md text-ink">{s.load} / hr</td>
                <td className="px-6 py-4 text-body-md text-ink">{s.missort.toFixed(1)}%</td>
                <td className="px-6 py-4 text-body-md text-ink">{s.loss.toFixed(2)} %</td>
                <td className="px-6 py-4">
                  {s.meetsTargets ? (
                    <span className="inline-flex items-center gap-1 rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                      Meets targets
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
                      <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                      Below targets
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
