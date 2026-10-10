"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AllPaymentConfigs,
  PaymentGatewayConfig,
  PaymentGatewayType,
  updatePaymentConfig,
} from "@/lib/actions/payment.actions";
import { toast } from "sonner";
import { Loader2, Smartphone, Landmark, Banknote, CreditCard, ShieldCheck } from "lucide-react";

export function PaymentClient({
  initialConfigs,
}: {
  initialConfigs: AllPaymentConfigs;
}) {
  const [configs, setConfigs] = useState<AllPaymentConfigs>(initialConfigs);
  const [savingGateway, setSavingGateway] = useState<string | null>(null);

  const updateField = (
    gateway: PaymentGatewayType,
    field: keyof PaymentGatewayConfig,
    value: any
  ) => {
    setConfigs((prev) => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [field]: value,
      },
    }));
  };

  const handleSave = async (gateway: PaymentGatewayType) => {
    setSavingGateway(gateway);
    try {
      const res = await updatePaymentConfig(gateway, configs[gateway]);
      if (res.success) {
        toast.success(`${gateway.toUpperCase()} settings saved successfully`);
      } else {
        toast.error(res.error || `Failed to save ${gateway} settings`);
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred while saving");
    } finally {
      setSavingGateway(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. bKash Configuration */}
        <Card className="border-t-4 border-t-[#E2136E]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5 text-[#E2136E]" />
                  bKash (বিকাশ) Manual Payment
                </CardTitle>
                <CardDescription>
                  Receive payments via bKash Personal or Merchant account.
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-pink-100 text-[#E2136E]">
                MFS
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="bkash-enabled" className="cursor-pointer font-medium">
                Enable bKash Payment Method
              </Label>
              <Switch
                id="bkash-enabled"
                checked={configs.bkash?.enabled ?? true}
                onCheckedChange={(c) => updateField("bkash", "enabled", c)}
              />
            </div>

            {configs.bkash?.enabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bkash-account-number">
                      bKash Account Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="bkash-account-number"
                      value={configs.bkash?.account_number || ""}
                      onChange={(e) => updateField("bkash", "account_number", e.target.value)}
                      placeholder="01700000000"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bkash-account-type">Account Type</Label>
                    <Select
                      value={configs.bkash?.account_type || "Personal"}
                      onValueChange={(val) => updateField("bkash", "account_type", val)}
                    >
                      <SelectTrigger id="bkash-account-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personal">Personal (Send Money)</SelectItem>
                        <SelectItem value="Merchant">Merchant (Payment)</SelectItem>
                        <SelectItem value="Agent">Agent (Cash Out)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bkash-instructions">Customer Payment Instructions</Label>
                  <Textarea
                    id="bkash-instructions"
                    rows={3}
                    value={configs.bkash?.instructions || ""}
                    onChange={(e) => updateField("bkash", "instructions", e.target.value)}
                    placeholder="Provide step-by-step instructions for the customer..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This message will appear in the checkout page when the customer selects bKash.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              onClick={() => handleSave("bkash")}
              disabled={savingGateway === "bkash"}
              className="bg-[#E2136E] hover:bg-[#c2105e] text-white"
            >
              {savingGateway === "bkash" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save bKash Settings
            </Button>
          </CardFooter>
        </Card>

        {/* 2. Nagad Configuration */}
        <Card className="border-t-4 border-t-[#F7941D]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5 text-[#F7941D]" />
                  Nagad (নগদ) Manual Payment
                </CardTitle>
                <CardDescription>
                  Receive payments via Nagad Personal or Merchant number.
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-[#F7941D]">
                MFS
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="nagad-enabled" className="cursor-pointer font-medium">
                Enable Nagad Payment Method
              </Label>
              <Switch
                id="nagad-enabled"
                checked={configs.nagad?.enabled ?? true}
                onCheckedChange={(c) => updateField("nagad", "enabled", c)}
              />
            </div>

            {configs.nagad?.enabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nagad-account-number">
                      Nagad Account Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="nagad-account-number"
                      value={configs.nagad?.account_number || ""}
                      onChange={(e) => updateField("nagad", "account_number", e.target.value)}
                      placeholder="01800000000"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nagad-account-type">Account Type</Label>
                    <Select
                      value={configs.nagad?.account_type || "Personal"}
                      onValueChange={(val) => updateField("nagad", "account_type", val)}
                    >
                      <SelectTrigger id="nagad-account-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personal">Personal (Send Money)</SelectItem>
                        <SelectItem value="Merchant">Merchant (Payment)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nagad-instructions">Customer Payment Instructions</Label>
                  <Textarea
                    id="nagad-instructions"
                    rows={3}
                    value={configs.nagad?.instructions || ""}
                    onChange={(e) => updateField("nagad", "instructions", e.target.value)}
                    placeholder="Provide step-by-step instructions for the customer..."
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              onClick={() => handleSave("nagad")}
              disabled={savingGateway === "nagad"}
              className="bg-[#F7941D] hover:bg-[#d97c0f] text-white"
            >
              {savingGateway === "nagad" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Nagad Settings
            </Button>
          </CardFooter>
        </Card>

        {/* 3. Rocket Configuration */}
        <Card className="border-t-4 border-t-[#8C3494]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5 text-[#8C3494]" />
                  Rocket (রকেট) Manual Payment
                </CardTitle>
                <CardDescription>
                  Receive payments via DBBL Rocket mobile banking.
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-[#8C3494]">
                DBBL
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="rocket-enabled" className="cursor-pointer font-medium">
                Enable Rocket Payment Method
              </Label>
              <Switch
                id="rocket-enabled"
                checked={configs.rocket?.enabled ?? true}
                onCheckedChange={(c) => updateField("rocket", "enabled", c)}
              />
            </div>

            {configs.rocket?.enabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rocket-account-number">
                      Rocket 12-digit Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="rocket-account-number"
                      value={configs.rocket?.account_number || ""}
                      onChange={(e) => updateField("rocket", "account_number", e.target.value)}
                      placeholder="01900000000-0"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rocket-account-type">Account Type</Label>
                    <Select
                      value={configs.rocket?.account_type || "Personal"}
                      onValueChange={(val) => updateField("rocket", "account_type", val)}
                    >
                      <SelectTrigger id="rocket-account-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personal">Personal (Send Money)</SelectItem>
                        <SelectItem value="Merchant">Merchant (Payment)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rocket-instructions">Customer Payment Instructions</Label>
                  <Textarea
                    id="rocket-instructions"
                    rows={3}
                    value={configs.rocket?.instructions || ""}
                    onChange={(e) => updateField("rocket", "instructions", e.target.value)}
                    placeholder="Instructions for dialing *322# or using Rocket App..."
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              onClick={() => handleSave("rocket")}
              disabled={savingGateway === "rocket"}
              className="bg-[#8C3494] hover:bg-[#72277a] text-white"
            >
              {savingGateway === "rocket" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Rocket Settings
            </Button>
          </CardFooter>
        </Card>

        {/* 4. Bank Transfer Configuration */}
        <Card className="border-t-4 border-t-blue-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Landmark className="h-5 w-5 text-blue-600" />
                  Bank Transfer / Direct Deposit
                </CardTitle>
                <CardDescription>
                  Direct online bank transfer (BEFTN / NPSB / RTGS / Cash Deposit).
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Bank Wire
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="bank-enabled" className="cursor-pointer font-medium">
                Enable Bank Transfer Method
              </Label>
              <Switch
                id="bank-enabled"
                checked={configs.bank?.enabled ?? true}
                onCheckedChange={(c) => updateField("bank", "enabled", c)}
              />
            </div>

            {configs.bank?.enabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">
                      Bank Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="bank-name"
                      value={configs.bank?.bank_name || ""}
                      onChange={(e) => updateField("bank", "bank_name", e.target.value)}
                      placeholder="e.g. Dutch-Bangla Bank Limited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-name">
                      Account Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="account-name"
                      value={configs.bank?.account_name || ""}
                      onChange={(e) => updateField("bank", "account_name", e.target.value)}
                      placeholder="e.g. Anchor Fashion Ltd"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank-account-number">
                      Account Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="bank-account-number"
                      value={configs.bank?.account_number || ""}
                      onChange={(e) => updateField("bank", "account_number", e.target.value)}
                      placeholder="e.g. 123.456.7890"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-name">Branch Name</Label>
                    <Input
                      id="branch-name"
                      value={configs.bank?.branch_name || ""}
                      onChange={(e) => updateField("bank", "branch_name", e.target.value)}
                      placeholder="e.g. Gulshan Branch, Dhaka"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routing-number">Routing Number (Optional)</Label>
                  <Input
                    id="routing-number"
                    value={configs.bank?.routing_number || ""}
                    onChange={(e) => updateField("bank", "routing_number", e.target.value)}
                    placeholder="e.g. 090261548"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank-instructions">Transfer Instructions</Label>
                  <Textarea
                    id="bank-instructions"
                    rows={3}
                    value={configs.bank?.instructions || ""}
                    onChange={(e) => updateField("bank", "instructions", e.target.value)}
                    placeholder="Instructions for BEFTN / NPSB transfer and deposit slip..."
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              onClick={() => handleSave("bank")}
              disabled={savingGateway === "bank"}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingGateway === "bank" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Bank Details
            </Button>
          </CardFooter>
        </Card>

        {/* 5. Cash on Delivery (COD) */}
        <Card className="border-t-4 border-t-emerald-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Banknote className="h-5 w-5 text-emerald-600" />
                  Cash on Delivery (ক্যাশ অন ডেলিভারি)
                </CardTitle>
                <CardDescription>
                  Allow customers to pay physical cash upon product delivery.
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Cash
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="cod-enabled" className="cursor-pointer font-medium">
                Enable Cash on Delivery (COD)
              </Label>
              <Switch
                id="cod-enabled"
                checked={configs.cod?.enabled ?? true}
                onCheckedChange={(c) => updateField("cod", "enabled", c)}
              />
            </div>

            {configs.cod?.enabled && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="cod-instructions">Customer Notice / Delivery Notes</Label>
                <Textarea
                  id="cod-instructions"
                  rows={3}
                  value={configs.cod?.instructions || ""}
                  onChange={(e) => updateField("cod", "instructions", e.target.value)}
                  placeholder="Explain delivery time, inspection policy, delivery fee payment..."
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              onClick={() => handleSave("cod")}
              disabled={savingGateway === "cod"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingGateway === "cod" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save COD Configuration
            </Button>
          </CardFooter>
        </Card>

        {/* 6. SSLCommerz Online Gateway */}
        <Card className="border-t-4 border-t-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-slate-800 dark:text-white" />
                  SSLCommerz Automated Gateway
                </CardTitle>
                <CardDescription>
                  Cards (Visa, MasterCard, Amex) & automatic mobile banking gateway.
                </CardDescription>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                Online Gateway
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <Label htmlFor="sslcommerz-enabled" className="cursor-pointer font-medium">
                Enable SSLCommerz Payment Gateway
              </Label>
              <Switch
                id="sslcommerz-enabled"
                checked={configs.sslcommerz?.enabled ?? true}
                onCheckedChange={(c) => updateField("sslcommerz", "enabled", c)}
              />
            </div>

            {configs.sslcommerz?.enabled && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="store_id">Store ID</Label>
                  <Input
                    id="store_id"
                    value={configs.sslcommerz?.store_id || ""}
                    onChange={(e) => updateField("sslcommerz", "store_id", e.target.value)}
                    placeholder="Enter Store ID"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_password">Store Password</Label>
                  <Input
                    id="store_password"
                    type="password"
                    value={configs.sslcommerz?.store_password || ""}
                    onChange={(e) => updateField("sslcommerz", "store_password", e.target.value)}
                    placeholder="Enter Store Password"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="sslcommerz-sandbox" className="cursor-pointer font-medium">
                      Sandbox Mode (Testing Environment)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable for test payments with sandbox credentials.
                    </p>
                  </div>
                  <Switch
                    id="sslcommerz-sandbox"
                    checked={Boolean(configs.sslcommerz?.sandbox ?? true)}
                    onCheckedChange={(c) => updateField("sslcommerz", "sandbox", c)}
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              onClick={() => handleSave("sslcommerz")}
              disabled={savingGateway === "sslcommerz"}
            >
              {savingGateway === "sslcommerz" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save SSLCommerz Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

