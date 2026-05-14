DROP INDEX `notification_pref_user_type_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `notification_pref_user_type_idx` ON `notification_preference` (`user_id`,`type`,`channel`);--> statement-breakpoint
DROP INDEX `push_sub_endpoint_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `push_sub_endpoint_idx` ON `push_subscription` (`endpoint`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stripe_webhook_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`error_message` text,
	`event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`next_retry_at` integer,
	`processed_at` integer,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_stripe_webhook_event`("created_at", "error_message", "event_id", "event_type", "id", "next_retry_at", "processed_at", "retry_count", "status") SELECT "created_at", "error_message", "event_id", "event_type", "id", "next_retry_at", "processed_at", "retry_count", "status" FROM `stripe_webhook_event`;--> statement-breakpoint
DROP TABLE `stripe_webhook_event`;--> statement-breakpoint
ALTER TABLE `__new_stripe_webhook_event` RENAME TO `stripe_webhook_event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_webhook_event_event_id_unique` ON `stripe_webhook_event` (`event_id`);