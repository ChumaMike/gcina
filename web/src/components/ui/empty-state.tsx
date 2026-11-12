import Image from "next/image";
import { cn } from "@/lib/utils";

/** Photo + one sentence + one action. Never a grey box. */
export function EmptyState({
  photo,
  title,
  children,
  action,
  className,
}: {
  photo?: { src: string; alt: string; position?: string };
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("reveal lift overflow-hidden rounded-3xl bg-card sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]", className)}>
      {photo && (
        <div className="relative h-44 sm:h-auto sm:min-h-56">
          <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 640px) 40vw, 100vw" className="object-cover" style={{ objectPosition: photo.position ?? "center" }} />
        </div>
      )}
      <div className="flex flex-col justify-center gap-2 p-6 sm:p-8">
        <p className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</p>
        {children && <div className="text-muted-foreground">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
