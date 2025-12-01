import { cn } from "@/lib/utils";
import { Button } from "@/shared/baseComponents/button";

interface NavButtonProps {
  icon: string;
  isActive?: boolean;
}

function NavButton({ icon, isActive }: NavButtonProps) {
  return (
    <Button
      variant="secondary"
      className={cn(
        "flex flex-col items-center justify-center px-8",
        isActive && "bg-primary"
      )}
    >
      <img src={icon} alt="icon" className="w-6 h-6" />
      <p>Test text</p>
    </Button>
  );
}

export default NavButton;
