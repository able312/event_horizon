PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `beverage_items` RENAME TO `__old_beverage_items`;--> statement-breakpoint
ALTER TABLE `vendor_items` RENAME TO `__old_vendor_items`;--> statement-breakpoint
ALTER TABLE `setup_instructions` RENAME TO `__old_setup_instructions`;--> statement-breakpoint
ALTER TABLE `notes` RENAME TO `__old_notes`;--> statement-breakpoint
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
CREATE TABLE `setup_instructions` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`instruction` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `beverage_items`("id", "timeblock_id", "name", "quantity", "type", "service_style", "includes", "unit_price_cents")
SELECT "id", "timeblock_id", "name", "quantity", "type", "service_style", "includes", "unit_price_cents"
FROM `__old_beverage_items`;--> statement-breakpoint
INSERT INTO `vendor_items`("id", "timeblock_id", "contact_name", "contact_phone", "contact_email", "notes")
SELECT "id", "timeblock_id", "contact_name", "contact_phone", "contact_email", "notes"
FROM `__old_vendor_items`;--> statement-breakpoint
INSERT INTO `setup_instructions`("id", "timeblock_id", "instruction", "created_at", "updated_at")
SELECT "id", "timeblock_id", "instruction", "created_at", "updated_at"
FROM `__old_setup_instructions`;--> statement-breakpoint
INSERT INTO `notes`("id", "timeblock_id", "content", "created_at", "updated_at")
SELECT "id", "timeblock_id", "content", "created_at", "updated_at"
FROM `__old_notes`;--> statement-breakpoint
DROP TABLE `__old_beverage_items`;--> statement-breakpoint
DROP TABLE `__old_vendor_items`;--> statement-breakpoint
DROP TABLE `__old_setup_instructions`;--> statement-breakpoint
DROP TABLE `__old_notes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
