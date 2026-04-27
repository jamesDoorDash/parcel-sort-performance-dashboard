import { useCallback, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { PerformancePage } from "./pages/PerformancePage";
import { PerformancePageV2 } from "./pages/PerformancePageV2";
import { PerformancePageV3 } from "./pages/PerformancePageV3";
import { PerformancePageV4 } from "./pages/PerformancePageV4";
import { PerformancePageV5 } from "./pages/PerformancePageV5";
import { PerformancePageV6 } from "./pages/PerformancePageV6";
import { PerformancePageV7 } from "./pages/PerformancePageV7";
import { PerformancePageV8 } from "./pages/PerformancePageV8";
import { PerformancePageV9 } from "./pages/PerformancePageV9";
import { PerformancePageV10 } from "./pages/PerformancePageV10";
import { PerformancePageV11 } from "./pages/PerformancePageV11";
import { PerformancePageV12 } from "./pages/PerformancePageV12";
import { PerformancePageV13 } from "./pages/PerformancePageV13";
import { PerformancePageV14 } from "./pages/PerformancePageV14";
import { PerformancePageV15 } from "./pages/PerformancePageV15";
import { PerformancePageV16 } from "./pages/PerformancePageV16";
import { PerformancePageV17 } from "./pages/PerformancePageV17";
import { PerformancePageV18 } from "./pages/PerformancePageV18";
import { PerformancePageV19 } from "./pages/PerformancePageV19";
import { PerformancePageV20 } from "./pages/PerformancePageV20";
import { PerformancePageV21 } from "./pages/PerformancePageV21";
import { PerformancePageV22 } from "./pages/PerformancePageV22";
import { PerformancePageV23 } from "./pages/PerformancePageV23";
import { PerformancePageV24 } from "./pages/PerformancePageV24";
import { PerformancePageV25 } from "./pages/PerformancePageV25";
import { PerformancePageV26 } from "./pages/PerformancePageV26";
import { PerformancePageV27 } from "./pages/PerformancePageV27";
import { PerformancePageV28 } from "./pages/PerformancePageV28";
import { PerformancePageV29 } from "./pages/PerformancePageV29";
import { PerformancePageV30 } from "./pages/PerformancePageV30";

const ALL_VERSIONS = ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20", "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28", "V29", "V30"];

function versionFromPath(): string | null {
  const path = window.location.pathname.replace(/^\//, "").toLowerCase();
  if (!path) return null;
  return ALL_VERSIONS.find((v) => v.toLowerCase() === path) ?? null;
}

function getInitialVersion() {
  if (typeof window === "undefined") return "V30";
  // Check pathname first (/v17), then query param (?version=V17), then default
  const fromPath = versionFromPath();
  if (fromPath) return fromPath;
  const fromQuery = new URLSearchParams(window.location.search).get("version");
  return fromQuery && ALL_VERSIONS.includes(fromQuery) ? fromQuery : "V30";
}

export default function App() {
  const [active, setActive] = useState<string>("performance");
  const [versionRaw, setVersionRaw] = useState(getInitialVersion);

  const setVersion = useCallback((v: string) => {
    setVersionRaw(v);
    const path = `/${v.toLowerCase()}`;
    window.history.replaceState(null, "", path);
  }, []);

  const version = versionRaw;


  let page = <PerformancePage />;
  if (version === "V2") page = <PerformancePageV2 />;
  if (version === "V3") page = <PerformancePageV3 />;
  if (version === "V4") page = <PerformancePageV4 />;
  if (version === "V5") page = <PerformancePageV5 />;
  if (version === "V6") page = <PerformancePageV6 />;
  if (version === "V7") page = <PerformancePageV7 />;
  if (version === "V8") page = <PerformancePageV8 />;
  if (version === "V9") page = <PerformancePageV9 />;
  if (version === "V10") page = <PerformancePageV10 />;
  if (version === "V11") page = <PerformancePageV11 />;
  if (version === "V12") page = <PerformancePageV12 />;
  if (version === "V13") page = <PerformancePageV13 />;
  if (version === "V14") page = <PerformancePageV14 />;
  if (version === "V15") page = <PerformancePageV15 />;
  if (version === "V16") page = <PerformancePageV16 />;
  if (version === "V17") page = <PerformancePageV17 />;
  if (version === "V18") page = <PerformancePageV18 />;
  if (version === "V19") page = <PerformancePageV19 />;
  if (version === "V20") page = <PerformancePageV20 />;
  if (version === "V21") page = <PerformancePageV21 />;
  if (version === "V22") page = <PerformancePageV22 />;
  if (version === "V23") page = <PerformancePageV24 />;
  if (version === "V24") page = <PerformancePageV23 />;
  if (version === "V25") page = <PerformancePageV25 />;
  if (version === "V26") page = <PerformancePageV26 />;
  if (version === "V27") page = <PerformancePageV27 />;
  if (version === "V28") page = <PerformancePageV28 />;
  if (version === "V29") page = <PerformancePageV29 />;
  if (version === "V30") page = <PerformancePageV30 />;

  return (
    <div className="flex h-screen w-screen bg-white text-ink">
      <Sidebar active={active} onSelect={setActive} version={version} onVersionChange={setVersion} />
      <main className="min-w-0 flex-1 overflow-hidden bg-white">
        {page}
      </main>
    </div>
  );
}
