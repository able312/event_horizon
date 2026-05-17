CREATE TABLE `cart_details` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`time` text,
	`layout` text DEFAULT 'template-12-hole-shotgun' NOT NULL,
	`custom_grid` text,
	`what_goes_on_carts` text DEFAULT '',
	`assigned_to` text DEFAULT '',
	`renting_carts` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
