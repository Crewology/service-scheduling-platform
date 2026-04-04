CREATE TABLE `portfolio_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`categoryId` int,
	`title` varchar(255),
	`description` text,
	`imageUrl` varchar(500) NOT NULL,
	`mediaType` enum('image','before_after') NOT NULL DEFAULT 'image',
	`beforeImageUrl` varchar(500),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `portfolio_items` ADD CONSTRAINT `portfolio_items_providerId_service_providers_id_fk` FOREIGN KEY (`providerId`) REFERENCES `service_providers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `portfolio_items` ADD CONSTRAINT `portfolio_items_categoryId_service_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `service_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `portfolio_provider_cat_idx` ON `portfolio_items` (`providerId`,`categoryId`);--> statement-breakpoint
CREATE INDEX `portfolio_provider_active_idx` ON `portfolio_items` (`providerId`,`isActive`);