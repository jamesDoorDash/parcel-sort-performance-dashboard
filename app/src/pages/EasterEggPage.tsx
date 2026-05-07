import { ChevronUp, Info } from "lucide-react";
import { PrismWarningIcon } from "../components/icons/PrismWarningIcon";

type Swatch = {
  name: string;
  hex: string;
  token?: string;
  example: React.ReactNode;
  notes?: string;
};

type TextStyle = {
  name: string;
  spec: string;
  className: string;
  example: React.ReactNode;
};

/* ------------------------------ Colors ------------------------------ */

const inkColors: Swatch[] = [
  {
    name: "Ink",
    hex: "#111318",
    token: "text-ink / bg-ink",
    example: <span className="text-ink text-body-md-strong">Performance</span>,
    notes: "Default body & heading text",
  },
  {
    name: "Ink subdued",
    hex: "#6C707A",
    token: "text-ink-subdued",
    example: <span className="text-ink-subdued text-body-sm">Last updated &lt; 1 mins ago</span>,
    notes: "Secondary text, metric labels",
  },
  {
    name: "Tooltip ink",
    hex: "#111318",
    token: "bg-[#111318]",
    example: (
      <div className="rounded-[6px] bg-[#111318] px-3 py-2 shadow-lg">
        <div className="text-body-sm-strong text-white">Sort rate</div>
        <div className="text-body-sm text-white/80">Parcels sorted per hour.</div>
      </div>
    ),
    notes: "Dark tooltip background",
  },
  {
    name: "Icon",
    hex: "#111318",
    token: "text-icon",
    example: <ChevronUp className="h-4 w-4 text-icon" strokeWidth={2} />,
  },
  {
    name: "Icon subdued",
    hex: "#6c707a",
    token: "text-icon-subdued",
    example: <Info className="h-4 w-4 text-icon-subdued" strokeWidth={1.75} />,
  },
];

const surfaceColors: Swatch[] = [
  {
    name: "Surface",
    hex: "#ffffff",
    token: "bg-white",
    example: <div className="h-10 w-28 rounded-[8px] border border-line-hovered bg-white" />,
    notes: "Card background",
  },
  {
    name: "Surface hovered",
    hex: "#f6f7f8",
    token: "bg-surface-hovered",
    example: <div className="h-10 w-28 rounded-[8px] bg-surface-hovered" />,
    notes: "Section/page background",
  },
  {
    name: "Page background",
    hex: "#F6F7F8",
    token: "bg-[#F6F7F8]",
    example: <div className="h-10 w-28 rounded-[8px] bg-[#F6F7F8] border border-line-hovered" />,
    notes: "V56 outer page background",
  },
];

const lineColors: Swatch[] = [
  {
    name: "Line",
    hex: "#f1f1f1",
    token: "border-line",
    example: <div className="h-10 w-28 rounded-[8px] bg-white border border-line" />,
  },
  {
    name: "Line hovered",
    hex: "#d3d6d9",
    token: "border-line-hovered",
    example: <div className="h-10 w-28 rounded-[8px] bg-white border-2 border-line-hovered" />,
    notes: "V56 group container borders",
  },
];

const stateColors: Swatch[] = [
  {
    name: "Positive",
    hex: "#00832d",
    token: "text-positive",
    example: (
      <span className="inline-flex items-center rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">
        At target
      </span>
    ),
    notes: "Status tag text — at target",
  },
  {
    name: "Positive bg",
    hex: "#e7fbef",
    token: "bg-positive-bg",
    example: (
      <span className="inline-flex items-center rounded-tag bg-positive-bg px-2 py-0.5 text-body-sm-strong text-positive">
        +0.8% vs target
      </span>
    ),
  },
  {
    name: "Negative",
    hex: "#B71000",
    token: "text-negative",
    example: (
      <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
        -3.2% vs target
      </span>
    ),
    notes: "Off-target tag text",
  },
  {
    name: "Negative bg",
    hex: "#FFF0ED",
    token: "bg-negative-bg",
    example: (
      <span className="inline-flex items-center gap-1 rounded-tag bg-negative-bg px-2 py-0.5 text-body-sm-strong text-negative">
        Off target
      </span>
    ),
  },
  {
    name: "Bake-time warning",
    hex: "#111318",
    token: "text-ink",
    example: <PrismWarningIcon className="h-4 w-4 text-ink" />,
    notes: "Prism 16/warning-line on cards still baking",
  },
];

