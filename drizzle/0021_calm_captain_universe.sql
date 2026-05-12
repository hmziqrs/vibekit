CREATE TABLE `notification` (
	`body` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`entity_id` text,
	`entity_type` text,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`read_at` integer,
	`title` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_user_read_idx` ON `notification` (`user_id`,`read_at`);