CREATE TABLE `impersonation_session` (
	`admin_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`ended_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`reason` text,
	`session_token` text NOT NULL,
	`target_user_id` text NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `impersonation_admin_idx` ON `impersonation_session` (`admin_user_id`);--> statement-breakpoint
CREATE INDEX `impersonation_session_token_idx` ON `impersonation_session` (`session_token`);