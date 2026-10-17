import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Notebook } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResendVerificationButton } from "@/features/auth/components/resend-verification-button";
import { VerificationNotice } from "@/features/auth/components/verification-notice";
import { getProfileByUserId } from "@/features/profile/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.myWork.title,
};

export default function MyWorkPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.myWork.title}
      </h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <MyWorkContent />
      </Suspense>
    </section>
  );
}

async function MyWorkContent() {
  const user = await requireUser();
  const profile = await getProfileByUserId(user.id);
  const profileStarted = (profile?.crafts.length ?? 0) > 0;

  return (
    <>
      <Suspense fallback={null}>
        <VerificationNotice />
      </Suspense>

      <div className="flex flex-col gap-0.5">
        <p className="font-heading text-xl font-semibold">
          {es.myWork.greeting} {user.name}
        </p>
        {user.username ? (
          <p className="text-muted-foreground text-sm">@{user.username}</p>
        ) : null}
      </div>

      {!user.emailVerified ? (
        <Alert>
          <AlertTitle>{es.auth.verify.pendingTitle}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{es.auth.verify.pendingBody}</span>
            <ResendVerificationButton email={user.email} />
          </AlertDescription>
        </Alert>
      ) : null}

      {!profileStarted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {es.myWork.profileHintTitle}
            </CardTitle>
            <CardDescription>{es.myWork.profileHintBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" asChild>
              <Link href="/bienvenida">{es.myWork.profileHintCta}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <EmptyState
        icon={Notebook}
        title={es.myWork.emptyTitle}
        body={es.myWork.emptyBody}
      />

      <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/configuracion" className="underline underline-offset-4">
          {es.myWork.settingsLink}
        </Link>
        {user.username ? (
          <Link
            href={`/@${user.username}`}
            className="underline underline-offset-4"
          >
            {es.myWork.publicProfileLink}
          </Link>
        ) : null}
      </p>
    </>
  );
}
