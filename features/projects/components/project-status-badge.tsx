import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/db/project-schema";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

/** Etiqueta de estado del proyecto (spec §5.3), con su color. */

const statusStyles: Record<ProjectStatus, string> = {
  tejiendo: "border-primary/30 bg-primary/10 text-primary",
  "en-pausa": "border-border bg-muted text-muted-foreground",
  terminado: "border-sage/40 bg-sage/10 text-sage",
  frogueado: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status], className)}>
      {es.projects.statusLabels[status]}
    </Badge>
  );
}
