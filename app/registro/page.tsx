import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.auth.signUp,
};

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            {es.auth.stubTitle}
          </CardTitle>
          <CardDescription>{es.auth.stubBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/">{es.auth.backHome}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
