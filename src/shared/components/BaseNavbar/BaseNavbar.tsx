import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/baseComponents/avatar";
import { Button } from "@/shared/baseComponents/button";

function BaseNavbar() {
  return (
    <div className="px-16 py-2 flex items-center justify-between shadow-md">
      <div id="nav-buttons-left" className="flex items-center gap-6">
        <Avatar>
          <AvatarImage src="/" />
          <AvatarFallback>
            <img src="/blank-avatar.svg" className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>

        <Button variant="ghost">
          <img src="/add-user.svg" />
        </Button>

        <Button variant="ghost">
          <img src="/help.svg" />
        </Button>

        <Button variant="ghost">
          <img src="/notification.svg" />
        </Button>
      </div>

      {/* <Button variant="secondary" className="px-6 py-8">
        <p className="font-bold">
          Intrested in better offers?, Upgrade to premium
        </p>
      </Button> */}
    </div>
  );
}

export default BaseNavbar;
