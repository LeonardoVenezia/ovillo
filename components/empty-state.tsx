import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border bg-card/60 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
      {action}
    </div>
  );
}
