import { Anchor, Wrench } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Under Maintenance | Anchor Fashion",
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center text-foreground">
      <Wrench className="mb-6 h-16 w-16 animate-pulse text-primary" />
      <h1 className="mb-4 text-4xl font-bold tracking-tight">
        Under Maintenance
      </h1>
      <p className="mb-8 max-w-md text-lg text-muted-foreground">
        We are currently performing scheduled maintenance to improve our
        platform. We'll be back shortly. Thank you for your patience!
      </p>
    </div>
  );
}
