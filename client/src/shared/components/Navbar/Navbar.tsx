import { Button } from "@/shared/baseComponents/button";
import NavButton from "./components/NavButton";
import { NavLink } from "react-router";

const navigationItems = [
  { to: "/dashboard", icon: "/settings.svg", text: "הגדרות אתר" },
  { to: "/dashboard", icon: "/messages.svg", text: "התראות ונוטיפיקציה" },
  { to: "/dashboard", icon: "/suppliers.svg", text: "ניהול ספקים" },
  { to: "/dashboard", icon: "/users.svg", text: "ניהול משתמשים" },
  { to: "/dashboard", icon: "/premium.svg", text: "מנויים ותוכניות פרימיום" },
  { to: "/dashboard", icon: "/goal.svg", text: "פרסום ושיווק" },
  { to: "/dashboard", icon: "/reports.svg", text: "דוחות וניתוח נתונים" },
  { to: "/dashboard", icon: "/gift.svg", text: "ניהול הטבות" },
  { to: "/", icon: "/home.svg", text: "עמוד בית" },
];

function Navbar() {
  return (
    <div className="px-10 py-4 flex items-center justify-between shadow-md flex-wrap">
      <Button variant="secondary" className="px-6 h-full">
        <p className="font-bold text-[18px]">
          מעוניין בתוצאות טובות יותר? שדרג לפרימיום!
        </p>
      </Button>

      <div id="nav-buttons-left" className="flex items-center gap-4">
        {navigationItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <NavButton
                icon={item.icon}
                isActive={isActive}
                text={item.text}
              />
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default Navbar;
