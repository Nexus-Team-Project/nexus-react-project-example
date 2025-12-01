import { Outlet } from "react-router";
import Navbar from "../components/Navbar/Navbar";
import BaseNavbar from "../components/BaseNavbar/BaseNavbar";

function MainLayout() {
  return (
    <div className="flex flex-col h-dvh">
      <BaseNavbar />
      <Navbar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
