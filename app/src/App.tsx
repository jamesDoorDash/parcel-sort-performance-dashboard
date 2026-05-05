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
import { PerformancePageV31 } from "./pages/PerformancePageV31";
import { PerformancePageV32 } from "./pages/PerformancePageV32";
import { PerformancePageV33 } from "./pages/PerformancePageV33";
import { PerformancePageV34 } from "./pages/PerformancePageV34";
import { PerformancePageV35 } from "./pages/PerformancePageV35";
import { PerformancePageV36 } from "./pages/PerformancePageV36";
import { PerformancePageV37 } from "./pages/PerformancePageV37";
import { PerformancePageV38 } from "./pages/PerformancePageV38";
import { PerformancePageV39 } from "./pages/PerformancePageV39";
import { PerformancePageV40 } from "./pages/PerformancePageV40";
import { PerformancePageV41 } from "./pages/PerformancePageV41";
import { PerformancePageV42 } from "./pages/PerformancePageV42";
import { PerformancePageV43 } from "./pages/PerformancePageV43";
import { PerformancePageV44 } from "./pages/PerformancePageV44";
import { PerformancePageV45 } from "./pages/PerformancePageV45";
import { PerformancePageV46 } from "./pages/PerformancePageV46";
import { PerformancePageSpokeV35 } from "./pages/PerformancePageSpokeV35";
import { PerformancePageSpokeV46 } from "./pages/PerformancePageSpokeV46";
import { AdminPage } from "./pages/AdminPage";

const ALL_VERSIONS = ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20", "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28", "V29", "V30", "V31", "V32", "V33", "V34", "V35", "V36", "V37", "V38", "V39", "V40", "V41", "V42", "V43", "V44", "V45", "V46"];
const SPOKE_VERSIONS = ["V35", "V46"];

export type Facility = "hub" | "spoke";

function parseRoute(): { facility: Facility; version: string | null; admin: boolean } {
  if (typeof window === "undefined") return { facility: "hub", version: null, admin: false };
  const parts = window.location.pathname.replace(/^\//, "").toLowerCase().split("/").filter(Boolean);
  if (parts[0] === "metrics-reference") {
    return { facility: "hub", version: null, admin: true };
  }
  if (parts[0] === "spk") {
    const v = parts[1] ? SPOKE_VERSIONS.find((x) => x.toLowerCase() === parts[1]) ?? null : null;
    return { facility: "spoke", version: v, admin: false };
  }
  const v = parts[0] ? ALL_VERSIONS.find((x) => x.toLowerCase() === parts[0]) ?? null : null;
  return { facility: "hub", version: v, admin: false };
}

function getInitial(): { facility: Facility; version: string; admin: boolean } {
  if (typeof window === "undefined") return { facility: "hub", version: "V46", admin: false };
  const fromPath = parseRoute();
  if (fromPath.admin) return { facility: "hub", version: "V46", admin: true };
  if (fromPath.version) return { facility: fromPath.facility, version: fromPath.version, admin: false };
  const fromQuery = new URLSearchParams(window.location.search).get("version");
  if (fromQuery && ALL_VERSIONS.includes(fromQuery)) return { facility: fromPath.facility, version: fromQuery, admin: false };
  return { facility: fromPath.facility, version: fromPath.facility === "spoke" ? "V46" : "V46", admin: false };
}

function buildPath(facility: Facility, version: string) {
  return facility === "spoke" ? `/spk/${version.toLowerCase()}` : `/${version.toLowerCase()}`;
}

export default function App() {
  const [active, setActive] = useState<string>("performance");
  const initial = getInitial();
  const [facility, setFacilityRaw] = useState<Facility>(initial.facility);
  const [versionRaw, setVersionRaw] = useState(initial.version);
  const [adminMode, setAdminMode] = useState<boolean>(initial.admin);

  const setVersion = useCallback((v: string) => {
    setAdminMode(false);
    setVersionRaw(v);
    setFacilityRaw((f) => {
      window.history.replaceState(null, "", buildPath(f, v));
      return f;
    });
  }, []);

  const setFacility = useCallback((f: Facility) => {
    setAdminMode(false);
    setFacilityRaw(f);
    setVersionRaw((current) => {
      const validList = f === "spoke" ? SPOKE_VERSIONS : ALL_VERSIONS;
      const nextVersion = validList.includes(current) ? current : (f === "spoke" ? "V46" : "V46");
      window.history.replaceState(null, "", buildPath(f, nextVersion));
      return nextVersion;
    });
  }, []);

  const goToAdmin = useCallback(() => {
    setAdminMode(true);
    window.history.replaceState(null, "", "/metrics-reference");
  }, []);

  const exitAdmin = useCallback(() => {
    setAdminMode(false);
    setFacilityRaw((f) => {
      setVersionRaw((current) => {
        const validList = f === "spoke" ? SPOKE_VERSIONS : ALL_VERSIONS;
        const next = validList.includes(current) ? current : "V46";
        window.history.replaceState(null, "", buildPath(f, next));
        return next;
      });
      return f;
    });
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
  if (version === "V31") page = <PerformancePageV31 />;
  if (version === "V32") page = <PerformancePageV32 />;
  if (version === "V33") page = <PerformancePageV33 />;
  if (version === "V34") page = <PerformancePageV34 />;
  if (version === "V35") page = <PerformancePageV35 />;
  if (version === "V36") page = <PerformancePageV36 />;
  if (version === "V37") page = <PerformancePageV37 />;
  if (version === "V38") page = <PerformancePageV38 />;
  if (version === "V39") page = <PerformancePageV39 />;
  if (version === "V40") page = <PerformancePageV40 />;
  if (version === "V41") page = <PerformancePageV41 />;
  if (version === "V42") page = <PerformancePageV42 />;
  if (version === "V43") page = <PerformancePageV43 />;
  if (version === "V44") page = <PerformancePageV44 />;
  if (version === "V45") page = <PerformancePageV45 />;
  if (version === "V46") page = <PerformancePageV46 />;

  if (facility === "spoke" && version === "V35") page = <PerformancePageSpokeV35 />;
  if (facility === "spoke" && version === "V46") page = <PerformancePageSpokeV46 />;

  if (adminMode) {
    return (
      <div className="relative flex h-screen w-screen bg-white text-ink">
        <main className="min-w-0 flex-1 overflow-hidden bg-white">
          <AdminPage />
        </main>
        <div className="pointer-events-none absolute bottom-0 left-0 w-64 px-4 pb-1 pt-3">
          <div className="pointer-events-auto rounded-card bg-ink px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="px-1 text-body-sm-strong text-white">Metrics & tooltips alignment</p>
              <button
                type="button"
                onClick={exitAdmin}
                className="flex h-8 shrink-0 items-center justify-center rounded-button bg-white px-3 text-body-sm-strong text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-white text-ink">
      <Sidebar
        active={active}
        onSelect={setActive}
        version={version}
        onVersionChange={setVersion}
        facility={facility}
        onFacilityChange={setFacility}
        adminMode={false}
        onGoToAdmin={goToAdmin}
      />
      <main className="min-w-0 flex-1 overflow-hidden bg-white">
        {page}
      </main>
    </div>
  );
}