const brandColors: Swatch[] = [
  {
    name: "DashLink red",
    hex: "#EB1700",
    token: "—",
    example: (
      <svg width="29" height="16" viewBox="0 0 29 16" fill="none" aria-hidden>
        <path
          d="M27.3457 3.79469C26.0871 1.44425 23.6271 0 20.9669 0H0.686503C0.314647 0 0 0.311504 0 0.707965C0 0.877876 0.0858129 1.04779 0.20023 1.18938L4.60529 5.57876C5.00575 5.97522 5.52063 6.20177 6.06411 6.17345H20.3377C21.3674 6.17345 22.1969 6.96637 22.1969 7.98584C22.1969 9.00531 21.396 9.82655 20.3663 9.82655H10.555C10.1831 9.82655 9.86848 10.1381 9.86848 10.5345C9.86848 10.7044 9.9543 10.8743 10.0687 11.0159L14.4738 15.4053C14.8742 15.8018 15.3891 16 15.9612 16H20.4235C26.2015 16 30.578 9.88319 27.3457 3.79469Z"
          fill="#EB1700"
        />
      </svg>
    ),
    notes: "Brand mark in sidebar",
  },
  {
    name: "Facility online dot",
    hex: "#0c8a4e",
    token: "bg-[#0c8a4e]",
    example: <span className="block h-2.5 w-2.5 rounded-full bg-[#0c8a4e]" />,
    notes: "Sidebar facility status dot",
  },
];

const chartColors: Swatch[] = [
  {
    name: "Chart — processed",
    hex: "#111318",
    token: "ink",
    example: <div className="h-5 w-12 rounded-[2px] bg-ink" />,
    notes: "Primary bar fill",
  },
  {
    name: "Chart — lost",
    hex: "#7c3aed",
    token: "—",
    example: <div className="h-5 w-12 rounded-[2px]" style={{ backgroundColor: "#7c3aed" }} />,
    notes: "V56 lost-parcel bars",
  },
  {
    name: "Chart — dwelled",
    hex: "#df3480",
    token: "—",
    example: <div className="h-5 w-12 rounded-[2px]" style={{ backgroundColor: "#df3480" }} />,
    notes: "V56 dwell-time secondary series",
  },
];

/* ------------------------------ Text ------------------------------- */

const textStyles: TextStyle[] = [
  {
    name: "Display large",
    spec: "32 / 40 · 700 · -1%",
    className: "text-display-lg",
    example: <span className="text-display-lg text-ink">Performance</span>,
  },
  {
    name: "Section heading (H2)",
    spec: "16 / 22 · 700 · -1%",
    className: "text-[16px] leading-[22px] font-bold tracking-[-0.01em]",
    example: <span className="text-[16px] leading-[22px] font-bold tracking-[-0.01em] text-ink">Top level metrics</span>,
  },
  {
    name: "Hero metric value",
    spec: "32 / 40 · 700 · -1%",
    className: "text-display-lg",
    example: <span className="text-display-lg text-ink">98.4%</span>,
  },
  {
    name: "Body large strong",
    spec: "16 / 22 · 600",
    className: "text-body-lg-strong",
    example: <span className="text-body-lg-strong text-ink">DashLink Parcels</span>,
  },
  {
    name: "Body medium strong",
    spec: "14 / 20 · 700",
    className: "text-body-md-strong",
    example: <span className="text-body-md-strong text-ink">View more</span>,
  },
  {
    name: "Body medium",
    spec: "14 / 20 · 400",
    className: "text-body-md",
    example: <span className="text-body-md text-ink">Pallets loaded</span>,
  },
  {
    name: "Metric label (underlined)",
    spec: "14 / 20 · 500 · dotted underline",
    className: "metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em]",
    example: (
      <span className="metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em] text-ink-subdued">
        Sort rate
      </span>
    ),
  },
  {
    name: "Compact metric label",
    spec: "13 / 18 · 500",
    className: "text-[13px] leading-[18px] font-medium",
    example: (
      <span className="metric-label-underline text-[13px] leading-[20px] font-medium tracking-[-0.01em] text-ink-subdued">
        Lost parcels
      </span>
    ),
  },
  {
    name: "Status tag",
    spec: "13 / 18 · 700",
    className: "text-[13px] leading-[18px] font-bold",
    example: (
      <span className="inline-flex items-center rounded-tag bg-positive-bg px-2 py-0.5 text-[13px] leading-[18px] font-bold text-positive">
        At target
      </span>
    ),
  },
  {
    name: "Body small strong",
    spec: "12 / 18 · 600",
    className: "text-body-sm-strong",
    example: <span className="text-body-sm-strong text-ink">Target: 95%</span>,
  },
  {
    name: "Body small",
    spec: "12 / 18 · 400",
    className: "text-body-sm",
    example: <span className="text-body-sm text-ink-subdued">Last updated &lt; 1 mins ago</span>,
  },
  {
    name: "Tooltip body (light)",
    spec: "12 / 18 · 400 · white/80",
    className: "text-body-sm text-white/80",
    example: (
      <div className="rounded-[6px] bg-[#111318] px-3 py-2 shadow-lg">
        <div className="text-body-sm-strong text-white">Sort rate</div>
        <div className="text-body-sm text-white/80">Parcels processed per active sorter hour.</div>
      </div>
    ),
  },
];

