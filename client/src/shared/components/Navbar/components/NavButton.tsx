import { cn } from "@/lib/utils";
import { Button } from "@/shared/baseComponents/button";

interface NavButtonProps {
  icon: string;
  isActive?: boolean;
  text: string;
}

function NavButton({ icon, isActive, text }: NavButtonProps) {
  return (
    <Button
      variant="secondary"
      className={cn(
        "flex flex-col items-center justify-center px-2 py-3 min-w-24 hover:bg-primary-hover transition-colors hover:cursor-pointer group",
        isActive && "bg-primary"
      )}
    >
      <div className="flex items-center justify-center">
        <img
          src={icon}
          alt="icon"
          className="w-6 h-6 transition-transform duration-200 group-hover:scale-125"
        />
      </div>
      <p className="text-[10px] transition-all duration-200 group-hover:scale-110 group-hover:font-semibold whitespace-nowrap">
        {text}
      </p>
    </Button>
  );
}

export default NavButton;
