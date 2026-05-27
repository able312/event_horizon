PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `vendor_items` RENAME TO `__old_vendor_items`;--> statement-breakpoint
CREATE TABLE `vendor_items` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
UPDATE `timeblocks`
SET `details` = CASE
	WHEN trim(coalesce(`details`, '')) = '' THEN (
		SELECT `ov`.`notes`
		FROM `__old_vendor_items` `ov`
		WHERE `ov`.`timeblock_id` = `timeblocks`.`id`
		  AND trim(coalesce(`ov`.`notes`, '')) <> ''
		LIMIT 1
	)
		ELSE `details` || char(10) || char(10) || (
		SELECT `ov`.`notes`
		FROM `__old_vendor_items` `ov`
		WHERE `ov`.`timeblock_id` = `timeblocks`.`id`
		  AND trim(coalesce(`ov`.`notes`, '')) <> ''
		LIMIT 1
	)
END
WHERE `section_type` = 'vendor'
  AND EXISTS (
    SELECT 1
    FROM `__old_vendor_items` `ov`
    WHERE `ov`.`timeblock_id` = `timeblocks`.`id`
      AND trim(coalesce(`ov`.`notes`, '')) <> ''
  );--> statement-breakpoint
INSERT INTO `vendor_items`("id", "timeblock_id", "contact_name", "contact_phone", "contact_email")
SELECT "id", "timeblock_id", "contact_name", "contact_phone", "contact_email"
FROM `__old_vendor_items`;--> statement-breakpoint
INSERT INTO `vendor_items`("id", "timeblock_id", "contact_name", "contact_phone", "contact_email")
SELECT
	lower(hex(randomblob(4))) || '-' ||
	lower(hex(randomblob(2))) || '-' ||
	lower(hex(randomblob(2))) || '-' ||
	lower(hex(randomblob(2))) || '-' ||
	lower(hex(randomblob(6))),
	`t`.`id`,
	'',
	'',
	''
FROM `timeblocks` `t`
LEFT JOIN `vendor_items` `v` ON `v`.`timeblock_id` = `t`.`id`
WHERE `t`.`section_type` = 'vendor'
  AND `v`.`id` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_items_timeblock_id_unique` ON `vendor_items` (`timeblock_id`);--> statement-breakpoint
DROP TABLE `__old_vendor_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
