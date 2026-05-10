CREATE TABLE `blog_post_revision` (
	`author_id` text NOT NULL,
	`change_description` text,
	`content_body` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`excerpt` text,
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`title` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `blog_post`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blog_revision_post_id_idx` ON `blog_post_revision` (`post_id`);