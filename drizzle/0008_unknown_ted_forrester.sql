CREATE INDEX `audit_log_action_created_idx` ON `audit_log` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `blog_post_status_deleted_published_idx` ON `blog_post` (`status`,`deleted_at`,`published_at`);--> statement-breakpoint
CREATE INDEX `blog_post_deleted_idx` ON `blog_post` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `blog_post_tag_post_id_idx` ON `blog_post_tag` (`post_id`);--> statement-breakpoint
CREATE INDEX `blog_post_tag_tag_id_idx` ON `blog_post_tag` (`tag_id`);--> statement-breakpoint
CREATE INDEX `contact_submission_created_idx` ON `contact_submission` (`created_at`);--> statement-breakpoint
CREATE INDEX `item_user_deleted_idx` ON `item` (`user_id`,`deleted_at`);