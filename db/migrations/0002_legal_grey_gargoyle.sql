CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"craft" text,
	"status" text DEFAULT 'tejiendo' NOT NULL,
	"progress" integer,
	"pattern_text" text,
	"size" text,
	"made_for" text,
	"started_at" date,
	"finished_at" date,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"visibility" text DEFAULT 'publico' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_slug_idx" ON "project" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "project_user_created_idx" ON "project" USING btree ("user_id","created_at");