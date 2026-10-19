CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"craft" text NOT NULL,
	"starts_at" date NOT NULL,
	"ends_at" date NOT NULL,
	"pattern_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participant" (
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_participant_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "glossary_term" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"term" text NOT NULL,
	"abbreviation" text DEFAULT '' NOT NULL,
	"english" text DEFAULT '' NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"definition" text NOT NULL,
	"craft" text DEFAULT 'ambos' NOT NULL,
	"kind" text DEFAULT 'punto' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant" ADD CONSTRAINT "event_participant_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant" ADD CONSTRAINT "event_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participant" ADD CONSTRAINT "event_participant_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term" ADD CONSTRAINT "glossary_term_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_thread_unique" ON "event" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "event_group_idx" ON "event" USING btree ("group_id","starts_at");--> statement-breakpoint
CREATE INDEX "event_creator_idx" ON "event" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "event_participant_user_idx" ON "event_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_participant_project_idx" ON "event_participant" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "glossary_term_slug_unique" ON "glossary_term" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "glossary_term_craft_idx" ON "glossary_term" USING btree ("craft","kind");