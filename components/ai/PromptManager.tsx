"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface AIPromptTemplate {
  id: string;
  name: string;
  system_prompt?: string;
  user_template?: string;
  user_prompt_template?: string;
  model?: string;
  created_at?: string;
}

export function PromptManager() {
  const [prompts, setPrompts] = useState<AIPromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userTemplate, setUserTemplate] = useState("");

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const res = await fetch("/api/ai/prompts");
      const data = await res.json();
      setPrompts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await fetch("/api/ai/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: "general",
          model: "gemini-1.5-flash",
          system_prompt: systemPrompt,
          user_prompt_template: userTemplate,
          is_active: true,
        }),
      });
      fetchPrompts();
      setName("");
      setSystemPrompt("");
      setUserTemplate("");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create New Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Prompt Name</label>
            <Input
              placeholder="e.g., product_seo_generator"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea
              placeholder="You are an expert SEO specialist..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">User Prompt Template</label>
            <Textarea
              placeholder="Generate SEO for product: {{product_name}}"
              value={userTemplate}
              onChange={(e) => setUserTemplate(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate}>Create Prompt</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4">
              {prompts.map((p) => (
                <div key={p.id} className="rounded-md border p-4">
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-sm text-gray-500">Model: {p.model}</p>
                  <pre className="mt-2 truncate rounded bg-gray-100 p-2 text-xs">
                    {p.user_prompt_template}
                  </pre>
                </div>
              ))}
              {prompts.length === 0 && (
                <p className="text-sm text-gray-500">No prompts found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
