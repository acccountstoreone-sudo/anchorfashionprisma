"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Receipt,
  DollarSign,
  TrendingDown,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Expense } from "@/types/finance.types";
import { ExpenseDialog } from "./ExpenseDialog";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import { deleteExpenseAction } from "@/actions/finance.actions";

interface ExpensesClientProps {
  initialExpenses: Expense[];
  warehouses: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}

export function ExpensesClient({
  initialExpenses,
  warehouses,
  branches,
}: ExpensesClientProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state if initialExpenses updates
  React.useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  // Unique categories in data
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [expenses]);

  // Filter logic
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        search.trim() === "" ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.vendor.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        (e.warehouseName && e.warehouseName.toLowerCase().includes(search.toLowerCase())) ||
        (e.branchName && e.branchName.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      const matchCategory = categoryFilter === "all" || e.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [expenses, search, statusFilter, categoryFilter]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      total += amt;
      if (e.status === "paid") paid += amt;
      if (e.status === "pending" || e.status === "scheduled") pending += amt;
    });

    return { total, paid, pending, count: expenses.length };
  }, [expenses]);

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      const res = await deleteExpenseAction(deletingExpense.id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete expense");
        return;
      }
      setExpenses((prev) => prev.filter((e) => e.id !== deletingExpense.id));
      toast.success("Expense record removed from ledger");
      setDeletingExpense(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      {/* Page Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses & Outgoing Capital</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor and record operational expenditures, vendor invoices, facility costs, and overheads.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outgoing Capital</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {kpis.count} total ledger record(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Settled / Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(kpis.paid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Disbursed funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending & Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(kpis.pending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting disbursement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCategories.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Expense classifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input
            placeholder="Search by vendor, memo, category, warehouse..."
            className="max-w-md bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select onValueChange={(val) => setCategoryFilter(val ?? "all")} value={categoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(val) => setStatusFilter(val ?? "all")} value={statusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(search || statusFilter !== "all" || categoryFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setCategoryFilter("all");
            }}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Main Expense Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Register</CardTitle>
          <CardDescription>
            {expenses.length === 0
              ? "Zero operational expenses recorded in database."
              : `Showing ${filtered.length} of ${expenses.length} record(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[160px]">Category</TableHead>
                  <TableHead className="min-w-[240px]">Description / Payee</TableHead>
                  <TableHead className="w-[140px]">Facility / Hub</TableHead>
                  <TableHead className="w-[120px]">Amount</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="font-semibold text-foreground">No matching expenses found</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          {expenses.length === 0
                            ? "Operational costs and vendor bills will appear here once logged."
                            : "No expenses match the current filter criteria. Try clearing search filters."}
                        </p>
                        {expenses.length === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => setIsCreateOpen(true)}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Record First Expense
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((expense) => (
                    <TableRow key={expense.id} className="group">
                      <TableCell className="font-medium text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-normal text-xs"
                        >
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">
                          {expense.description}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          {expense.vendor && (
                            <span className="flex items-center gap-1">
                              <Receipt className="h-3 w-3 text-muted-foreground/70" />
                              {expense.vendor}
                            </span>
                          )}
                          {expense.paymentMethod && (
                            <span className="text-[10px] text-muted-foreground/70 uppercase">
                              • {expense.paymentMethod.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expense.warehouseName ? (
                          <Badge variant="secondary" className="flex items-center gap-1 text-[11px] w-fit">
                            <WarehouseIcon className="h-3 w-3" />
                            {expense.warehouseName}
                          </Badge>
                        ) : expense.branchName ? (
                          <Badge variant="secondary" className="flex items-center gap-1 text-[11px] w-fit">
                            <Building2 className="h-3 w-3" />
                            {expense.branchName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Corporate HQ</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={expense.status === "paid" ? "default" : "secondary"}
                          className={
                            expense.status === "paid"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                              : expense.status === "pending"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                              : expense.status === "scheduled"
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 hover:bg-blue-100"
                              : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 hover:bg-rose-100"
                          }
                        >
                          {expense.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingExpense(expense)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                              <span>Edit Expense</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeletingExpense(expense)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span>Delete Record</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <ExpenseDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        warehouses={warehouses}
        branches={branches}
        onSuccess={(newExp) => {
          setExpenses((prev) => [newExp, ...prev]);
          router.refresh();
        }}
      />

      {/* Edit Expense Dialog */}
      {editingExpense && (
        <ExpenseDialog
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          mode="edit"
          initialData={editingExpense}
          warehouses={warehouses}
          branches={branches}
          onSuccess={(updated) => {
            setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            router.refresh();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingExpense}
        title="Delete Expense Record?"
        description={`Are you sure you want to delete the expense "${deletingExpense?.description}" for ${
          deletingExpense ? formatCurrency(deletingExpense.amount) : ""
        }? This will permanently remove the record from the ledger.`}
        confirmLabel="Delete Expense"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingExpense(null)}
      />
    </div>
  );
}
