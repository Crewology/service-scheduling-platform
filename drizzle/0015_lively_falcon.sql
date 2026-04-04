CREATE TABLE `quote_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`providerId` int NOT NULL,
	`serviceId` int,
	`categoryId` int,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`preferredDate` date,
	`preferredTime` varchar(20),
	`quoteLocationType` enum('mobile','fixed_location','virtual'),
	`location` text,
	`attachmentUrls` text,
	`quotedAmount` decimal(10,2),
	`quotedDurationMinutes` int,
	`providerNotes` text,
	`validUntil` timestamp,
	`quoteStatus` enum('pending','quoted','accepted','declined','expired','booked') NOT NULL DEFAULT 'pending',
	`declineReason` text,
	`bookingId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `quote_customer_idx` ON `quote_requests` (`customerId`);--> statement-breakpoint
CREATE INDEX `quote_provider_idx` ON `quote_requests` (`providerId`);--> statement-breakpoint
CREATE INDEX `quote_status_idx` ON `quote_requests` (`quoteStatus`);