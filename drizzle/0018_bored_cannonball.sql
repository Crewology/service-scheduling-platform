ALTER TABLE `booking_sessions` MODIFY COLUMN `status` enum('scheduled','completed','cancelled','rescheduled','no_show') NOT NULL DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `bookingSource` enum('direct','embed_widget','provider_page','api','quote') NOT NULL DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE `booking_sessions` ADD `rescheduledToSessionId` int;--> statement-breakpoint
ALTER TABLE `booking_sessions` ADD `rescheduledFromDate` varchar(10);--> statement-breakpoint
ALTER TABLE `booking_sessions` ADD `rescheduledAt` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `quoteRequestId` int;