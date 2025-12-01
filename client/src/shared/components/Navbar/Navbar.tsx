import { Button } from "@/shared/baseComponents/button";
import NavButton from "./components/NavButton";
import { NavLink } from "react-router";

const navigationItems = [
  { to: "/", icon: "/home.svg" },
  { to: "/dashboard", icon: "/gift.svg" },
  { to: "/dashboard", icon: "/reports.svg" },
  { to: "/dashboard", icon: "/goal.svg" },
  { to: "/dashboard", icon: "/premium.svg" },
  { to: "/dashboard", icon: "/users.svg" },
  { to: "/dashboard", icon: "/suppliers.svg" },
  { to: "/dashboard", icon: "/messages.svg" },
  { to: "/dashboard", icon: "/settings.svg" },
];

function Navbar() {
  return (
    <div className="px-10 py-4 flex items-center justify-between shadow-md">
      <div id="nav-buttons-left" className="flex items-center gap-6">
        {navigationItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <NavButton icon={item.icon} isActive={isActive} />
            )}
          </NavLink>
        ))}
      </div>

      <Button variant="secondary" className="px-6 h-full">
        <p className="font-bold">
          Intrested in better offers?, Upgrade to premium
        </p>
      </Button>
    </div>
  );
}

export default Navbar;
