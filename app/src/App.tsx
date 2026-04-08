import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { PerformancePage } from "./pages/PerformancePage";

export default function App() {
  const [active, setActive] = useState<string>("performance");

  return (
    <div className="flex h-screen w-screen bg-white text-ink">
      <Sidebar active={active} onSelect={setActive} />
      <main className="flex-1 overflow-hidden bg-white">
        <PerformancePage />
      </main>
    </div>
  );
}
