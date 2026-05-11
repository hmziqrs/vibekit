CREATE TABLE `security_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`event_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text,
	`metadata` text,
	`user_agent` text,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `security_event_type_created_idx` ON `security_event` (`event_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `security_event_user_id_idx` ON `security_event` (`user_id`);