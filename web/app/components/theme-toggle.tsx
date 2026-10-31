"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themes = ["light", "dark", "system"] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const current = themes.indexOf((theme as (typeof themes)[number]) ?? "system");
    const next = themes[(current + 1) % themes.length];
    setTheme(next);
  };

  if (!mounted) {
    return <div className={cn("h-8 w-8", className)} aria-hidden />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className={cn("h-8 w-8 rounded-md text-muted-foreground hover:text-foreground", className)}
      title={`Current theme: ${theme}`}
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : theme === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Monitor className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
