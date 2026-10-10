"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Dresses",
    href: "/categories/dresses",
    description: "Elegant dresses for every occasion, from casual to formal.",
  },
  {
    title: "Tops & Blouses",
    href: "/categories/tops",
    description: "Versatile tops and blouses for a chic everyday look.",
  },
  {
    title: "Activewear",
    href: "/categories/activewear",
    description: "Comfortable and stylish activewear for your workouts.",
  },
  {
    title: "Accessories",
    href: "/categories/accessories",
    description: "Complete your look with our curated accessories.",
  },
];

export function MegaMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-foreground hover:bg-transparent">
            Women
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                    href="/products?collection=spring"
                  >
                    <div className="mb-2 mt-4 text-lg font-medium">
                      Spring Collection
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      Discover the latest trends and essential pieces for the
                      new season.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-foreground hover:bg-transparent">
            Men
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <ListItem href="/categories/men-shirts" title="Shirts">
                Premium cotton and linen shirts.
              </ListItem>
              <ListItem href="/categories/men-pants" title="Pants & Chinos">
                Tailored fit pants for a sharp look.
              </ListItem>
              <ListItem href="/categories/men-outerwear" title="Outerwear">
                Jackets and coats for all seasons.
              </ListItem>
              <ListItem href="/categories/men-panjabis" title="Panjabis">
                Traditional elegant panjabis.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link href="/products?sale=true" legacyBehavior passHref>
            <NavigationMenuLink
              className={cn(
                navigationMenuTriggerStyle(),
                "bg-transparent font-medium text-destructive hover:bg-transparent"
              )}
            >
              Sale
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
