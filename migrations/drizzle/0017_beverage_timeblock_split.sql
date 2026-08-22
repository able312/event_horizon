PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `beverage_items` RENAME TO `__old_beverage_items`;--> statement-breakpoint
CREATE TABLE `beverage_items` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer,
	`type` text NOT NULL,
	`service_style` text,
	`includes` text,
	`unit_price_cents` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `beverage_items`("id", "event_id", "name", "quantity", "type", "service_style", "includes", "unit_price_cents")
SELECT
	`bi`.`id`,
	`tb`.`event_id`,
	`bi`.`name`,
	`bi`.`quantity`,
	CASE
		WHEN `bi`.`type` IN ('Special Orders', 'Beer', 'Wine', 'Coolers', 'Rails', 'Non-Alcoholic') THEN `bi`.`type`
		ELSE 'Special Orders'
	END,
	`bi`.`service_style`,
	`bi`.`includes`,
	`bi`.`unit_price_cents`
FROM `__old_beverage_items` `bi`
INNER JOIN `timeblocks` `tb` ON `tb`.`id` = `bi`.`timeblock_id`;--> statement-breakpoint
CREATE TABLE `beverage_item_timeblocks` (
	`beverage_item_id` text NOT NULL,
	`timeblock_id` text NOT NULL,
	FOREIGN KEY (`beverage_item_id`) REFERENCES `beverage_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `beverage_item_timeblocks_unique` ON `beverage_item_timeblocks` (`beverage_item_id`,`timeblock_id`);--> statement-breakpoint
INSERT INTO `beverage_item_timeblocks`("beverage_item_id", "timeblock_id")
SELECT "id", "timeblock_id"
FROM `__old_beverage_items`;--> statement-breakpoint
DROP TABLE `__old_beverage_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
