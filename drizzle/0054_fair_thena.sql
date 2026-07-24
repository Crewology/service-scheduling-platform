CREATE TABLE `social_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` text NOT NULL,
	`post_type` varchar(50) NOT NULL,
	`category_id` int,
	`category_name` varchar(255),
	`platforms` json NOT NULL,
	`results` json,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`scheduled_at` bigint,
	`posted_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `social_posts_id` PRIMARY KEY(`id`)
);
