"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function isReactElement(val: any): boolean {
  if (!val || typeof val !== "object") return false;
  const type = val.$$typeof;
  return (
    type === Symbol.for("react.element") ||
    type === Symbol.for("react.transitional.element") ||
    React.isValidElement(val)
  );
}

function resolveEffectiveRender(
  render: any,
  asChild: boolean | undefined,
  children: React.ReactNode
) {
  if (render !== undefined) {
    if (typeof render === "function") return render;
    if (isReactElement(render)) {
      return (props: any) => {
        const { children: _baseChildren, className: propClassName, ...restProps } = props;
        return React.cloneElement(
          render,
          {
            ...restProps,
            className: cn(render.props?.className, propClassName),
          },
          render.props?.children ?? children
        );
      };
    }
    return render;
  }

  if (asChild && isReactElement(children)) {
    const child = children as React.ReactElement<any>;
    return (props: any) => {
      const { children: _baseChildren, className: propClassName, ...restProps } = props;
      return React.cloneElement(child, {
        ...restProps,
        className: cn(child.props?.className, propClassName),
      });
    };
  }

  return undefined;
}

function DialogTrigger({
  children,
  render,
  asChild,
  nativeButton,
  ...props
}: DialogPrimitive.Trigger.Props & { asChild?: boolean }) {
  const effectiveRender = resolveEffectiveRender(render, asChild, children);

  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      render={effectiveRender}
      nativeButton={nativeButton}
      {...props}
    >
      {effectiveRender ? null : children}
    </DialogPrimitive.Trigger>
  );
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100",
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-6 text-sm text-popover-foreground outline-none ring-1 ring-foreground/10 duration-100 sm:max-w-2xl max-h-[90vh] overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute right-2 top-2"
                size="icon"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base font-medium leading-none",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "*:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
