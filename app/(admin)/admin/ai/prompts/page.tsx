"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Play } from "lucide-react";

// System production prompt configurations
const systemPrompts = [
  {
    id: "p-1",
    name: "product_description_enhancer",
    category: "catalog",
    model: "gemini-1.5-flash",
    active: true,
  },
  {
    id: "p-2",
    name: "customer_support_intent_classifier",
    category: "support",
    model: "gemini-1.5-flash",
    active: true,
  },
  {
    id: "p-3",
    name: "marketing_newsletter_generator",
    category: "marketing",
    model: "gemini-1.5-pro",
    active: true,
  },
  {
    id: "p-4",
    name: "inventory_demand_forecasting",
    category: "operations",
    model: "gemini-1.5-pro",
    active: true,
  },
];

export default function PromptsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPrompts = systemPrompts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 duration-500 animate-in fade-in zoom-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Prompt Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage AI prompt templates and model configurations.
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Prompt
        </Button>
      </div>

      <Card className="border-0 bg-card/50 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enterprise Prompts</CardTitle>
            <div className="w-72">
              <Input
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrompts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No prompts matching &quot;{searchTerm}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredPrompts.map((prompt) => (
                    <tr
                      key={prompt.id}
                      className="border-b transition-colors hover:bg-accent/50"
                    >
                      <TableCell className="font-medium">{prompt.name}</TableCell>
                      <TableCell className="capitalize">
                        {prompt.category}
                      </TableCell>
                      <TableCell>{prompt.model}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${prompt.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}
                        >
                          {prompt.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-primary"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-blue-500"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
