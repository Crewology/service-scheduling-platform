CREATE TABLE `bulk_booking_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255),
	`eventDate` varchar(20),
	`eventType` varchar(100),
	`eventVenue` text,
	`slots` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bulk_booking_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bulk_booking_drafts` ADD CONSTRAINT `bulk_booking_drafts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bulk_draft_user_idx` ON `bulk_booking_drafts` (`userId`);