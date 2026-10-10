import { PromptManager } from "@/components/ai/PromptManager";

export default function PromptsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          AI Prompt Management
        </h1>
        <p className="text-muted-foreground">
          Manage system prompts, templates, and versions for the Enterprise AI
          platform.
        </p>
      </div>

      <PromptManager />
    </div>
  );
}
