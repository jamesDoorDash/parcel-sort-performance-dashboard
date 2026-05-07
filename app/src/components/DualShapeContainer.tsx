import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  DualShapeContainer — exactly 2 shapes: gray rect (back) + white L  */
/*                                                                     */
/*  Renders a single SVG with a rounded gray rectangle and a single    */
/*  white "L"-shaped path (orientation depends on which column is      */
/*  selected). Concave inner corners use sweep-reversed arcs so they   */
/*  bulge outward into the gray (proper fillet) — something stacked    */
/*  CSS rectangles cannot produce. Dimensions are measured via         */
/*  ResizeObserver so the L scales cleanly with content height.        */
/*                                                                     */
/*  selectedCol semantics (for `cols` columns total):                  */
/*    0           → tower at far-left  (1 concave: right)              */
/*    cols-1      → tower at far-right (1 concave: left)               */
/*    interior    → tower in middle    (2 concaves: left + right)      */
/* ------------------------------------------------------------------ */

export function buildLPath(selectedCol: number, cols: number, w: number, h: number, cardH: number, r: number): string {
  const towerLeft = selectedCol * (w / cols);
  const towerRight = (selectedCol + 1) * (w / cols);
  const hasLeft = selectedCol > 0;          // gray exposed left of tower in cards row
  const hasRight = selectedCol < cols - 1;  // gray exposed right of tower in cards row

  const path: string[] = [];

  // Top of tower — convex top-left, then top edge, then convex top-right
  path.push(`M ${towerLeft + r} 0`);
  path.push(`L ${towerRight - r} 0`);
  path.push(`A ${r} ${r} 0 0 1 ${towerRight} ${r}`);

  if (hasRight) {
    // Down tower's right edge → concave (outward fillet) → across panel top → convex top-right of panel → down to bottom
    path.push(`L ${towerRight} ${cardH - r}`);
    path.push(`A ${r} ${r} 0 0 0 ${towerRight + r} ${cardH}`);
    path.push(`L ${w - r} ${cardH}`);
    path.push(`A ${r} ${r} 0 0 1 ${w} ${cardH + r}`);
    path.push(`L ${w} ${h - r}`);
  } else {
    // Tower right IS the overall right edge — no concave, straight down
    path.push(`L ${w} ${h - r}`);
  }

  // Bottom-right convex → bottom edge → bottom-left convex
  path.push(`A ${r} ${r} 0 0 1 ${w - r} ${h}`);
  path.push(`L ${r} ${h}`);
  path.push(`A ${r} ${r} 0 0 1 0 ${h - r}`);

  if (hasLeft) {
    // Up panel's left edge → convex top-left of panel → across panel top → concave (outward fillet) → up tower's left edge
    path.push(`L 0 ${cardH + r}`);
    path.push(`A ${r} ${r} 0 0 1 ${r} ${cardH}`);
    path.push(`L ${towerLeft - r} ${cardH}`);
    path.push(`A ${r} ${r} 0 0 0 ${towerLeft} ${cardH - r}`);
    path.push(`L ${towerLeft} ${r}`);
  } else {
    // Tower left IS the overall left edge — no concave, straight up
    path.push(`L 0 ${r}`);
  }

  // Top-left of tower convex (closes the path)
  path.push(`A ${r} ${r} 0 0 1 ${towerLeft + r} 0`);
  path.push("Z");

  return path.join(" ");
}

export function DualShapeContainer({
  selectedCol,
  cols = 4,
  cardsRow,
  panel,
}: {
  selectedCol: number;
  cols?: number;
  cardsRow: ReactNode;
  panel: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const cardsRowRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0, cardH: 0 });

  useLayoutEffect(() => {
    if (!outerRef.current || !cardsRowRef.current) return;

    const measure = () => {
      const outer = outerRef.current!.getBoundingClientRect();
      const cards = cardsRowRef.current!.getBoundingClientRect();
      setDims({ w: outer.width, h: outer.height, cardH: cards.height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outerRef.current);
    ro.observe(cardsRowRef.current);
    return () => ro.disconnect();
  }, []);

  const r = 12;
  const { w, h, cardH } = dims;
  const ready = w > 0 && h > 0 && cardH > 0;

  const lPath = ready ? buildLPath(selectedCol, cols, w, h, cardH, r) : "";

  return (
    <div ref={outerRef} className="relative">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${w || 1} ${h || 1}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* Strokes clipped to each shape so only the inside half renders. Drawing 2× the desired width means visible inner half = the requested thickness. Result: gray = 1px inside, L = 2px inside, no overlap stacking because both strokes live entirely inside their own shape's interior. */}
        <defs>
          <clipPath id="dual-shape-gray-clip">
            <rect x={0} y={0} width={w || 0} height={h || 0} rx={r} ry={r} />
          </clipPath>
          {ready && (
            <clipPath id="dual-shape-l-clip">
              <path d={lPath} />
            </clipPath>
          )}
        </defs>
        {/* Shape 1 (back): gray rounded rectangle. 2px stroke clipped → 1px visible inside. */}
        <rect
          x={0}
          y={0}
          width={w || 0}
          height={h || 0}
          rx={r}
          ry={r}
          fill="#F6F7F8"
          stroke="#D3D6D9"
          strokeWidth={2}
          clipPath="url(#dual-shape-gray-clip)"
        />
        {/* Shape 2 (front): single white L path with concave outward fillets. 4px stroke clipped → 2px visible inside. */}
        {ready && (
          <path
            d={lPath}
            fill="#FFFFFF"
            stroke="#D3D6D9"
            strokeWidth={4}
            clipPath="url(#dual-shape-l-clip)"
          />
        )}
      </svg>

      <div className="relative">
        <div ref={cardsRowRef}>{cardsRow}</div>
        {panel}
      </div>
    </div>
  );
}
