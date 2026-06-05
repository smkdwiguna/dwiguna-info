CREATE TABLE "attendance_marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_user_id" integer NOT NULL,
	"sheet_id" integer NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"edited_by_email" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_marks_device_user_id_sheet_id_date_unique" UNIQUE("device_user_id","sheet_id","date")
);
--> statement-breakpoint
CREATE TABLE "point_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"presence_point_id" integer NOT NULL,
	"terminal_id" text NOT NULL,
	"date" text NOT NULL,
	"start_time" integer,
	"threshold_time" integer,
	"end_time" integer,
	CONSTRAINT "point_schedules_presence_point_id_terminal_id_date_unique" UNIQUE("presence_point_id","terminal_id","date")
);
--> statement-breakpoint
ALTER TABLE "attendance_marks" ADD CONSTRAINT "attendance_marks_device_user_id_device_users_id_fk" FOREIGN KEY ("device_user_id") REFERENCES "public"."device_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_marks" ADD CONSTRAINT "attendance_marks_sheet_id_attendance_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."attendance_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_schedules" ADD CONSTRAINT "point_schedules_presence_point_id_presence_points_id_fk" FOREIGN KEY ("presence_point_id") REFERENCES "public"."presence_points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_schedules" ADD CONSTRAINT "point_schedules_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;