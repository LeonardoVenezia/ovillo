import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.auth.signUp.label,
};

export default function SignUpPage() {
  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {es.auth.signUp.title}
          </CardTitle>
          <CardDescription>{es.auth.signUp.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
      </Card>
    </div>
  );
}
