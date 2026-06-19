"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="Toggle light / dark mode"
        onClick={() => setTheme(dark ? "light" : "dark")}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </TooltipTrigger>
      <TooltipContent>Switch to {dark ? "light" : "dark"} mode</TooltipContent>
    </Tooltip>
  );
}
