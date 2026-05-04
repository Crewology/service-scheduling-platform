ALTER TABLE `services` ADD `isGroupClass` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `maxCapacity` int DEFAULT 1 NOT NULL;