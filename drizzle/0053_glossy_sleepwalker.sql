ALTER TABLE `service_providers` ADD `emergencyHoursType` enum('24_7','after_hours','custom') DEFAULT '24_7';--> statement-breakpoint
ALTER TABLE `service_providers` ADD `emergencyHoursNote` text;