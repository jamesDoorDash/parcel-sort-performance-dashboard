import { useState } from "react";
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

function getInitialVersion() {
  if (typeof window === "undefined") return "V3";

  const value = new URLSearchParams(window.location.search).get("version");
  return value && ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11"].includes(value) ? value : "V7";

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
  if (version === "V7") page = <PerformancePageV7 />;
  if (version === "V8") page = <PerformancePageV8 />;
  if (version === "V9") page = <PerformancePageV9 />;
  if (version === "V10") page = <PerformancePageV10 />;
  if (version === "V11") page = <PerformancePageV11 />;

  return (
    <div className="flex h-screen w-screen bg-white text-ink">
      <Sidebar active={active} onSelect={setActive} version={version} onVersionChange={setVersion} />
      <main className="min-w-0 flex-1 overflow-hidden bg-white">
        {page}
      </main>
    </div>
  );
}
