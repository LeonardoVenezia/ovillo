import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Iniciales para el avatar cuando todavía no hay foto. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Avatar de una persona. Sin foto (hoy siempre, hasta que llegue R2) se
 * muestran las iniciales.
 */
export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
