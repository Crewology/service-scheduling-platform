CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`smsEnabled` boolean NOT NULL DEFAULT true,
	`pushEnabled` boolean NOT NULL DEFAULT true,
	`bookingEmail` boolean NOT NULL DEFAULT true,
	`reminderEmail` boolean NOT NULL DEFAULT true,
	`messageEmail` boolean NOT NULL DEFAULT true,
	`paymentEmail` boolean NOT NULL DEFAULT true,
	`marketingEmail` boolean NOT NULL DEFAULT false,
	`bookingSms` boolean NOT NULL DEFAULT true,
	`reminderSms` boolean NOT NULL DEFAULT true,
	`messageSms` boolean NOT NULL DEFAULT false,
	`paymentSms` boolean NOT NULL DEFAULT false,
	`unsubscribeToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `notification_preferences_unsubscribeToken_unique` UNIQUE(`unsubscribeToken`)
);
--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notif_pref_user_idx` ON `notification_preferences` (`userId`);--> statement-breakpoint
CREATE INDEX `notif_pref_token_idx` ON `notification_preferences` (`unsubscribeToken`);