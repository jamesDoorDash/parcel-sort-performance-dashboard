import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { PerformancePage } from "./pages/PerformancePage";
import { PerformancePageV2 } from "./pages/PerformancePageV2";
import { PerformancePageV3 } from "./pages/PerformancePageV3";
import { PerformancePageV4 } from "./pages/PerformancePageV4";

export default function App() {
  const [active, setActive] = useState<string>("performance");
  const [version, setVersion] = useState("V4");

  let page = <PerformancePage />;
  if (version === "V2") page = <PerformancePageV2 />;
  if (version === "V3") page = <PerformancePageV3 />;
  if (version === "V4") page = <PerformancePageV4 />;

  return (
    <div className="flex h-screen w-screen bg-white text-ink">
      <Sidebar active={active} onSelect={setActive} version={version} onVersionChange={setVersion} />
      <main className="min-w-0 flex-1 overflow-hidden bg-white">
        {page}
      </main>
    </div>
  );
}
