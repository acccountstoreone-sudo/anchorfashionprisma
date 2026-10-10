import * as React from "react";
import { Input, InputProps } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center", className)}>
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" ref={ref} type="search" {...props} />
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
