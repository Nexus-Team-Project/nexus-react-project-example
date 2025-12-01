import Chart from "react-google-charts";

const data = [
  ["Year", "Sales", "Expenses"],
  ["2004", 1000, 400],
  ["2005", 1170, 460],
  ["2006", 660, 1120],
  ["2007", 1030, 540],
];

const options = {
  hAxis: { textPosition: "none" },
  vAxis: { textPosition: "none" },
  legend: "none",
  curveType: "function",
};

function GraphCard({ title }: { title: string }) {
  return (
    <div className="bg-background border border-border rounded-2xl p-4 w-full flex flex-col justify-between">
      {/* Title */}
      <h2 className="text-right font-semibold text-gray-800">{title}</h2>

      {/* Chart */}
      <Chart
        chartType="LineChart"
        width="100%"
        height="100%"
        data={data}
        options={options}
        legendToggle
      />

      {/* Progress Bars */}
      <div className="flex flex-col gap-2 text-right">
        <div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>+20%</span>
            <span>חודש נוכחי</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 mt-1">
            <div className="bg-primary h-2 rounded-full w-[70%]"></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>+15%</span>
            <span>חודש קודם</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 mt-1">
            <div className="bg-primary h-2 rounded-full w-[55%]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphCard;
