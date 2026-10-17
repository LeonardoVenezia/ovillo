CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text,
	"location" text,
	"country" text,
	"crafts" text[] DEFAULT '{}'::text[] NOT NULL,
	"skill_level" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_visibility" text DEFAULT 'publico' NOT NULL,
	"theme" text,
	"reduce_motion" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;