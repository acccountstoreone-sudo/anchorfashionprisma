import { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const error = params.error;
  const code = params.code;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      {error ? (
        <>
          <XCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Verification Failed
          </h1>
          <p className="text-sm text-muted-foreground">
            {error || "The verification link is invalid or has expired."}
          </p>
          <Link
            href="/auth/login"
            className={cn(buttonVariants({ variant: "default" }), "mt-4")}
          >
            Return to Sign In
          </Link>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            A verification link has been sent to your email address.
          </p>
          <Link
            href="/auth/login"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            Back to login
          </Link>
        </>
      )}
    </div>
  );
}
