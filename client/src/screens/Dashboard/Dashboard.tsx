import Analytics from "./components/Analytics";
import DataCard from "./components/DataCard";
import SystemDetails from "./components/SystemDetails";
import { useUser } from "@/shared/providers/UserProvider";

const statsData = [
  {
    id: 1,
    image: "/notification.svg",
    title: "משתמשים",
    subtitle: "ב30 דקות האחרונות",
    value: "300",
  },
  {
    id: 2,
    image: "/notification.svg",
    title: "משתמשים",
    subtitle: "ב30 דקות האחרונות",
    value: "300",
  },
  {
    id: 3,
    image: "/notification.svg",
    title: "משתמשים",
    subtitle: "ב30 דקות האחרונות",
    value: "300",
  },
];

function Dashboard() {
  const { user } = useUser();
  return (
    <div id="home-wrapper" className="flex flex-col gap-8 mx-10">
      <div id="top-home" className="pt-8 flex items-center justify-between">
        <div className="rtl font-bold">
          <h2 className="text-xl">שלום {user?.name} </h2>
          <p className="text-lg">
            כאן תוכל לעקוב אחרי ביצועי העסק ולגלות תובנות בזמן אמת.
          </p>
        </div>

        <div id="cards-wrapper" className="flex gap-6 items-center">
          {statsData.map((stat) => (
            <DataCard key={stat.id} image={stat.image}>
              <div className="flex flex-col h-full text-right pr-2">
                <div>
                  <p className="text-black text-sm font-medium">{stat.title}</p>
                  <p className="text-gray-600 text-[10px]">{stat.subtitle}</p>
                </div>
                <p className="text-black font-bold">{stat.value}</p>
              </div>
            </DataCard>
          ))}
        </div>
      </div>

      <Analytics />
      <SystemDetails />
    </div>
  );
}

export default Dashboard;
