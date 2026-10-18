CREATE TABLE "pattern" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"designer_user_id" text,
	"designer_name" text,
	"craft" text,
	"category" text NOT NULL,
	"difficulty" integer,
	"yarn_weight" text,
	"yardage_min" integer,
	"yardage_max" integer,
	"needle_sizes" text,
	"gauge" text,
	"sizes" text,
	"language" text DEFAULT 'es' NOT NULL,
	"source_url" text NOT NULL,
	"pdf_url" text,
	"is_free" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'sin-revisar' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('spanish', "name" || ' ' || coalesce("designer_name", ''))) STORED,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pattern_slug_unique" UNIQUE("slug"),
	CONSTRAINT "pattern_difficulty_check" CHECK ("pattern"."difficulty" is null or ("pattern"."difficulty" between 1 and 5))
);
--> statement-breakpoint
ALTER TABLE "pattern" ADD CONSTRAINT "pattern_designer_user_id_user_id_fk" FOREIGN KEY ("designer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern" ADD CONSTRAINT "pattern_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pattern_search_gin" ON "pattern" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "pattern_category_idx" ON "pattern" USING btree ("category");