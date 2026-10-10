"use client";

import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CatalogPageShellProps {
  title: string;
  description?: string;
  addLabel: string;
  onAdd: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
}

/**
 * Shared layout shell for all catalog admin list pages.
 * Standardises the page header, search bar, and Add button.
 */
export function CatalogPageShell({
  title,
  description,
  addLabel,
  onAdd,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
}: CatalogPageShellProps) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Button onClick={onAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {/* Search */}
      {onSearchChange && (
        <SearchInput
          placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}...`}
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
      )}

      {/* Table Content */}
      {children}
    </div>
  );
}
