import { useState } from "react";
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

type Props = {
  active: string;
  onSelect: (key: string) => void;
};

export function Sidebar({ active, onSelect }: Props) {
  const [trucksOpen, setTrucksOpen] = useState(true);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-white">
      {/* Header — hub + time */}
      <div className="px-8 pt-8 pb-6">
        <div className="text-title-md text-ink">{hubMeta.id}</div>
        <div className="mt-1 text-body-md text-ink-subdued">{hubMeta.localTime}</div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-4">
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

      {/* Footer — collapse */}
      <div className="border-t border-line px-4 py-4">
        <button
          type="button"
          className="flex h-12 w-full items-center gap-3 rounded-button px-3 text-left text-ink-subdued hover:bg-surface-hovered hover:text-ink"
        >
          <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <span className="text-body-md">Collapse menu</span>
        </button>
      </div>
    </aside>
  );
}
