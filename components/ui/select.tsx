"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Detects if a string is a raw system identifier (UUID, CUID, NanoID, or opaque hash)
 * rather than a human-readable display name.
 */
export function isRawIdentifier(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;

  // Standard UUID format (e.g. 714df504-c808-48b7-b127-0e63d64e2bf9)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }

  // CUID, NanoID, or long alphanumeric hash without spaces (length >= 16, e.g. hdjasdfjhdavJHM4386e7ygef)
  if (
    trimmed.length >= 16 &&
    !trimmed.includes(" ") &&
    /^[a-zA-Z0-9_-]+$/.test(trimmed) &&
    /[0-9]/.test(trimmed) &&
    /[a-zA-Z]/.test(trimmed)
  ) {
    return true;
  }

  return false;
}

/**
 * Recursively extracts value -> label mappings from React element children.
 */
function extractItemsFromChildren(children: React.ReactNode): Array<{ value: string; label: React.ReactNode }> {
  const items: Array<{ value: string; label: React.ReactNode }> = [];

  function traverse(node: React.ReactNode) {
    if (!node) return;
    if (React.isValidElement(node)) {
      const props = node.props as any;
      if (props) {
        if (props.value !== undefined && (props.children !== undefined || props.label !== undefined)) {
          items.push({
            value: String(props.value),
            label: props.label ?? props.children,
          });
        }
        if (props.children) {
          React.Children.forEach(props.children, traverse);
        }
      }
    } else if (Array.isArray(node)) {
      node.forEach(traverse);
    }
  }

  traverse(children);
  return items;
}

/**
 * Root Select component.
 * Supports standard Radix UI Select props and automatic label resolution.
 */
export interface SelectProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  items?: Array<{ value: any; label: React.ReactNode }>;
}

export interface SelectContextValue {
  value?: string;
  items?: Array<{ value: any; label: React.ReactNode }>;
  itemMap: Map<string, React.ReactNode>;
  registerItem: (value: string, label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function Select({ items, value, defaultValue, children, ...props }: SelectProps) {
  const [registeredItems, setRegisteredItems] = React.useState<Map<string, React.ReactNode>>(
    () => new Map()
  );

  const registerItem = React.useCallback((val: string, label: React.ReactNode) => {
    setRegisteredItems((prev) => {
      if (prev.get(val) === label) return prev;
      const next = new Map(prev);
      next.set(val, label);
      return next;
    });
  }, []);

  // Pre-scan static children for SelectItem elements even if Content is unmounted
  const extractedItems = React.useMemo(() => extractItemsFromChildren(children), [children]);

  const itemMap = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    for (const item of extractedItems) {
      map.set(String(item.value), item.label);
    }
    registeredItems.forEach((label, val) => {
      map.set(val, label);
    });
    if (items) {
      for (const item of items) {
        map.set(String(item.value), item.label);
      }
    }
    return map;
  }, [extractedItems, registeredItems, items]);

  const contextValue = React.useMemo(
    () => ({
      value: value ?? defaultValue,
      items,
      itemMap,
      registerItem,
    }),
    [value, defaultValue, items, itemMap, registerItem]
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <SelectPrimitive.Root value={value} defaultValue={defaultValue} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
}

const SelectGroup = SelectPrimitive.Group;

const SelectValue = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Value>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ children, placeholder = "Select...", ...props }, ref) => {
  const ctx = React.useContext(SelectContext);

  let resolvedLabel: React.ReactNode = undefined;

  // 1. If explicit children were provided and not an ugly raw ID/hash
  if (children !== undefined && children !== null && children !== "") {
    if (!isRawIdentifier(children)) {
      resolvedLabel = children;
    }
  }

  // 2. If no valid label from children, resolve from itemMap or items array
  if (!resolvedLabel && ctx?.value !== undefined && ctx.value !== "") {
    const valKey = String(ctx.value);
    const mapped = ctx.itemMap?.get(valKey);
    if (mapped && !isRawIdentifier(mapped)) {
      resolvedLabel = mapped;
    } else if (ctx.items) {
      const match = ctx.items.find((item) => String(item.value) === valKey);
      if (match && match.label && !isRawIdentifier(match.label)) {
        resolvedLabel = match.label;
      }
    }
  }

  // 3. Fallback: if value is empty/none/default or unresolved raw ID
  if (!resolvedLabel || isRawIdentifier(resolvedLabel)) {
    // Prevent Radix UI from leaking raw UUIDs/hashes when label is unresolved
    resolvedLabel = <span className="text-muted-foreground">{placeholder}</span>;
  }

  return (
    <SelectPrimitive.Value ref={ref} placeholder={placeholder} {...props}>
      {resolvedLabel}
    </SelectPrimitive.Value>
  );
});
SelectValue.displayName = SelectPrimitive.Value.displayName;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    size?: "sm" | "default";
  }
>(({ className, children, size = "default", ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-size={size}
    className={cn(
      "flex w-full select-none items-center justify-between gap-1.5 whitespace-nowrap rounded-lg border border-input bg-background/90 px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
      size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
      "[&>span]:line-clamp-1 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0 transition-transform duration-200" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", sideOffset = 4, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg backdrop-blur-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      sideOffset={sideOffset}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2.5 py-1.5 text-xs font-semibold text-muted-foreground", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { label?: React.ReactNode }
>(({ className, children, label, value, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);

  React.useEffect(() => {
    if (ctx?.registerItem && value !== undefined) {
      ctx.registerItem(String(value), label ?? children);
    }
  }, [ctx, value, label, children]);

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-2.5 pr-8 text-sm outline-hidden transition-colors hover:bg-accent/80 hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute right-2.5 flex h-3.5 w-3.5 items-center justify-center text-primary">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border/60", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
