CREATE TABLE "queue_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pattern_id" text NOT NULL,
	"position" double precision NOT NULL,
	"planned_stash_item_id" text,
	"target_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"visibility" text DEFAULT 'privado' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"collection_id" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_pattern_id_pattern_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."pattern"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_planned_stash_item_id_stash_item_id_fk" FOREIGN KEY ("planned_stash_item_id") REFERENCES "public"."stash_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "queue_item_user_pattern_unique" ON "queue_item" USING btree ("user_id","pattern_id");--> statement-breakpoint
CREATE INDEX "queue_item_user_position_idx" ON "queue_item" USING btree ("user_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_user_name_unique" ON "collection" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "collection_user_idx" ON "collection" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_item_user_target_unique" ON "saved_item" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "saved_item_user_idx" ON "saved_item" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "saved_item_target_idx" ON "saved_item" USING btree ("target_type","target_id");