import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Truck,
  Package,
  Undo2,
  Settings,
  ChevronUp,
  ChevronDown,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "../lib/cn";
import { hubMeta } from "../data/mock";

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  children?: { key: string; label: string }[];
};

const nav: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={1.75} /> },
  { key: "performance", label: "Performance", icon: <BarChart3 className="h-[18px] w-[18px]" strokeWidth={1.75} /> },
  {
    key: "trucks",
    label: "Trucks",
    icon: <Truck className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    children: [
      { key: "allTrucks", label: "All trucks" },
      { key: "inbound", label: "Inbound" },
      { key: "outbound", label: "Outbound" },
    ],
  },
  { key: "parcels", label: "All parcels", icon: <Package className="h-[18px] w-[18px]" strokeWidth={1.75} /> },
  { key: "returns", label: "Returns", icon: <Undo2 className="h-[18px] w-[18px]" strokeWidth={1.75} /> },
  { key: "admin", label: "Admin", icon: <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} /> },
];

const VERSION_OPTIONS = [
  { value: "V1", label: "V1: Original", hidden: true },
  { value: "V2", label: "V2: Rate separated", hidden: true },
  { value: "V3", label: "V3: One page", hidden: true },
  { value: "V4", label: "V4: Tabbed", hidden: true },
  { value: "V5", label: "V5: Chart on top", hidden: true },
  { value: "V6", label: "V6: Sectioned", hidden: true },
  { value: "V7", label: "V7: Metrics above chart", hidden: true },
  { value: "V8", label: "V8: Red left border", hidden: true },
  { value: "V9", label: "V9: Status pill", hidden: true },
  { value: "V10", label: "V10: Delta tag", hidden: true },
  { value: "V11", label: "V11: Tag w/ hover", hidden: true },
  { value: "V12", label: "V12: Post Crit", hidden: true },
  { value: "V13", label: "V13: Off track tag", hidden: true },
  { value: "V14", label: "V14: Metric cards", hidden: true },
  { value: "V15", label: "V15: Status dot", hidden: true },
  { value: "V16", label: "V16: Left color bar", hidden: true },
  { value: "V17", label: "V17: Extreme tag call out" },
  { value: "V18", label: "V18: Background tint", hidden: true },
  { value: "V19", label: "V19: V7 delta sizing", hidden: true },
  { value: "V20", label: "V20: Red-only delta", hidden: true },
  { value: "V21", label: "V21: V12 red-only", hidden: true },
  { value: "V22", label: "V22: Red num, gray text", hidden: true },
  { value: "V23", label: "V23: Normal tag" },
  { value: "V24", label: "V24: Full red bold line" },
  { value: "V25", label: "V25: Merchant subsystem" },
  { value: "V26", label: "V26: Tabbed" },
  { value: "V27", label: "V27: Show chart bttn" },
];

type Props = {
  active: string;
  onSelect: (key: string) => void;
  version: string;
  onVersionChange: (v: string) => void;
};

export function Sidebar({ active, onSelect, version, onVersionChange }: Props) {
  const [trucksOpen, setTrucksOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
      const list = VERSION_OPTIONS.filter((o) => showAll || !o.hidden).map((o) => o.value);
      const idx = list.indexOf(version);
      if (e.key === "ArrowDown") onVersionChange(list[Math.min(idx + 1, list.length - 1)]);
      else onVersionChange(list[Math.max(idx - 1, 0)]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [version, showAll, onVersionChange]);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-white">
      {/* Header — hub + time */}
      <div className="px-8 pt-8 pb-6">
        <div className="text-title-md text-ink">{hubMeta.id}</div>
        <div className="mt-1 text-body-md text-ink-subdued">{hubMeta.localTime}</div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-hidden px-4">
        {nav.map((item) => {
          const isActive =
            active === item.key || (item.key === "trucks" && active.startsWith("trucks-"));
          const hasChildren = !!item.children;
          if (hasChildren) {
            return (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => setTrucksOpen((v) => !v)}
                  className={cn(
                    "flex h-12 w-full items-center gap-3 rounded-button px-3 text-left transition-colors",
                    "text-ink-subdued hover:bg-surface-hovered hover:text-ink",
                  )}
                >
                  <span className="text-icon-subdued">{item.icon}</span>
                  <span className="flex-1 text-body-md">{item.label}</span>
                  <span className="text-icon-subdued">
                    {trucksOpen ? (
                      <ChevronUp className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="h-4 w-4" strokeWidth={2} />
                    )}
                  </span>
                </button>
                {trucksOpen && (
                  <div className="pb-1">
                    {item.children!.map((child) => {
                      const childActive = active === `trucks-${child.key}`;
                      return (
                        <button
                          type="button"
                          key={child.key}
                          onClick={() => onSelect(`trucks-${child.key}`)}
                          className={cn(
                            "ml-10 flex h-10 items-center rounded-button pr-3 pl-3 text-left transition-colors",
                            "w-[calc(100%-2.5rem)]",
                            childActive
                              ? "bg-surface-hovered text-body-md-strong text-ink"
                              : "text-ink-subdued hover:bg-surface-hovered hover:text-ink",
                          )}
                        >
                          <span className={childActive ? "text-body-md-strong" : "text-body-md"}>
                            {child.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return (
            <button
              type="button"
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex h-12 w-full items-center gap-3 rounded-button px-3 text-left transition-colors",
                isActive
                  ? "bg-surface-hovered text-ink"
                  : "text-ink-subdued hover:bg-surface-hovered hover:text-ink",
              )}
            >
              <span className={isActive ? "text-icon" : "text-icon-subdued"}>{item.icon}</span>
              <span className={cn("flex-1", isActive ? "text-body-md-strong" : "text-body-md")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Version selector + collapse */}
      <div className="flex flex-col border-t border-line">
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-1">
          <div className="rounded-card bg-ink px-3 py-3">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <div>
              <p className="text-body-sm-strong text-white">Prototype version</p>
              <p className="text-body-sm text-white/50">{showAll ? "All versions" : "Top contenders"}</p>
            </div>
            <button type="button" onClick={() => setShowAll((s) => !s)} className="text-body-sm text-white underline hover:text-white/80 transition-colors">
              {showAll ? "Show less" : "Show all"}
            </button>
          </div>
          <fieldset className="space-y-1">
            {VERSION_OPTIONS.filter((o) => showAll || !o.hidden).map((option) => {
              const checked = option.value === version;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex h-9 w-full cursor-pointer items-center gap-2 rounded-button px-3 transition-colors",
                    checked
                      ? "bg-white text-ink"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <input
                    type="radio"
                    name="prototype-version"
                    value={option.value}
                    checked={checked}
                    onChange={() => onVersionChange(option.value)}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className={checked ? "text-body-sm-strong" : "text-body-sm"}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </fieldset>
          </div>
        </div>
        <div className="px-4 py-1">
          <button
            type="button"
            className="flex h-12 w-full items-center gap-3 rounded-button px-3 text-left text-ink-subdued hover:bg-surface-hovered hover:text-ink"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-body-md">Collapse menu</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
