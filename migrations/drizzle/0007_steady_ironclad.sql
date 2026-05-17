PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE IF EXISTS `tournament_details`;--> statement-breakpoint
CREATE TABLE `tournament_details` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`time` text,
	`start_format` text,
	`play_format` text,
	`number_of_players` integer,
	`pace_of_play` text,
	`lead_carts` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
PRAGMA foreign_keys=ON;