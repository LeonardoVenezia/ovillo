import type { Metadata } from "next";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.auth.signIn.label,
};

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {es.auth.signIn.title}
          </CardTitle>
          <CardDescription>{es.auth.signIn.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* El formulario lee `?volver=` (useSearchParams) → Suspense. */}
          <Suspense fallback={<Skeleton className="h-52 w-full" />}>
            <SignInForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
