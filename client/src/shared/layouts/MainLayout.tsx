import { Outlet } from "react-router";
import Navbar from "../components/Navbar/Navbar";
import BaseNavbar from "../components/BaseNavbar/BaseNavbar";
import UserProvider from "../providers/UserProvider";

function MainLayout() {
  return (
    <UserProvider>
      <div className="flex flex-col h-dvh">
        <BaseNavbar />
        <Navbar />
        <div className="flex items-center justify-center px-4">
          <main className="flex-1 overflow-auto max-w-[1440px]">
            <Outlet />
          </main>
        </div>
      </div>
    </UserProvider>
  );
}

export default MainLayout;
