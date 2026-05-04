CREATE TABLE `waitlist_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serviceId` int NOT NULL,
	`providerId` int NOT NULL,
	`bookingDate` date NOT NULL,
	`startTime` time NOT NULL,
	`endTime` time NOT NULL,
	`position` int NOT NULL,
	`status` enum('waiting','notified','booked','expired','cancelled') NOT NULL DEFAULT 'waiting',
	`notifiedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waitlist_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `waitlist_user_idx` ON `waitlist_entries` (`userId`);--> statement-breakpoint
CREATE INDEX `waitlist_service_date_idx` ON `waitlist_entries` (`serviceId`,`bookingDate`,`startTime`);--> statement-breakpoint
CREATE INDEX `waitlist_provider_idx` ON `waitlist_entries` (`providerId`);--> statement-breakpoint
CREATE INDEX `waitlist_status_idx` ON `waitlist_entries` (`status`);