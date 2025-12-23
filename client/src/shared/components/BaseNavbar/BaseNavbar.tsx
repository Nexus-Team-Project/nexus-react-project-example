import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/baseComponents/avatar";
import { Button } from "@/shared/baseComponents/button";

function BaseNavbar() {
  return (
    <div className="px-16 py-2 flex items-center justify-between shadow-md">
      <img src="/nexus-logo.png" alt="Logo" className="h-16 w-16" />

      <div id="nav-buttons-left" className="flex items-center gap-6">
        <Button variant="ghost">
          <img src="/notification.svg" />
        </Button>

        <Button variant="ghost">
          <img src="/help.svg" />
        </Button>

        <Button variant="ghost">
          <img src="/add-user.svg" />
        </Button>

        <Avatar>
          <AvatarImage src="/" />
          <AvatarFallback>
            <img src="/blank-avatar.svg" className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

export default BaseNavbar;
