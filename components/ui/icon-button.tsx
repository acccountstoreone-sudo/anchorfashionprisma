import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ ...props }, ref) => {
    return <Button ref={ref} variant="ghost" size="icon" {...props} />;
  }
);
IconButton.displayName = "IconButton";
