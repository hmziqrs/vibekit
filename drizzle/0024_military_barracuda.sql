CREATE TABLE `oauth_state` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`data` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oauth_state_created_idx` ON `oauth_state` (`created_at`);