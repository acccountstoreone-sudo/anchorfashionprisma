"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function TagManager({ customerId }: { customerId: string }) {
  const [tags, setTags] = useState(["VIP", "Frequent Buyer"]);

  const addTag = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTag = formData.get("tag") as string;
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    (e.target as HTMLFormElement).reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <form onSubmit={addTag} className="flex gap-2">
          <Input name="tag" placeholder="Add a new tag..." className="flex-1" />
          <Button type="submit">Add</Button>
        </form>
      </CardContent>
    </Card>
  );
}
