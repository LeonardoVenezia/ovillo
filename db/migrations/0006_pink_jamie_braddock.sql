CREATE TABLE "yarn" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"weight" text NOT NULL,
	"fiber" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meters" integer,
	"grams" integer,
	"needle_mm_min" numeric(4, 2),
	"needle_mm_max" numeric(4, 2),
	"status" text DEFAULT 'sin-revisar' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yarn_brand" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "yarn_brand_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "yarn" ADD CONSTRAINT "yarn_brand_id_yarn_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."yarn_brand"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarn" ADD CONSTRAINT "yarn_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yarn_brand" ADD CONSTRAINT "yarn_brand_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "yarn_name_per_brand_unique" ON "yarn" USING btree ("brand_id",translate(lower("name"), 'áéíóúüñ', 'aeiouun'));--> statement-breakpoint
CREATE UNIQUE INDEX "yarn_slug_per_brand_unique" ON "yarn" USING btree ("brand_id","slug");--> statement-breakpoint
CREATE INDEX "yarn_weight_idx" ON "yarn" USING btree ("weight");--> statement-breakpoint
CREATE INDEX "yarn_brand_id_idx" ON "yarn" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "yarn_brand_name_idx" ON "yarn_brand" USING btree ("name");