CREATE TABLE `saved_provider_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20) DEFAULT '#3b82f6',
	`icon` varchar(50) DEFAULT 'folder',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_provider_folders_id` PRIMARY KEY(`id`),
	CONSTRAINT `folder_user_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `customer_favorites` ADD `folderId` int;--> statement-breakpoint
ALTER TABLE `saved_provider_folders` ADD CONSTRAINT `saved_provider_folders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `folder_user_idx` ON `saved_provider_folders` (`userId`);