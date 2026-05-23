PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TEMP TABLE `__note_timeblock_ids` (
	`timeblock_id` text PRIMARY KEY NOT NULL
);--> statement-breakpoint
INSERT INTO `__note_timeblock_ids`("timeblock_id")
SELECT `timeblock_id`
FROM `notes`;--> statement-breakpoint
CREATE TEMP TABLE `__setup_instruction_timeblock_ids` (
	`timeblock_id` text PRIMARY KEY NOT NULL
);--> statement-breakpoint
INSERT INTO `__setup_instruction_timeblock_ids`("timeblock_id")
SELECT `timeblock_id`
FROM `setup_instructions`;--> statement-breakpoint
ALTER TABLE `timeblocks` RENAME TO `__old_timeblocks`;--> statement-breakpoint
ALTER TABLE `food_items` RENAME TO `__old_food_items`;--> statement-breakpoint
ALTER TABLE `beverage_items` RENAME TO `__old_beverage_items`;--> statement-breakpoint
ALTER TABLE `vendor_items` RENAME TO `__old_vendor_items`;--> statement-breakpoint
ALTER TABLE `notes` RENAME TO `__old_notes`;--> statement-breakpoint
ALTER TABLE `setup_instructions` RENAME TO `__old_setup_instructions`;--> statement-breakpoint
CREATE TABLE `timeblocks` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`time` text,
	`details` text,
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
CREATE TABLE `beverage_items` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer,
	`type` text,
	`service_style` text,
	`includes` text,
	`unit_price_cents` integer,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `vendor_items` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`notes` text,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `timeblocks`("id", "event_id", "title", "time", "details", "section_type", "assigned_to", "created_at", "updated_at")
SELECT
	`tb`.`id`,
	`tb`.`event_id`,
	`tb`.`title`,
	`tb`.`time`,
	CASE
		WHEN `tb`.`section_type` = 'note' THEN `n`.`content`
		WHEN `tb`.`section_type` = 'setup_instruction' THEN `si`.`instruction`
		ELSE NULL
	END,
	`tb`.`section_type`,
	`tb`.`assigned_to`,
	`tb`.`created_at`,
	`tb`.`updated_at`
FROM `__old_timeblocks` `tb`
LEFT JOIN `__old_notes` `n` ON `n`.`timeblock_id` = `tb`.`id`
LEFT JOIN `__old_setup_instructions` `si` ON `si`.`timeblock_id` = `tb`.`id`;--> statement-breakpoint
INSERT INTO `food_items`("id", "timeblock_id", "name", "quantity", "service_style", "includes", "unit_price_cents")
SELECT "id", "timeblock_id", "name", "quantity", "service_style", "includes", "unit_price_cents"
FROM `__old_food_items`;--> statement-breakpoint
INSERT INTO `beverage_items`("id", "timeblock_id", "name", "quantity", "type", "service_style", "includes", "unit_price_cents")
SELECT "id", "timeblock_id", "name", "quantity", "type", "service_style", "includes", "unit_price_cents"
FROM `__old_beverage_items`;--> statement-breakpoint
INSERT INTO `vendor_items`("id", "timeblock_id", "contact_name", "contact_phone", "contact_email", "notes")
SELECT "id", "timeblock_id", "contact_name", "contact_phone", "contact_email", "notes"
FROM `__old_vendor_items`;--> statement-breakpoint
DROP TABLE `__old_food_items`;--> statement-breakpoint
DROP TABLE `__old_beverage_items`;--> statement-breakpoint
DROP TABLE `__old_vendor_items`;--> statement-breakpoint
DROP TABLE `__old_notes`;--> statement-breakpoint
DROP TABLE `__old_setup_instructions`;--> statement-breakpoint
DROP TABLE `__old_timeblocks`;--> statement-breakpoint
DROP TABLE `__note_timeblock_ids`;--> statement-breakpoint
DROP TABLE `__setup_instruction_timeblock_ids`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
