CREATE TABLE `blog_series` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL UNIQUE,
  `description` text,
  `cover_image_url` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE TABLE `blog_post_series` (
  `post_id` text NOT NULL REFERENCES `blog_post`(`id`) ON DELETE CASCADE,
  `series_id` text NOT NULL REFERENCES `blog_series`(`id`) ON DELETE CASCADE,
  `sort_order` integer DEFAULT 0 NOT NULL,
  PRIMARY KEY(`post_id`, `series_id`)
);
CREATE INDEX `blog_post_series_post_id_idx` ON `blog_post_series` (`post_id`);
CREATE INDEX `blog_post_series_series_id_idx` ON `blog_post_series` (`series_id`);
