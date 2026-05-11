CREATE TABLE `announcement` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text,
	`ends_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`message` text NOT NULL,
	`starts_at` integer,
	`type` text DEFAULT 'info' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `announcement_active_idx` ON `announcement` (`is_active`);--> statement-breakpoint
CREATE TABLE `system_config` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`type` text DEFAULT 'string' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_by` text,
	`value` text NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_config_key_unique` ON `system_config` (`key`);