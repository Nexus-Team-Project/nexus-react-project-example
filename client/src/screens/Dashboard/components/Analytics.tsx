import { Button } from "@/shared/baseComponents/button";
import GraphCard from "@/screens/Dashboard/components/GraphCard";

function Analytics() {
  return (
    <div
      id="middle-home-analytics"
      className="rounded-md bg-primary-background shadow-sm shadow-secondary-foreground" //border border-border
    >
      <div
        id="top-header-analytics"
        className="flex items-center justify-between m-4"
      >
        <div id="right-side">
          <h2 className="font-bold text-xl">אנליטיקות</h2>
        </div>
        <Button variant="secondary">לכל האנליטיקות</Button>
      </div>

      <div
        id="graph-cards"
        className="m-4 grid grid-cols-[1fr_1fr_1fr] justify-between gap-6"
      >
        <GraphCard title="ביקורים בארנק" />
        <GraphCard title="ביקורים בארנק" />
        <GraphCard title="ביקורים בארנק" />
      </div>
    </div>
  );
}

export default Analytics;
