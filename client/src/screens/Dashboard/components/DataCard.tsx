import { cn } from "@/lib/utils";

interface DataCardProps {
  image: string;
  children: React.ReactNode;
  className?: string;
}

function DataCard({ image, children, className }: DataCardProps) {
  return (
    <div
      className={cn(
        "bg-secondary rounded-2xl p-4 grid grid-cols-[auto_1fr] gap-6 items-center w-full",
        className
      )}
    >
      {/* Right side - texts */}
      {children}

      {/* Left side - chart/icon */}
      <img src={image} alt="notification" />
    </div>
  );
}

export default DataCard;
