CREATE TABLE `booking_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`sessionDate` varchar(10) NOT NULL,
	`startTime` time NOT NULL,
	`endTime` time NOT NULL,
	`sessionNumber` int NOT NULL,
	`status` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`providerNotes` text,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `bookingType` enum('single','multi_day','recurring') DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `endDate` varchar(10);--> statement-breakpoint
ALTER TABLE `bookings` ADD `totalDays` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `bookings` ADD `recurrenceFrequency` enum('weekly','biweekly');--> statement-breakpoint
ALTER TABLE `bookings` ADD `recurrenceDaysOfWeek` varchar(50);--> statement-breakpoint
ALTER TABLE `bookings` ADD `recurrenceTotalWeeks` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `recurrenceTotalSessions` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `parentBookingId` int;--> statement-breakpoint
ALTER TABLE `booking_sessions` ADD CONSTRAINT `booking_sessions_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `session_booking_idx` ON `booking_sessions` (`bookingId`);--> statement-breakpoint
CREATE INDEX `session_date_idx` ON `booking_sessions` (`sessionDate`);--> statement-breakpoint
CREATE INDEX `session_status_idx` ON `booking_sessions` (`status`);