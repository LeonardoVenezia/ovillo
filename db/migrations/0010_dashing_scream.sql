CREATE TABLE "project_tool" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_tool" ADD CONSTRAINT "project_tool_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tool" ADD CONSTRAINT "project_tool_tool_id_tool_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tool"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_tool_project_idx" ON "project_tool" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_tool_project_tool_unique" ON "project_tool" USING btree ("project_id","tool_id");