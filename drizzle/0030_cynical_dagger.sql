ALTER TABLE `service_providers` ADD `trustScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `service_providers` ADD `trustLevel` enum('new','rising','trusted','top_pro') DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `service_providers` ADD `trustScoreUpdatedAt` timestamp;--> statement-breakpoint
CREATE INDEX `trust_level_idx` ON `service_providers` (`trustLevel`,`isActive`);