import { Fragment, useState } from "react";
import { Info, AlertTriangle } from "lucide-react";
import { metricRows, infoTooltipRows, type CatalogRow } from "../data/metricsCatalog";

function ElementWithTooltip({ row }: { row: CatalogRow }) {
  const [open, setOpen] = useState(false);

  let inner: React.ReactNode = null;
  if (row.element.kind === "underline") {
    inner = (
      <span className="metric-label-underline text-[14px] leading-[20px] font-medium tracking-[-0.01em] text-ink-subdued">
        {row.element.label}
      </span>
    );
  } else if (row.element.kind === "info") {
    inner = (
      <>
        <span className="text-body-sm-strong text-ink">{row.element.label}</span>
        <Info className="h-3.5 w-3.5 text-icon-subdued" strokeWidth={1.75} />
      </>
    );
  } else if (row.element.kind === "swatchInfo") {
    inner = (
      <>
        <span className="block h-4 w-4 rounded-[4px]" style={{ backgroundColor: row.element.color }} />
        <span className="text-body-md text-ink">{row.element.label}</span>
        <Info className="h-3.5 w-3.5 text-icon-subdued" strokeWidth={1.75} />
      </>
    );
  }

  return (
    <div
      className="relative inline-flex items-center gap-1.5"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {inner}
      {open && (
        <div className="pointer-events-none absolute top-full left-0 z-30 mt-2 w-[300px] rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
          {row.tooltipTitle && row.element.kind !== "swatchInfo" && row.tooltipTitle !== row.element.label && (
            <div className="mb-1 text-body-sm-strong text-white">{row.tooltipTitle}</div>
          )}
          <div className="text-body-sm text-white/80">{row.tooltip}</div>
          {row.tooltipExtra && (
            <div className="mt-2 space-y-0.5 text-body-sm text-white/80">
              {row.tooltipExtra.map((line, i) => (
                <div key={i}><span className="font-bold text-white">{line.bold}</span> · {line.text}</div>
              ))}
            </div>
          )}
          <div className="absolute bottom-full left-4 h-0 w-0 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
        </div>
      )}
    </div>
  );
}

function CheckOrDash({ on }: { on: boolean }) {
  return on ? (
    <span className="text-[16px] leading-none text-[#00832d]">✓</span>
  ) : (
    <span className="text-[14px] text-ink-subdued">—</span>
  );
}

function InDocCell({ value }: { value?: boolean }) {
  if (value === true) return <span className="text-[16px] leading-none text-[#00832d]">✓</span>;
  if (value === false) return <span className="text-[16px] leading-none text-[#b71000]">✗</span>;
  return <span className="text-[14px] text-ink-subdued">—</span>;
}

function NoDocWarning() {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <AlertTriangle className="h-3.5 w-3.5 text-[#b71000]" strokeWidth={2} fill="#fff0ed" />
      {open && (
        <div className="pointer-events-none absolute top-full left-1/2 z-30 mt-2 w-[200px] -translate-x-1/2 rounded-[6px] bg-[#111318] px-3 py-2 text-left shadow-lg">
          <div className="text-body-sm text-white/80">No documentation available</div>
          <div className="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#111318] border-l-transparent" />
        </div>
      )}
    </span>
  );
}

function CatalogTable({ rows }: { rows: CatalogRow[] }) {
  return (
    <div className="rounded-[12px] border border-line-hovered bg-white">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-[260px] border-b border-line-hovered bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">UI element</th>
            <th className="border-b border-line-hovered bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Definition</th>
            <th className="w-[120px] border-b border-line-hovered bg-[#f6f7f8] px-4 py-3 text-left text-body-sm-strong text-ink">Target</th>
            <th className="w-[80px] border-b border-line-hovered bg-[#f6f7f8] px-4 py-3 text-center text-body-sm-strong text-ink">Hub</th>
            <th className="w-[80px] border-b border-line-hovered bg-[#f6f7f8] px-4 py-3 text-center text-body-sm-strong text-ink">Spoke</th>
            <th className="w-[120px] border-b border-line-hovered bg-[#f6f7f8] px-4 py-3 text-center text-body-sm-strong text-ink">Included in doc</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const prevGroup = idx > 0 ? rows[idx - 1].group : undefined;
            const showGroupHeader = row.group && row.group !== prevGroup;
            return (
              <Fragment key={row.id}>
                {showGroupHeader && (
                  <tr>
                    <td colSpan={6} className="border-t border-line border-b border-line bg-[#f6f7f8] px-4 py-2 text-body-sm-strong text-ink-subdued">
                      {row.group}
                    </td>
                  </tr>
                )}
            <tr className={idx > 0 && !showGroupHeader ? "border-t border-line" : ""}>
              <td className="border-b border-line px-4 py-4 align-top">
                <ElementWithTooltip row={row} />
              </td>
              <td className="border-b border-line px-4 py-4 align-top text-body-sm text-ink">
                {row.tooltipTitle && row.element.kind !== "swatchInfo" && row.tooltipTitle !== row.element.label && (
                  <div className="mb-1 text-body-sm-strong text-ink">{row.tooltipTitle}</div>
                )}
                <div>{row.tooltip}</div>
                {row.tooltipExtra && (
                  <div className="mt-2 space-y-0.5">
                    {row.tooltipExtra.map((line, i) => (
                      <div key={i}><span className="font-bold">{line.bold}</span> · {line.text}</div>
                    ))}
                  </div>
                )}
              </td>
              <td className="border-b border-line px-4 py-4 align-top text-body-sm text-ink">
                <span className="inline-flex items-center gap-1.5">
                  {row.target}
                  {row.inDoc === false && row.target !== "—" && <NoDocWarning />}
                </span>
              </td>
              <td className="border-b border-line px-4 py-4 align-top text-center"><CheckOrDash on={row.hub} /></td>
              <td className="border-b border-line px-4 py-4 align-top text-center"><CheckOrDash on={row.spoke} /></td>
              <td className="border-b border-line px-4 py-4 align-top text-center"><InDocCell value={row.inDoc} /></td>
            </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPage() {
  return (
    <div className="flex h-full flex-col overflow-y-scroll bg-[#F6F7F8]">
      <div className="mx-auto w-full max-w-[1220px] px-12 pt-12 pb-16">
        <h1 className="text-display-lg text-ink">Metrics & tooltips reference</h1>
        <p className="mt-2 max-w-[720px] text-body-md text-ink-subdued">
          Exhaustive list of every underlined metric label and info tooltip currently in V46. Hover any UI element to preview its live tooltip. Use this to align on definitions and targets across the team.
        </p>

        <section className="mt-10">
          <h2 className="pb-3 text-[20px] leading-[26px] font-bold tracking-[-0.01em] text-ink">Metrics</h2>
          <CatalogTable rows={metricRows} />
        </section>

        <section className="mt-10">
          <h2 className="pb-3 text-[20px] leading-[26px] font-bold tracking-[-0.01em] text-ink">Info tooltips</h2>
          <CatalogTable rows={infoTooltipRows} />
        </section>
      </div>
    </div>
  );
}
