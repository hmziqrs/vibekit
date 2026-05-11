CREATE TABLE `team` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organization_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_organization_id_idx` ON `team` (`organization_id`);--> statement-breakpoint
CREATE TABLE `team_activity` (
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`entity_id` text,
	`entity_type` text,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`team_id` text NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_activity_team_created_idx` ON `team_activity` (`team_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `team_member` (
	`id` text PRIMARY KEY NOT NULL,
	`joined_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_member_team_id_idx` ON `team_member` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_member_user_id_idx` ON `team_member` (`user_id`);