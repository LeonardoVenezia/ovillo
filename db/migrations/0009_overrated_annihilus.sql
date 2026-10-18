CREATE TABLE "project_yarn" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"stash_item_id" text,
	"yarn_id" text,
	"skeins_used" integer,
	"grams_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stash_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"yarn_id" text,
	"custom_name" text,
	"colorway" text,
	"color_family" text,
	"weight" text,
	"dye_lot" text,
	"skeins" integer,
	"grams" integer,
	"meters_total" integer,
	"location" text,
	"notes" text,
	"visibility" text DEFAULT 'privado' NOT NULL,
	"image_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_yarn" ADD CONSTRAINT "project_yarn_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_yarn" ADD CONSTRAINT "project_yarn_stash_item_id_stash_item_id_fk" FOREIGN KEY ("stash_item_id") REFERENCES "public"."stash_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_yarn" ADD CONSTRAINT "project_yarn_yarn_id_yarn_id_fk" FOREIGN KEY ("yarn_id") REFERENCES "public"."yarn"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stash_item" ADD CONSTRAINT "stash_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stash_item" ADD CONSTRAINT "stash_item_yarn_id_yarn_id_fk" FOREIGN KEY ("yarn_id") REFERENCES "public"."yarn"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stash_item" ADD CONSTRAINT "stash_item_image_id_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_yarn_project_idx" ON "project_yarn" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_yarn_stash_idx" ON "project_yarn" USING btree ("stash_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_yarn_project_stash_unique" ON "project_yarn" USING btree ("project_id","stash_item_id") WHERE stash_item_id is not null;--> statement-breakpoint
CREATE INDEX "stash_item_user_idx" ON "stash_item" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "stash_item_user_weight_idx" ON "stash_item" USING btree ("user_id","weight");--> statement-breakpoint
CREATE INDEX "stash_item_user_color_idx" ON "stash_item" USING btree ("user_id","color_family");