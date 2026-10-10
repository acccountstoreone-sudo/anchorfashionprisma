"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, Folder } from "lucide-react";

export function MediaLibrary() {
  const mockMedia = [
    { id: 1, name: "hero-banner-1.jpg", size: "1.2 MB" },
    { id: 2, name: "summer-collection.png", size: "2.5 MB" },
    { id: 3, name: "product-placeholder.jpg", size: "500 KB" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Media Library</CardTitle>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" /> Upload New
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {mockMedia.map((file) => (
            <div
              key={file.id}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border p-4 text-center transition-colors hover:bg-muted/50"
            >
              <ImageIcon className="mb-2 h-12 w-12 text-muted-foreground" />
              <span className="w-full truncate text-sm font-medium">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">{file.size}</span>
            </div>
          ))}
          <div className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-muted-foreground transition-colors hover:bg-muted/20">
            <Upload className="mb-2 h-8 w-8 opacity-50" />
            <span className="text-sm">Drag & drop files here</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
