import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  getTicketsAction,
  getAvailableAgentsAction,
} from "@/app/actions/support/ticket.actions";

export default async function SupportCommandCenterPage() {
  const [ticketsRes, agentsRes] = await Promise.all([
    getTicketsAction(),
    getAvailableAgentsAction(),
  ]);

  const tickets = ticketsRes.data || [];
  const agents = agentsRes.data || [];

  const openTicketsCount = tickets.filter(
    (t: any) =>
      t.status === "open" ||
      t.status === "in_progress" ||
      t.status === "pending"
  ).length;
  const criticalTickets = tickets
    .filter(
      (t: any) =>
        t.priority === "critical" &&
        t.status !== "resolved" &&
        t.status !== "closed"
    )
    .slice(0, 5);
  const onlineAgentsCount = agents.filter(
    (a: any) => a.current_status === "online"
  ).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Support Command Center
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage live chats, support tickets, and agent performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Link href="/admin/support/tickets">View All Tickets</Link>
          </Button>
          <Button>
            <Link href="/admin/support/chat">Open Live Chat Agent</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="mt-1 text-xs text-muted-foreground">
              4 in queue waiting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTicketsCount}</div>
            <p className="mt-1 flex items-center text-xs text-rose-500">
              <AlertTriangle className="mr-1 h-3 w-3" />
              SLA tracking enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Resolution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4h 12m</div>
            <p className="mt-1 flex items-center text-xs text-emerald-500">
              -15m from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {onlineAgentsCount} / {agents.length || 15}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Currently handling chats
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Critical Tickets</CardTitle>
            <CardDescription>
              Tickets requiring immediate attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalTickets.length > 0 ? (
                criticalTickets.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none text-rose-600">
                        {t.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.category} •{" "}
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Link href={`/admin/support/tickets/${t.id}`}>View</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No critical tickets at the moment.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Performance (Today)</CardTitle>
            <CardDescription>CSAT and resolution metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents.slice(0, 3).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
                      {a.auth_users?.first_name?.charAt(0) || "A"}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {a.auth_users?.first_name} {a.auth_users?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {a.current_status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <span className="capitalize text-emerald-500">
                      {a.current_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
