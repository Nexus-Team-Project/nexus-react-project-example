import SystemTable from "./SystemTable";
import { Button } from "@/shared/baseComponents/button";
import Chart from "react-google-charts";

export const data = [
  ["Task", "Hours per Day"],
  ["Work", 11],
  ["Eat", 2],
  ["Commute", 2],
];

export const options = {
  pieHole: 0.4,
  is3D: false,
  legend: "none",
  backgroundColor: {
    fill: "transparent",
    stroke: "red",
    strokeWidth: 0,
  },
  colors: ["#1475d0", "#cddfe2", "#71717b"],
};

function SystemDetails() {
  return (
    //border border-border
    <div className="w-full grid grid-cols-2 gap-4 p-6 rounded-md shadow-sm shadow-secondary-foreground">
      {/* Right Section */}
      <div className="bg-white rounded-2xl p-4 shadow">
        <div id="table-top" className="flex items-center justify-between">
          <h2 className="font-semibold text-right mb-4">דוח מערכת</h2>
          <Button variant="secondary">מעבר לעמוד</Button>
        </div>
        {/* table placeholder */}
        <SystemTable />
      </div>

      {/* Left Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top row */}

        <div className="border border-black rounded-2xl p-4 grid grid-cols-[1fr_1fr] items-center w-full">
          <Chart
            chartType="PieChart"
            width="100%"
            data={data}
            options={options}
          />
          {/*  */}
          <div className="flex flex-col justify-between h-full text-right pr-2">
            <div>
              <p className="text-black text-lg font-medium">משתמשים</p>
              <p className="text-gray-600 text-sm">ב30 דקות האחרונות</p>
            </div>
            <p className="text-black text-3xl font-bold">300</p>
          </div>
        </div>

        <div className="border border-black rounded-2xl p-4 grid grid-cols-[1fr_1fr] items-center w-full">
          <Chart
            chartType="PieChart"
            width="100%"
            data={data}
            options={options}
          />
          {/*  */}
          <div className="flex flex-col justify-between h-full text-right pr-2">
            <div>
              <p className="text-black text-lg font-medium">משתמשים</p>
              <p className="text-gray-600 text-sm">ב30 דקות האחרונות</p>
            </div>
            <p className="text-black text-3xl font-bold">300</p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="border border-black rounded-2xl p-4 grid grid-cols-[1fr_1fr] items-center w-full">
          <Chart
            chartType="PieChart"
            width="100%"
            data={data}
            options={options}
          />
          {/*  */}
          <div className="flex flex-col justify-between h-full text-right pr-2">
            <div>
              <p className="text-black text-lg font-medium">משתמשים</p>
              <p className="text-gray-600 text-sm">ב30 דקות האחרונות</p>
            </div>
            <p className="text-black text-3xl font-bold">300</p>
          </div>
        </div>
        <div className="border border-black rounded-2xl p-4 grid grid-cols-[1fr_1fr] items-center w-full">
          <Chart
            chartType="PieChart"
            width="100%"
            data={data}
            options={options}
          />
          {/*  */}
          <div className="flex flex-col justify-between h-full text-right pr-2">
            <div>
              <p className="text-black text-lg font-medium">משתמשים</p>
              <p className="text-gray-600 text-sm">ב30 דקות האחרונות</p>
            </div>
            <p className="text-black text-3xl font-bold">300</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemDetails;
