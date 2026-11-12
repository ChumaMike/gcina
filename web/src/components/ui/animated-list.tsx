import { Children, isValidElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Rows slide in one after another, and a new row slides in when it arrives (keys stay stable, so only
 * new rows animate). Adapted from Magic UI's Animated List (MIT, see SOURCES.md), rewritten with the
 * CSS `reveal` utility instead of the motion library, so it adds no dependency and honours reduced motion.
 */
export function AnimatedList({
  children,
  className,
  stagger = 70,
  as: Tag = "ul",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  as?: "ul" | "ol";
} & Omit<React.HTMLAttributes<HTMLUListElement>, "children" | "className">) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <Tag className={cn("flex flex-col", className)} {...rest}>
      {items.map((child, i) => (
        <li key={child.key ?? i} className="reveal" style={{ animationDelay: `${Math.min(i, 8) * stagger}ms` }}>
          {child}
        </li>
      ))}
    </Tag>
  );
}
