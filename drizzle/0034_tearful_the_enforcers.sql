CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(50) NOT NULL,
	`targetId` int NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `adminRole` enum('super_admin','support_agent','moderator');--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_log` (`actorId`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `audit_target_idx` ON `audit_log` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`createdAt`);