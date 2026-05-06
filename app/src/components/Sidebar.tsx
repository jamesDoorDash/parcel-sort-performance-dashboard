import { useEffect, useRef, useState } from "react";
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
  Search,
} from "lucide-react";
import { cn } from "../lib/cn";
import { hubMeta } from "../data/mock";
import type { Facility } from "../App";

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
  { value: "V17", label: "V17: Extreme tag call out", hidden: true },
  { value: "V18", label: "V18: Background tint", hidden: true },
  { value: "V19", label: "V19: V7 delta sizing", hidden: true },
  { value: "V20", label: "V20: Red-only delta", hidden: true },
  { value: "V21", label: "V21: V12 red-only", hidden: true },
  { value: "V22", label: "V22: Red num, gray text", hidden: true },
  { value: "V23", label: "V23: Normal tag", hidden: true },
  { value: "V24", label: "V24: Full red bold line", hidden: true },
  { value: "V25", label: "V25: Merchant subsystem", hidden: true },
  { value: "V26", label: "V26: Tabbed", hidden: true },
  { value: "V27", label: "V27: Show chart bttn", hidden: true },
  { value: "V28", label: "V28: Dwell chart", hidden: true },
  { value: "V29", label: "V29: Dwell chart combo", hidden: true },
  { value: "V30", label: "V30: Condensed", hidden: true },
  { value: "V31", label: "V31: Cond. w/ search", hidden: true },
  { value: "V32", label: "V32: Cond. extreme tags", hidden: true },
  { value: "V33", label: "V33: Cond. normal tags", hidden: true },
  { value: "V34", label: "V34: Cond. tag + search", hidden: true },
  { value: "V35", label: "V35: Facility grade", hidden: true },
  { value: "V36", label: "V36: Associates insights", hidden: true },
  { value: "V37", label: "V37: Associates KPIs", hidden: true },
  { value: "V38", label: "V38: Facility grade giant", hidden: true },
  { value: "V39", label: "V39: Below-target count", hidden: true },
  { value: "V40", label: "V40: Top 3 div", hidden: true },
  { value: "V41", label: "V41: Top 3 containers", hidden: true },
  { value: "V42", label: "V42: Enlarged grade", hidden: true },
  { value: "V43", label: "V43: Giant grade", hidden: true },
  { value: "V44", label: "V44: Original grade", hidden: true },
  { value: "V45", label: "V45: 24px headers", hidden: true },
  { value: "V46", label: "V46: May4 feedback" },
  { value: "V47", label: "V47: May5 update" },
];

const SPOKE_VERSION_VALUES = ["V35", "V46", "V47"];

type Props = {
  active: string;
  onSelect: (key: string) => void;
  version: string;
  onVersionChange: (v: string) => void;
  facility: Facility;
  onFacilityChange: (f: Facility) => void;
  adminMode?: boolean;
  onGoToAdmin?: () => void;
};

const FACILITY_SITES: { id: string; facility: Facility; address: string }[] = [
  { id: "HUB-5", facility: "hub", address: "1450 Marietta Blvd NW, Atlanta, GA 30318" },
  { id: "SPK-1", facility: "spoke", address: "3500 Lenox Rd NE, Atlanta, GA 30326" },
];

