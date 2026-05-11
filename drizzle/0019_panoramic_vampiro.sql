CREATE TABLE `content_report` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`reporter_id` text,
	`resolution_note` text,
	`resolved_at` integer,
	`resolved_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_report_entity_idx` ON `content_report` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `content_report_status_created_idx` ON `content_report` (`status`,`created_at`);