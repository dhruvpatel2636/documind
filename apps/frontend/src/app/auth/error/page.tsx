"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");

  const messages: Record<string, string> = {
    Configuration: "Server configuration error. Please contact support.",
    AccessDenied: "Access denied. You do not have permission to sign in.",
    Verification: "The sign-in link has expired or already been used.",
    Default: "An authentication error occurred.",
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Authentication Error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {messages[error ?? "Default"] ?? messages.Default}
        </p>
        <Button asChild className="mt-6">
          <Link href="/auth/signin">Try Again</Link>
        </Button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