export function Sidebar({ active, onSelect, version, onVersionChange, facility, onFacilityChange, onGoToAdmin }: Props) {
  const [trucksOpen, setTrucksOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [siteQuery, setSiteQuery] = useState("");
  const facilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!facilityOpen) return;
    const onClick = (e: MouseEvent) => {
      if (facilityRef.current && !facilityRef.current.contains(e.target as Node)) setFacilityOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [facilityOpen]);

  const currentSite = FACILITY_SITES.find((s) => s.facility === facility) ?? FACILITY_SITES[0];
  const filteredSites = FACILITY_SITES.filter((s) =>
    s.id.toLowerCase().includes(siteQuery.toLowerCase()) || s.address.toLowerCase().includes(siteQuery.toLowerCase()),
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
      const baseList = facility === "spoke" ? VERSION_OPTIONS.filter((o) => SPOKE_VERSION_VALUES.includes(o.value)) : VERSION_OPTIONS;
      const list = baseList.filter((o) => showAll || !o.hidden).map((o) => o.value);
      const idx = list.indexOf(version);
      if (e.key === "ArrowDown") onVersionChange(list[Math.min(idx + 1, list.length - 1)]);
      else onVersionChange(list[Math.max(idx - 1, 0)]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [version, showAll, onVersionChange, facility]);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 pt-5 pb-7">
        <svg width="29" height="16" viewBox="0 0 29 16" fill="none" aria-hidden>
          <path
            d="M27.3457 3.79469C26.0871 1.44425 23.6271 0 20.9669 0H0.686503C0.314647 0 0 0.311504 0 0.707965C0 0.877876 0.0858129 1.04779 0.20023 1.18938L4.60529 5.57876C5.00575 5.97522 5.52063 6.20177 6.06411 6.17345H20.3377C21.3674 6.17345 22.1969 6.96637 22.1969 7.98584C22.1969 9.00531 21.396 9.82655 20.3663 9.82655H10.555C10.1831 9.82655 9.86848 10.1381 9.86848 10.5345C9.86848 10.7044 9.9543 10.8743 10.0687 11.0159L14.4738 15.4053C14.8742 15.8018 15.3891 16 15.9612 16H20.4235C26.2015 16 30.578 9.88319 27.3457 3.79469Z"
            fill="#EB1700"
          />
        </svg>
        <span className="text-body-md-strong text-ink">DashLink Parcels</span>
      </div>

      {/* Facility selector */}
      <div ref={facilityRef} className="relative border-y border-line">
        <button
          type="button"
          onClick={() => setFacilityOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-6 pt-6 pb-6 text-left hover:bg-surface-hovered"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#0c8a4e]" />
          <div className="flex-1">
            <div className="text-body-md-strong text-ink">{currentSite.id}</div>
            <div className="text-body-sm text-ink-subdued">{hubMeta.localTime}</div>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 text-icon-subdued transition-transform", facilityOpen && "rotate-180")}
            strokeWidth={2}
          />
        </button>

        {facilityOpen && (
          <div className="absolute top-full left-3 z-30 mt-1 w-[320px] rounded-[10px] border border-line bg-white shadow-lg">
            <div className="px-4 py-4">
              <div className="flex h-10 items-center gap-2 rounded-[8px] border border-line px-3">
                <Search className="h-4 w-4 text-icon-subdued" strokeWidth={2} />
                <input
                  type="text"
                  value={siteQuery}
                  onChange={(e) => setSiteQuery(e.target.value)}
                  placeholder="Search for facility"
                  className="flex-1 bg-transparent text-body-sm text-ink outline-none placeholder:text-ink-subdued"
                />
              </div>
            </div>
            <div className="border-t border-line px-4 py-4">
              <button
                type="button"
                className="flex h-10 w-full items-center justify-center rounded-[8px] border border-line text-body-md-strong text-ink hover:bg-surface-hovered"
              >
                Network view
              </button>
            </div>
            <div className="border-t border-line py-2">
              <div className="px-4 pt-3 pb-2 text-body-sm text-ink-subdued">Your sites</div>
              <ul className="pb-2">
                {filteredSites.map((site) => {
                  const isCurrent = site.facility === facility;
                  return (
                    <li key={site.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isCurrent) onFacilityChange(site.facility);
                          setFacilityOpen(false);
                          setSiteQuery("");
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-2.5 text-left",
                          isCurrent ? "bg-surface-hovered" : "hover:bg-surface-hovered",
                        )}
                      >
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0c8a4e]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-body-md-strong text-ink">{site.id}</div>
                          <div className="truncate text-body-sm text-ink-subdued">{site.address}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filteredSites.length === 0 && (
                  <li className="px-4 py-3 text-body-sm text-ink-subdued">No sites match "{siteQuery}"</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-hidden px-4 pt-3">
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
          <div className="mb-2 rounded-card bg-ink px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="px-1 text-body-sm-strong text-white">Metrics & tooltips alignment</p>
              <button
                type="button"
                onClick={onGoToAdmin}
                className="flex h-8 shrink-0 items-center justify-center rounded-button bg-white px-3 text-body-sm-strong text-ink"
              >
                View
              </button>
            </div>
          </div>
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
          <fieldset className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
            {(facility === "spoke"
              ? VERSION_OPTIONS
                  .filter((o) => SPOKE_VERSION_VALUES.includes(o.value))
                  .filter((o) => showAll || !o.hidden)
                  .map((o) => o.value === "V46" ? { ...o, label: "V46: May4 feedback" } : o.value === "V47" ? { ...o, label: "V47: May5 update" } : o)
              : VERSION_OPTIONS.filter((o) => showAll || !o.hidden)).map((option) => {
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
