CREATE TABLE `contact_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`adminUserId` int NOT NULL,
	`message` text NOT NULL,
	`templateId` int,
	`emailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reply_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` enum('general','booking','payment','provider','technical','other') NOT NULL DEFAULT 'general',
	`subject` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reply_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contact_replies` ADD CONSTRAINT `contact_replies_submissionId_contact_submissions_id_fk` FOREIGN KEY (`submissionId`) REFERENCES `contact_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_replies` ADD CONSTRAINT `contact_replies_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reply_templates` ADD CONSTRAINT `reply_templates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reply_submission_idx` ON `contact_replies` (`submissionId`);--> statement-breakpoint
CREATE INDEX `template_category_idx` ON `reply_templates` (`category`);--> statement-breakpoint
CREATE INDEX `template_active_idx` ON `reply_templates` (`isActive`);