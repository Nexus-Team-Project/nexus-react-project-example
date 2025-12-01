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
        "bg-secondary rounded-2xl p-4 grid grid-cols-[1fr_1fr] items-center w-full h-[135px]",
        className
      )}
    >
      {/* Left side - chart/icon */}
      <div className="flex justify-center items-center h-full">
        <img src={image} alt="notification" />
      </div>

      {/* Right side - texts */}
      {children}
    </div>
  );
}

export default DataCard;
