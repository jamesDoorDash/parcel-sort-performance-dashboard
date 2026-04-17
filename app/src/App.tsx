import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { PerformancePage } from "./pages/PerformancePage";
import { PerformancePageV2 } from "./pages/PerformancePageV2";
import { PerformancePageV3 } from "./pages/PerformancePageV3";
import { PerformancePageV4 } from "./pages/PerformancePageV4";
import { PerformancePageV5 } from "./pages/PerformancePageV5";
import { PerformancePageV6 } from "./pages/PerformancePageV6";

function getInitialVersion() {
  if (typeof window === "undefined") return "V3";

  const value = new URLSearchParams(window.location.search).get("version");
  return value && ["V1", "V2", "V3", "V4", "V5", "V6"].includes(value) ? value : "V6";
}

export default function App() {
  const [active, setActive] = useState<string>("performance");
  const [version, setVersion] = useState(getInitialVersion);

  let page = <PerformancePage />;
  if (version === "V2") page = <PerformancePageV2 />;
  if (version === "V3") page = <PerformancePageV3 />;
  if (version === "V4") page = <PerformancePageV4 />;
  if (version === "V5") page = <PerformancePageV5 />;
  if (version === "V6") page = <PerformancePageV6 />;

  return (
    <div className="flex h-screen w-screen bg-white text-ink">
      <Sidebar active={active} onSelect={setActive} version={version} onVersionChange={setVersion} />
      <main className="min-w-0 flex-1 overflow-hidden bg-white">
        {page}
      </main>
    </div>
  );
}
