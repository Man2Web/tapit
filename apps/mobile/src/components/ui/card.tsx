import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";

// House pattern: the bordered container every settings-style section or grouped block
// should use, instead of each screen hand-rolling `border border-neutral-200 rounded-md p-3`.
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={cn(
        "rounded-md border border-border bg-card p-3 shadow-sm shadow-black/5",
        className,
      )}
    >
      {children}
    </View>
  );
}
