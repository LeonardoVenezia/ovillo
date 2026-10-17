import type { Metadata } from "next";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { ResendVerificationButton } from "@/features/auth/components/resend-verification-button";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.auth.account.title,
};

export default function SettingsPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.auth.account.title}
        </h1>
        <p className="text-muted-foreground">{es.auth.account.subtitle}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <AccountContent />
      </Suspense>
    </section>
  );
}

async function AccountContent() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {es.auth.account.identityTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {es.auth.account.email}
            </span>
            <span className="flex items-center gap-2">
              <span className="min-w-0 truncate">{user.email}</span>
              {user.emailVerified ? (
                <Badge variant="secondary">{es.auth.account.verified}</Badge>
              ) : (
                <Badge variant="outline">{es.auth.account.pending}</Badge>
              )}
            </span>
          </div>
          {user.username ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {es.auth.account.username}
              </span>
              <span>@{user.username}</span>
            </div>
          ) : null}
          {!user.emailVerified ? (
            <ResendVerificationButton email={user.email} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {es.auth.account.passwordTitle}
          </CardTitle>
          <CardDescription>{es.auth.account.passwordBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {es.auth.account.sessionTitle}
          </CardTitle>
          <CardDescription>{es.auth.account.sessionBody}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SignOutButton />
          <p className="text-muted-foreground text-xs">
            {es.auth.account.soon}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
