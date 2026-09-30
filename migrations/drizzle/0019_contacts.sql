CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'individual' NOT NULL,
	`first_name` text,
	`last_name` text,
	`organization_name` text,
	`display_name` text NOT NULL,
	`email` text,
	`email_normalized` text GENERATED ALWAYS AS (nullif(lower(trim("email")), '')) STORED,
	`phone` text,
	`notes` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "contacts_kind_check" CHECK("kind" IN ('individual', 'organization'))
);--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_email_unique` ON `contacts` (`email_normalized`) WHERE "email_normalized" IS NOT NULL AND "archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX `contacts_display_name_idx` ON `contacts` (`display_name`);--> statement-breakpoint
CREATE TABLE `vendor_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`color_token` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` text
);--> statement-breakpoint
CREATE UNIQUE INDEX `vendor_categories_key_unique` ON `vendor_categories` (`key`);--> statement-breakpoint
INSERT INTO `vendor_categories` (`id`, `key`, `label`, `color_token`, `sort_order`) VALUES
	('5b5a9c58-a3df-4203-abce-15dfa2411ad5', 'catering', 'Catering', 'teal', 10),
	('26d8ebeb-3792-415b-8083-c416dafb0a0b', 'rentals', 'Rentals', 'amber', 20),
	('fe9b94b4-0965-42fc-abd8-143257cdcd98', 'music', 'Music', 'violet', 30),
	('02de610a-9bf7-4186-b425-a8287390a708', 'photography', 'Photography', 'sky', 40),
	('9c724688-dd7f-4c62-94e5-ab8260c868ad', 'venue', 'Venue', 'stone', 50),
	('f44226bd-26d5-4c7e-9445-8621441cbf57', 'av_staging', 'AV and staging', 'indigo', 60),
	('66c5f6ae-69aa-43a1-98dc-8cc3ae67efd9', 'florals', 'Florals', 'rose', 70),
	('a3d37ae9-057c-4946-bc63-3b24b7ce762e', 'other', 'Other', 'slate', 80);--> statement-breakpoint
CREATE TABLE `contact_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`role` text NOT NULL,
	`vendor_category_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_category_id`) REFERENCES `vendor_categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "contact_roles_role_check" CHECK("role" IN ('client', 'coordinator', 'vendor')),
	CONSTRAINT "contact_roles_vendor_category_check" CHECK(("role" = 'vendor') = ("vendor_category_id" IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX `contact_roles_unique` ON `contact_roles` (`contact_id`, `role`, coalesce("vendor_category_id", ''));--> statement-breakpoint
CREATE INDEX `contact_roles_role_category_idx` ON `contact_roles` (`role`, `vendor_category_id`);--> statement-breakpoint
CREATE TABLE `event_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`role` text NOT NULL,
	`vendor_category_id` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`role_label` text,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`removed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_category_id`) REFERENCES `vendor_categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "event_contacts_role_check" CHECK("role" IN ('client', 'coordinator', 'vendor')),
	CONSTRAINT "event_contacts_vendor_category_check" CHECK(("role" = 'vendor') = ("vendor_category_id" IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX `event_contacts_unique_active` ON `event_contacts` (`event_id`, `contact_id`, `role`, coalesce("vendor_category_id", '')) WHERE "removed_at" IS NULL;--> statement-breakpoint
CREATE INDEX `event_contacts_by_event` ON `event_contacts` (`event_id`) WHERE "removed_at" IS NULL;--> statement-breakpoint
CREATE INDEX `event_contacts_by_contact` ON `event_contacts` (`contact_id`);
