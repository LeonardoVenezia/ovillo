import { cn } from "@/lib/utils";

/** Barrita de progreso manual 0–100 (spec §5.3). */
export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn(
        "bg-muted h-1.5 w-full overflow-hidden rounded-full",
        className,
      )}
    >
      <div
        className="bg-primary h-full rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
