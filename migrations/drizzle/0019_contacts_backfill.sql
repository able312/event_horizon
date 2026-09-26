-- Moves each event's inline client and its vendor_items into contacts/event_contacts,
-- then drops the legacy columns, the vendor timeblocks and the vendor_items table.
-- Contacts are merged by normalized email (and matched to existing active contacts);
-- contacts without an email are never merged.

-- Migrated vendors need a category; make sure the 'other' fallback exists.
INSERT OR IGNORE INTO `vendor_categories` (`id`, `key`, `label`, `color_token`, `sort_order`)
VALUES ('a3d37ae9-057c-4946-bc63-3b24b7ce762e', 'other', 'Other', 'slate', 80);--> statement-breakpoint

-- One row per person/company found in the legacy data, before merging.
CREATE TABLE `__contact_sources` (
	`source_id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`role` text NOT NULL,
	`role_rank` integer NOT NULL,
	`kind` text NOT NULL,
	`full_name` text,
	`organization_name` text,
	`display_name` text NOT NULL,
	`email` text,
	`email_normalized` text,
	`phone` text,
	`role_label` text,
	`notes` text,
	`is_primary` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`identity_key` text
);--> statement-breakpoint

INSERT INTO `__contact_sources` (
	`source_id`, `event_id`, `role`, `role_rank`, `kind`, `full_name`, `organization_name`,
	`display_name`, `email`, `email_normalized`, `phone`, `role_label`, `notes`, `is_primary`, `sort_order`
)
SELECT
	'client:' || `e`.`id`,
	`e`.`id`,
	'client',
	0,
	'individual',
	nullif(trim(`e`.`client_name`), ''),
	NULL,
	coalesce(nullif(trim(`e`.`client_name`), ''), nullif(trim(`e`.`client_email`), ''), trim(`e`.`client_phone`)),
	nullif(trim(`e`.`client_email`), ''),
	nullif(lower(trim(`e`.`client_email`)), ''),
	nullif(trim(`e`.`client_phone`), ''),
	NULL,
	NULL,
	1,
	0
FROM `events` `e`
WHERE trim(coalesce(`e`.`client_name`, '')) <> ''
	OR trim(coalesce(`e`.`client_email`, '')) <> ''
	OR trim(coalesce(`e`.`client_phone`, '')) <> '';--> statement-breakpoint

INSERT INTO `__contact_sources` (
	`source_id`, `event_id`, `role`, `role_rank`, `kind`, `full_name`, `organization_name`,
	`display_name`, `email`, `email_normalized`, `phone`, `role_label`, `notes`, `is_primary`, `sort_order`
)
SELECT
	'vendor:' || `src`.`timeblock_id`,
	`src`.`event_id`,
	'vendor',
	1,
	CASE WHEN `src`.`contact_name` IS NULL AND `src`.`title` IS NOT NULL THEN 'organization' ELSE 'individual' END,
	`src`.`contact_name`,
	`src`.`title`,
	coalesce(`src`.`contact_name`, `src`.`title`, `src`.`email`, `src`.`phone`, 'Unnamed vendor'),
	`src`.`email`,
	lower(`src`.`email`),
	`src`.`phone`,
	`src`.`title`,
	-- Keep the timeblock-only details on the assignment so nothing is lost
	nullif(concat_ws(
		char(10),
		CASE WHEN `src`.`time` IS NOT NULL THEN 'Time: ' || `src`.`time` END,
		CASE WHEN `src`.`assigned_to` IS NOT NULL THEN 'Assigned to: ' || `src`.`assigned_to` END,
		`src`.`details`
	), ''),
	0,
	row_number() OVER (PARTITION BY `src`.`event_id` ORDER BY `src`.`created_at`, `src`.`timeblock_id`) - 1
FROM (
	SELECT
		`t`.`id` AS `timeblock_id`,
		`t`.`event_id`,
		`t`.`created_at`,
		nullif(trim(`t`.`title`), '') AS `title`,
		nullif(trim(`t`.`time`), '') AS `time`,
		nullif(trim(`t`.`details`), '') AS `details`,
		nullif(trim(`t`.`assigned_to`), '') AS `assigned_to`,
		nullif(trim(`v`.`contact_name`), '') AS `contact_name`,
		nullif(trim(`v`.`contact_email`), '') AS `email`,
		nullif(trim(`v`.`contact_phone`), '') AS `phone`
	FROM `timeblocks` `t`
	LEFT JOIN `vendor_items` `v` ON `v`.`timeblock_id` = `t`.`id`
	WHERE `t`.`section_type` = 'vendor'
) `src`
-- Skip vendor rows that were created but never filled in
WHERE coalesce(`src`.`title`, `src`.`contact_name`, `src`.`email`, `src`.`phone`, `src`.`details`) IS NOT NULL;--> statement-breakpoint

-- Rows sharing an email become one contact; everything else is its own contact.
UPDATE `__contact_sources`
SET `identity_key` = coalesce('email:' || `email_normalized`, 'source:' || `source_id`);--> statement-breakpoint

CREATE TABLE `__contact_identities` (
	`identity_key` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`is_existing` integer NOT NULL
);--> statement-breakpoint

INSERT INTO `__contact_identities` (`identity_key`, `contact_id`, `is_existing`)
SELECT
	`s`.`identity_key`,
	coalesce(
		(
			SELECT `c`.`id`
			FROM `contacts` `c`
			WHERE `c`.`email_normalized` = `s`.`email_normalized`
				AND `c`.`archived_at` IS NULL
		),
		lower(hex(randomblob(4))) || '-' ||
		lower(hex(randomblob(2))) || '-4' ||
		substr(lower(hex(randomblob(2))), 2) || '-' ||
		substr('89ab', 1 + (abs(random()) % 4), 1) ||
		substr(lower(hex(randomblob(2))), 2) || '-' ||
		lower(hex(randomblob(6)))
	),
	EXISTS (
		SELECT 1
		FROM `contacts` `c`
		WHERE `c`.`email_normalized` = `s`.`email_normalized`
			AND `c`.`archived_at` IS NULL
	)
FROM (SELECT DISTINCT `identity_key`, `email_normalized` FROM `__contact_sources`) `s`;--> statement-breakpoint

-- New contacts take their details from the first source: clients before vendors, then event order.
INSERT INTO `contacts` (
	`id`, `kind`, `first_name`, `last_name`, `organization_name`, `display_name`,
	`email`, `phone`, `created_at`, `updated_at`
)
SELECT
	`i`.`contact_id`,
	`s`.`kind`,
	CASE
		WHEN `s`.`full_name` IS NULL THEN NULL
		WHEN instr(`s`.`full_name`, ' ') > 0 THEN substr(`s`.`full_name`, 1, instr(`s`.`full_name`, ' ') - 1)
		ELSE `s`.`full_name`
	END,
	CASE
		WHEN instr(coalesce(`s`.`full_name`, ''), ' ') > 0 THEN trim(substr(`s`.`full_name`, instr(`s`.`full_name`, ' ') + 1))
	END,
	`s`.`organization_name`,
	`s`.`display_name`,
	`s`.`email`,
	`s`.`phone`,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `__contact_identities` `i`
INNER JOIN (
	SELECT
		*,
		row_number() OVER (PARTITION BY `identity_key` ORDER BY `role_rank`, `event_id`, `sort_order`) AS `pick`
	FROM `__contact_sources`
) `s` ON `s`.`identity_key` = `i`.`identity_key` AND `s`.`pick` = 1
WHERE `i`.`is_existing` = 0;--> statement-breakpoint

-- Standing roles for every migrated contact.
INSERT INTO `contact_roles` (`id`, `contact_id`, `role`, `vendor_category_id`, `created_at`)
SELECT
	lower(hex(randomblob(4))) || '-' ||
	lower(hex(randomblob(2))) || '-4' ||
	substr(lower(hex(randomblob(2))), 2) || '-' ||
	substr('89ab', 1 + (abs(random()) % 4), 1) ||
	substr(lower(hex(randomblob(2))), 2) || '-' ||
	lower(hex(randomblob(6))),
	`r`.`contact_id`,
	`r`.`role`,
	`r`.`vendor_category_id`,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
	SELECT DISTINCT
		`i`.`contact_id`,
		`s`.`role`,
		CASE WHEN `s`.`role` = 'vendor' THEN (SELECT `id` FROM `vendor_categories` WHERE `key` = 'other') END AS `vendor_category_id`
	FROM `__contact_sources` `s`
	INNER JOIN `__contact_identities` `i` ON `i`.`identity_key` = `s`.`identity_key`
) `r`
WHERE NOT EXISTS (
	SELECT 1
	FROM `contact_roles` `cr`
	WHERE `cr`.`contact_id` = `r`.`contact_id`
		AND `cr`.`role` = `r`.`role`
		AND coalesce(`cr`.`vendor_category_id`, '') = coalesce(`r`.`vendor_category_id`, '')
);--> statement-breakpoint

-- Event assignments. The same contact twice on one event in one role collapses into a single row.
INSERT INTO `event_contacts` (
	`id`, `event_id`, `contact_id`, `role`, `vendor_category_id`, `is_primary`,
	`role_label`, `notes`, `sort_order`, `created_at`, `updated_at`
)
SELECT
	lower(hex(randomblob(4))) || '-' ||
	lower(hex(randomblob(2))) || '-4' ||
	substr(lower(hex(randomblob(2))), 2) || '-' ||
	substr('89ab', 1 + (abs(random()) % 4), 1) ||
	substr(lower(hex(randomblob(2))), 2) || '-' ||
	lower(hex(randomblob(6))),
	`a`.`event_id`,
	`a`.`contact_id`,
	`a`.`role`,
	`a`.`vendor_category_id`,
	-- Don't create a second primary client if one was already set in the app
	`a`.`is_primary` AND NOT EXISTS (
		SELECT 1
		FROM `event_contacts` `ec`
		WHERE `ec`.`event_id` = `a`.`event_id`
			AND `ec`.`role` = `a`.`role`
			AND `ec`.`is_primary` = 1
			AND `ec`.`removed_at` IS NULL
	),
	`a`.`role_label`,
	`a`.`notes`,
	`a`.`sort_order`,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
	SELECT
		`s`.`event_id`,
		`i`.`contact_id`,
		`s`.`role`,
		CASE WHEN `s`.`role` = 'vendor' THEN (SELECT `id` FROM `vendor_categories` WHERE `key` = 'other') END AS `vendor_category_id`,
		max(`s`.`is_primary`) AS `is_primary`,
		group_concat(`s`.`role_label`, ' / ' ORDER BY `s`.`sort_order`) AS `role_label`,
		group_concat(`s`.`notes`, char(10) || char(10) ORDER BY `s`.`sort_order`) AS `notes`,
		min(`s`.`sort_order`) AS `sort_order`
	FROM `__contact_sources` `s`
	INNER JOIN `__contact_identities` `i` ON `i`.`identity_key` = `s`.`identity_key`
	GROUP BY `s`.`event_id`, `i`.`contact_id`, `s`.`role`
) `a`
WHERE NOT EXISTS (
	SELECT 1
	FROM `event_contacts` `ec`
	WHERE `ec`.`event_id` = `a`.`event_id`
		AND `ec`.`contact_id` = `a`.`contact_id`
		AND `ec`.`role` = `a`.`role`
		AND coalesce(`ec`.`vendor_category_id`, '') = coalesce(`a`.`vendor_category_id`, '')
		AND `ec`.`removed_at` IS NULL
);--> statement-breakpoint

DROP TABLE `__contact_identities`;--> statement-breakpoint
DROP TABLE `__contact_sources`;--> statement-breakpoint

-- Vendors are contacts now; remove the vendor timeblocks and their satellite table.
DROP TABLE `vendor_items`;--> statement-breakpoint
DELETE FROM `timeblocks` WHERE `section_type` = 'vendor';--> statement-breakpoint

ALTER TABLE `events` DROP COLUMN `client_name`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `client_email`;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `client_phone`;
