CREATE TABLE IF NOT EXISTS `rate_limit_log` (
  `key` text NOT NULL,
  `count` integer NOT NULL DEFAULT 1,
  `reset_at` integer NOT NULL,
  PRIMARY KEY (`key`)
);
