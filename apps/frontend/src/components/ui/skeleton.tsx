import { cn } from "@/lib/utils";

/*
  Skeleton — pulsing placeholder for loading states.
  Usage: <Skeleton className="h-4 w-32 rounded" />
*/
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
