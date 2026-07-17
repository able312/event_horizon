CREATE TABLE `touchpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`due_date` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `touchpoints_event_id_idx` ON `touchpoints` (`event_id`);--> statement-breakpoint
CREATE INDEX `touchpoints_due_date_idx` ON `touchpoints` (`due_date`);
