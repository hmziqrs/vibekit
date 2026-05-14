CREATE TABLE `ab_assignment` (
	`assigned_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`experiment_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`user_id` text,
	`variant_id` text NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `ab_experiment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `ab_variant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ab_assignment_experiment_idx` ON `ab_assignment` (`experiment_id`);--> statement-breakpoint
CREATE INDEX `ab_assignment_user_idx` ON `ab_assignment` (`user_id`);--> statement-breakpoint
CREATE INDEX `ab_assignment_session_idx` ON `ab_assignment` (`session_id`);--> statement-breakpoint
CREATE TABLE `ab_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`event_name` text NOT NULL,
	`event_type` text NOT NULL,
	`event_value` integer,
	`experiment_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text DEFAULT '{}',
	`session_id` text,
	`user_id` text,
	`variant_id` text NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `ab_experiment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `ab_variant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ab_event_experiment_idx` ON `ab_event` (`experiment_id`);--> statement-breakpoint
CREATE INDEX `ab_event_type_idx` ON `ab_event` (`event_type`);--> statement-breakpoint
CREATE INDEX `ab_event_created_idx` ON `ab_event` (`created_at`);--> statement-breakpoint
CREATE TABLE `ab_experiment` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`end_date` integer,
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`start_date` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`target_metric` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`winning_variant_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ab_experiment_key_unique` ON `ab_experiment` (`key`);--> statement-breakpoint
CREATE INDEX `ab_experiment_key_idx` ON `ab_experiment` (`key`);--> statement-breakpoint
CREATE INDEX `ab_experiment_status_idx` ON `ab_experiment` (`status`);--> statement-breakpoint
CREATE TABLE `ab_variant` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`experiment_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_control` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`payload` text DEFAULT '{}',
	`traffic_percentage` integer DEFAULT 50 NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `ab_experiment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ab_variant_experiment_idx` ON `ab_variant` (`experiment_id`);--> statement-breakpoint
CREATE TABLE `api_key` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`last_used_at` integer,
	`name` text NOT NULL,
	`rate_limit` integer,
	`request_count` integer DEFAULT 0 NOT NULL,
	`revoked_at` integer,
	`scopes` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_key_key_hash_unique` ON `api_key` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_key_user_idx` ON `api_key` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_key_hash_idx` ON `api_key` (`key_hash`);--> statement-breakpoint
CREATE TABLE `api_key_usage_log` (
	`api_key_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`endpoint` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text,
	`method` text NOT NULL,
	`status_code` integer NOT NULL,
	`user_agent` text,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_key`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_key_usage_api_key_idx` ON `api_key_usage_log` (`api_key_id`);--> statement-breakpoint
CREATE INDEX `api_key_usage_created_idx` ON `api_key_usage_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `blog_post_series` (
	`post_id` text NOT NULL,
	`series_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`post_id`, `series_id`),
	FOREIGN KEY (`post_id`) REFERENCES `blog_post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `blog_series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blog_post_series_post_id_idx` ON `blog_post_series` (`post_id`);--> statement-breakpoint
CREATE INDEX `blog_post_series_series_id_idx` ON `blog_post_series` (`series_id`);--> statement-breakpoint
CREATE TABLE `blog_post_view` (
	`country` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`post_id` text NOT NULL,
	`read_time` integer,
	`reading_progress` integer DEFAULT 0 NOT NULL,
	`referrer` text,
	`referrer_domain` text,
	`user_agent` text,
	`visitor_hash` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `blog_post`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blog_post_view_post_created_idx` ON `blog_post_view` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `blog_post_view_post_visitor_idx` ON `blog_post_view` (`post_id`,`visitor_hash`);--> statement-breakpoint
