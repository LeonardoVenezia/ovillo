CREATE TABLE "image" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"blurhash" text,
	"alt_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"entry_date" date NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"image_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"share_to_feed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"image_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "cover_image_id" text;--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_entry" ADD CONSTRAINT "project_entry_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photo" ADD CONSTRAINT "project_photo_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photo" ADD CONSTRAINT "project_photo_image_id_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."image"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_entry_project_date_idx" ON "project_entry" USING btree ("project_id","entry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "project_photo_project_image_idx" ON "project_photo" USING btree ("project_id","image_id");--> statement-breakpoint
CREATE INDEX "project_photo_project_position_idx" ON "project_photo" USING btree ("project_id","position");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_cover_image_id_image_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE no action;