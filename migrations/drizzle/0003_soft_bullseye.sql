CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`date` text NOT NULL,
	`reciept_number` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