CREATE TABLE `blog_series` (
	`cover_image_url` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_series_slug_unique` ON `blog_series` (`slug`);--> statement-breakpoint
CREATE TABLE `comment` (
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`edited_at` integer,
	`html_content` text,
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text,
	`moderated_at` integer,
	`moderated_by` text,
	`parent_id` text,
	`post_id` text NOT NULL,
	`spam_reason` text,
	`spam_score` integer DEFAULT 0,
	`status` text DEFAULT 'pending' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_agent` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`moderated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `blog_post`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comment_post_status_idx` ON `comment` (`post_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_parent_idx` ON `comment` (`parent_id`);--> statement-breakpoint
CREATE INDEX `comment_author_idx` ON `comment` (`author_id`);--> statement-breakpoint
CREATE INDEX `comment_status_created_idx` ON `comment` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `config_version` (
	`changed_by` text,
	`config_key` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`environment` text,
	`id` text PRIMARY KEY NOT NULL,
	`new_value` text,
	`old_value` text,
	FOREIGN KEY (`changed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `config_version_key_idx` ON `config_version` (`config_key`);--> statement-breakpoint
CREATE INDEX `config_version_created_idx` ON `config_version` (`created_at`);--> statement-breakpoint
CREATE TABLE `feature_flag` (
	`cohort_rules` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`dependencies` text DEFAULT '[]',
	`description` text,
	`enabled` integer DEFAULT false NOT NULL,
	`environment` text,
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`kill_switch` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`rollout_percentage` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_flag_key_unique` ON `feature_flag` (`key`);--> statement-breakpoint
CREATE INDEX `feature_flag_key_idx` ON `feature_flag` (`key`);--> statement-breakpoint
CREATE INDEX `feature_flag_enabled_idx` ON `feature_flag` (`enabled`);--> statement-breakpoint
CREATE TABLE `integration` (
	`access_token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`external_account_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`last_error` text,
	`last_synced_at` integer,
	`metadata` text,
	`organization_id` text,
	`provider` text NOT NULL,
	`refresh_token` text,
	`scopes` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`token_expires_at` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `integration_user_idx` ON `integration` (`user_id`);--> statement-breakpoint
CREATE INDEX `integration_org_idx` ON `integration` (`organization_id`);--> statement-breakpoint
CREATE INDEX `integration_provider_idx` ON `integration` (`provider`,`status`);--> statement-breakpoint
CREATE TABLE `invoice` (
	`amount_in_cents` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL,
	`currency` text(3) NOT NULL,
	`due_date` integer,
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`paid_at` integer,
	`pdf_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`stripe_invoice_id` text,
	`subscription_id` text,
	`user_id` text,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscriber` (
	`confirmation_token` text NOT NULL,
	`confirmed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`email` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text,
	`name` text,
	`source` text DEFAULT 'blog',
	`status` text DEFAULT 'pending' NOT NULL,
	`unsubscribed_at` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscriber_confirmation_token_unique` ON `newsletter_subscriber` (`confirmation_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscriber_email_unique` ON `newsletter_subscriber` (`email`);--> statement-breakpoint
CREATE INDEX `newsletter_subscriber_status_idx` ON `newsletter_subscriber` (`status`);--> statement-breakpoint
CREATE INDEX `newsletter_subscriber_email_idx` ON `newsletter_subscriber` (`email`);--> statement-breakpoint
CREATE INDEX `newsletter_subscriber_token_idx` ON `newsletter_subscriber` (`confirmation_token`);--> statement-breakpoint
CREATE TABLE `notification_preference` (
	`channel` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_pref_user_type_idx` ON `notification_preference` (`user_id`,`type`,`channel`);--> statement-breakpoint
CREATE TABLE `payment_method` (
	`brand` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL,
	`expiry_month` integer,
	`expiry_year` integer,
	`id` text PRIMARY KEY NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`last4` text,
	`stripe_payment_method_id` text NOT NULL,
	`type` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `push_subscription` (
	`auth` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL,
	`endpoint` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`p256dh` text NOT NULL,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `push_sub_user_idx` ON `push_subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `push_sub_endpoint_idx` ON `push_subscription` (`endpoint`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`canceled_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL,
	`current_period_end` integer NOT NULL,
	`current_period_start` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`organization_id` text,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'incomplete' NOT NULL,
	`stripe_customer_id` text,
	`stripe_price_id` text,
	`stripe_subscription_id` text,
	`trial_end` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `subscription_plan`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscription_org_idx` ON `subscription` (`organization_id`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_user_idx` ON `subscription` (`user_id`);--> statement-breakpoint
CREATE TABLE `subscription_event` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL,
	`from_plan_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`subscription_id` text NOT NULL,
	`to_plan_id` text,
	`type` text NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscription_plan` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`currency` text(3) NOT NULL,
	`description` text,
	`features` text,
	`id` text PRIMARY KEY NOT NULL,
	`interval` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`price_in_cents` integer NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`stripe_price_id` text,
	`trial_days` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_plan_slug_unique` ON `subscription_plan` (`slug`);--> statement-breakpoint
CREATE INDEX `subscription_plan_slug_idx` ON `subscription_plan` (`slug`);--> statement-breakpoint
CREATE TABLE `upload_session` (
	`chunk_size` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`file_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`received_chunks` text DEFAULT '[]',
	`status` text DEFAULT 'pending' NOT NULL,
	`storage_key` text,
	`total_chunks` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `upload_session_user_idx` ON `upload_session` (`user_id`);--> statement-breakpoint
CREATE INDEX `upload_session_status_idx` ON `upload_session` (`status`);--> statement-breakpoint
CREATE INDEX `upload_session_expires_idx` ON `upload_session` (`expires_at`);--> statement-breakpoint
CREATE TABLE `usage_record` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metric_type` text NOT NULL,
	`period_end` integer NOT NULL,
	`period_start` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`subscription_id` text NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `webhook_delivery` (
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`endpoint_id` text NOT NULL,
	`event_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`next_retry_at` integer,
	`payload` text NOT NULL,
	`response_body` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`status_code` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`endpoint_id`) REFERENCES `webhook_endpoint`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_delivery_endpoint_idx` ON `webhook_delivery` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `webhook_delivery_status_idx` ON `webhook_delivery` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `webhook_delivery_event_type_idx` ON `webhook_delivery` (`event_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `webhook_endpoint` (
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`events` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`url` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_endpoint_user_idx` ON `webhook_endpoint` (`user_id`);--> statement-breakpoint
CREATE INDEX `webhook_endpoint_active_idx` ON `webhook_endpoint` (`active`);--> statement-breakpoint
DROP INDEX `organization_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_active_idx` ON `organization` (`slug`,`deleted_at`);--> statement-breakpoint
ALTER TABLE `blog_post` ADD `view_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notification` ADD `link` text;--> statement-breakpoint
ALTER TABLE `system_config` ADD `environment` text;--> statement-breakpoint
CREATE UNIQUE INDEX `org_member_user_org_idx` ON `organization_member` (`user_id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_user_team_idx` ON `team_member` (`user_id`,`team_id`);