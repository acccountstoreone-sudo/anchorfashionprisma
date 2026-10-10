import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your profile settings",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium text-muted-foreground">Email</div>
              <div>{user.email}</div>
              <div className="font-medium text-muted-foreground">
                First Name
              </div>
              <div>{user.user_metadata?.first_name || "-"}</div>
              <div className="font-medium text-muted-foreground">Last Name</div>
              <div>{user.user_metadata?.last_name || "-"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
