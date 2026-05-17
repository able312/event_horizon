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
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text DEFAULT 'function' NOT NULL,
	`status` text DEFAULT 'new_lead' NOT NULL,
	`start_date_time` text,
	`end_date_time` text,
	`client_name` text,
	`client_email` text,
	`client_phone` text,
	`min_guests` integer,
	`max_guests` integer,
	`guest_count_final` integer,
	`drive_folder_id` text,
	`calendar_id` text,
	`client_notes` text,
	`internal_notes` text,
	`is_internal` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `food_items` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer,
	`service_style` text,
	`includes` text,
	`unit_price_cents` integer,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `timeblocks` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`time` text,
	`section_type` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vendor_items` (
	`id` text PRIMARY KEY NOT NULL,
	`timeblock_id` text NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`notes` text,
	FOREIGN KEY (`timeblock_id`) REFERENCES `timeblocks`(`id`) ON UPDATE no action ON DELETE cascade
);
