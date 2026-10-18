ALTER TABLE "project" ADD COLUMN "pattern_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_pattern_id_pattern_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."pattern"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_pattern_idx" ON "project" USING btree ("pattern_id");