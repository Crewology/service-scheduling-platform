CREATE TABLE `event_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`eventType` varchar(100),
	`defaultVenue` text,
	`serviceGroups` json NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `event_templates` ADD CONSTRAINT `event_templates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `event_template_user_idx` ON `event_templates` (`userId`);