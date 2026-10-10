"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Plus, Settings2, Zap, GitBranch } from "lucide-react";
import { toast } from "sonner";

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  status: "active" | "paused";
  lastRun: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  return (
    <div className="space-y-6 duration-500 animate-in fade-in zoom-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Workflow Engine
          </h1>
          <p className="mt-1 text-muted-foreground">
            Design, monitor, and manage enterprise automation rules.
          </p>
        </div>
        <Button 
          onClick={() => toast.info("Workflow builder is ready for custom trigger configuration.")}
          className="bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Workflow
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Workflows
            </CardTitle>
            <Zap className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.filter(w => w.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">
              Automations currently listening for triggers
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Executions Today
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No trigger events fired today</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-card/50 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>
            Manage triggers and execution paths.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-4">
                <GitBranch className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium">No active workflows configured</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                Create event-driven workflows to automate customer emails, low stock notifications, and order updates.
              </p>
              <Button 
                variant="outline"
                onClick={() => toast.info("Configure your first automated rule triggered by system events.")}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Workflow Rule
              </Button>
            </div>
          ) : (
            <div className="rounded-md border bg-card">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    <th className="p-3 font-medium">Workflow Name</th>
                    <th className="p-3 font-medium">Trigger Event</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Last Run</th>
                    <th className="p-3 font-medium text-right">Configure</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow) => (
                    <tr key={workflow.id} className="border-b transition-colors hover:bg-accent/50">
                      <td className="p-3 font-medium">{workflow.name}</td>
                      <td className="p-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {workflow.trigger}
                        </code>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${workflow.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                          {workflow.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{workflow.lastRun}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" className="hover:text-primary">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
