import { Button } from "@/shared/baseComponents/button";
import DataCard from "./components/DataCard";
import GraphCard from "./components/GraphCard";
import SystemDetails from "./components/SystemDetails";

function Home() {
  return (
    <div id="home-wrapper" className="flex flex-col gap-8 mx-10">
      <div id="top-home" className="pt-8 flex items-center justify-between">
        <div id="cards-wrapper" className="flex gap-6 items-center">
          <DataCard image="/notification.svg">
            <div className="flex flex-col justify-between h-full text-right pr-2">
              <div>
                <p className="text-black text-lg font-medium">משתמשים</p>
                <p className="text-gray-600 text-sm">ב30 דקות האחרונות</p>
              </div>
              <p className="text-black text-3xl font-bold">300</p>
            </div>
          </DataCard>
          <DataCard image="/notification.svg">
            <div className="flex flex-col justify-between h-full text-right pr-2">
              <div>
                <p className="text-black text-lg font-medium">משתמשים</p>
                <p className="text-gray-600 text-sm">ב30 דקות האחרונות</p>
              </div>
              <p className="text-black text-3xl font-bold">300</p>
            </div>
          </DataCard>
          <DataCard image="/notification.svg">
            <div className="flex flex-col justify-between h-full text-right pr-2">
              <div>
                <p className="text-black text-lg font-medium">משתמשים</p>
                <p className="text-gray-600 text-sm">ב30 דקות האחרונות</p>
              </div>
              <p className="text-black text-3xl font-bold">300</p>
            </div>
          </DataCard>
        </div>

        <div>
          <h2 className="font-bold text-xl">Hello Daniel</h2>
          <p className="text-lg">
            Here you can track after your business and find some real data
            analytics.
          </p>
        </div>
      </div>

      <div
        id="middle-home-analytics"
        className="border border-border rounded-md bg-primary-background"
      >
        <div
          id="top-header-analytics"
          className="flex items-center justify-between m-4"
        >
          <Button variant="secondary">To Analytics</Button>
          <div id="right-side">
            <h2 className="font-bold text-xl">Analytics</h2>
          </div>
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
      <SystemDetails />
    </div>
  );
}

export default Home;
