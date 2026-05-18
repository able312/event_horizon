PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `timeblocks` RENAME TO `__old_timeblocks`;--> statement-breakpoint
ALTER TABLE `food_items` RENAME TO `__old_food_items`;--> statement-breakpoint
CREATE TABLE `timeblocks` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`time` text,
	`section_type` text NOT NULL,
	`assigned_to` text,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `food_items` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer,
	`service_style` text,
	`includes` text,
	`unit_price_cents` integer,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `timeblocks`("id", "event_id", "title", "time", "section_type", "assigned_to", "created_at", "updated_at")
SELECT "id", "event_id", "title", "time", "section_type", "assigned_to", "created_at", "updated_at"
FROM `__old_timeblocks`;--> statement-breakpoint
INSERT INTO `food_items`("id", "timeblock_id", "name", "quantity", "service_style", "includes", "unit_price_cents")
SELECT "id", "timeblock_id", "name", "quantity", "service_style", "includes", "unit_price_cents"
FROM `__old_food_items`;--> statement-breakpoint
DROP TABLE `__old_food_items`;--> statement-breakpoint
DROP TABLE `__old_timeblocks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
