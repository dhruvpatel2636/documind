"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Sparkles, Mail, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/*
  SignInForm — redesigned auth form.
  Supports Google OAuth and Magic Link (email).
  Errors surface as toasts, not browser alerts.
*/
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogle = async () => {
    setLoading("google");
    await signIn("google", { callbackUrl: "/dashboard/chat" });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("email");
    try {
      const result = await signIn("email", { email, redirect: false, callbackUrl: "/dashboard/chat" });
      if (result?.error) {
        toast({ title: "Sign-in failed", description: result.error, variant: "destructive" });
      } else {
        setEmailSent(true);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand */}
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to DocChat</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to start chatting with your documents
        </p>
      </div>

      {emailSent ? (
        /* Email sent state */
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="font-semibold">Check your inbox</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a sign-in link to{" "}
            <strong className="text-foreground">{email}</strong>.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 text-xs text-muted-foreground"
            onClick={() => { setEmailSent(false); setEmail(""); }}
          >
            Use a different email
          </Button>
        </div>
      ) : (
        /* Sign-in form */
        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-5">
          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full h-11 gap-3 rounded-xl font-medium"
            onClick={handleGoogle}
            disabled={loading !== null}
          >
            {loading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Magic link */}
          <form onSubmit={handleEmail} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading !== null}
                className="h-11 rounded-xl"
                autoComplete="email"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl gap-2 font-medium"
              disabled={loading !== null || !email.trim()}
            >
              {loading === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Continue with Email
                  <ArrowRight className="ml-auto h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        By signing in you agree to our{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">Terms</a>
        {" "}and{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
