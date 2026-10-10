"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function NavigationBuilder() {
  const [items, setItems] = useState([
    { id: 1, label: "Home", url: "/" },
    { id: 2, label: "Shop", url: "/products" },
    { id: 3, label: "Categories", url: "/categories" },
    { id: 4, label: "About Us", url: "/about" },
  ]);

  const removeItem = (id: number) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), label: "New Link", url: "#" }]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Main Navigation</CardTitle>
        <Button size="sm" onClick={addItem}>
          <Plus className="mr-2 h-4 w-4" /> Add Link
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md border bg-card p-3 shadow-sm"
          >
            <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <Input defaultValue={item.label} placeholder="Link Label" />
              <Input defaultValue={item.url} placeholder="URL (/path)" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(item.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex justify-end pt-4">
          <Button>Save Navigation</Button>
        </div>
      </CardContent>
    </Card>
  );
}
