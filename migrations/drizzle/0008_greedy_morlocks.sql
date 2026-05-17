CREATE TABLE `menu_of_charge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer,
	`charge_type` text,
	`includes` text,
	`unit_price_cents` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tournament_details` (
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
);
--> statement-breakpoint
INSERT INTO `__new_tournament_details`("id", "event_id", "time", "start_format", "play_format", "number_of_players", "pace_of_play", "lead_carts", "notes", "created_at", "updated_at") SELECT "id", "event_id", "time", "start_format", "play_format", "number_of_players", "pace_of_play", "lead_carts", "notes", "created_at", "updated_at" FROM `tournament_details`;--> statement-breakpoint
DROP TABLE `tournament_details`;--> statement-breakpoint
ALTER TABLE `__new_tournament_details` RENAME TO `tournament_details`;--> statement-breakpoint
PRAGMA foreign_keys=ON;