/* --------------------------- Components ---------------------------- */

function ColorRow({ swatch }: { swatch: Swatch }) {
  return (
    <tr className="border-t border-line">
      <td className="px-4 py-4 align-top">
        <div className="flex items-center gap-3">
          <span
            className="block h-10 w-10 shrink-0 rounded-[8px] border border-line-hovered"
            style={{ backgroundColor: swatch.hex }}
          />
          <div>
            <div className="text-body-md-strong text-ink">{swatch.name}</div>
            <div className="font-mono text-body-sm text-ink-subdued">{swatch.hex}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top font-mono text-body-sm text-ink-subdued">{swatch.token ?? "—"}</td>
      <td className="px-4 py-4 align-top">
        <div className="flex items-center">{swatch.example}</div>
      </td>
      <td className="px-4 py-4 align-top text-body-sm text-ink-subdued">{swatch.notes ?? "—"}</td>
    </tr>
  );
}

function ColorTable({ rows }: { rows: Swatch[] }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line-hovered bg-white">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-[260px] bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Color</th>
            <th className="w-[240px] bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Token</th>
            <th className="bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Example</th>
            <th className="w-[280px] bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Used in V56</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <ColorRow key={s.name} swatch={s} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextRow({ row }: { row: TextStyle }) {
  return (
    <tr className="border-t border-line">
      <td className="px-4 py-4 align-top">
        <div className="text-body-md-strong text-ink">{row.name}</div>
        <div className="font-mono text-body-sm text-ink-subdued">{row.spec}</div>
      </td>
      <td className="px-4 py-4 align-top font-mono text-body-sm text-ink-subdued">{row.className}</td>
      <td className="px-4 py-4 align-top">{row.example}</td>
    </tr>
  );
}

function TextTable() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line-hovered bg-white">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-[260px] bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Style</th>
            <th className="w-[360px] bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Class</th>
            <th className="bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Example</th>
          </tr>
        </thead>
        <tbody>
          {textStyles.map((t) => (
            <TextRow key={t.name} row={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="pb-3 text-[20px] leading-[26px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function EasterEggPage() {
  return (
    <div className="flex h-full flex-col overflow-y-scroll bg-[#F6F7F8]">
      <div className="mx-auto w-full max-w-[1220px] px-12 pt-12 pb-16">
        <div className="inline-flex items-center gap-2 rounded-tag bg-ink px-3 py-1 text-body-sm-strong text-white">
          🥚 Easter egg
        </div>
        <h1 className="mt-3 text-display-lg text-ink">V56 style reference</h1>
        <p className="mt-2 text-body-md text-ink-subdued">
          Every color and text style used in V56 — hub and spoke — with a live example of the UI element it appears in.
        </p>

        <Section title="Ink & icon">
          <ColorTable rows={inkColors} />
        </Section>

        <Section title="Surface">
          <ColorTable rows={surfaceColors} />
        </Section>

        <Section title="Lines & borders">
          <ColorTable rows={lineColors} />
        </Section>

        <Section title="Status (positive / negative)">
          <ColorTable rows={stateColors} />
        </Section>

        <Section title="Brand & accents">
          <ColorTable rows={brandColors} />
        </Section>

        <Section title="Chart fills">
          <ColorTable rows={chartColors} />
        </Section>

        <Section title="Text styles">
          <TextTable />
        </Section>
      </div>
    </div>
  );
}
