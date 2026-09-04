CREATE TABLE `terms_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`status` enum('draft','published','superseded','archived') NOT NULL DEFAULT 'draft',
	`audience` enum('all','customers','providers') NOT NULL DEFAULT 'all',
	`acceptanceMode` enum('notice','explicit') NOT NULL DEFAULT 'notice',
	`effectiveAt` timestamp NOT NULL,
	`materialArbitrationChanges` boolean NOT NULL DEFAULT false,
	`arbitrationSection` varchar(50),
	`optOutDeadline` timestamp,
	`contactEmail` varchar(320) NOT NULL,
	`companyAddress` varchar(500) NOT NULL,
	`createdBy` int NOT NULL,
	`publishedBy` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `terms_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `terms_version_unique` UNIQUE(`version`)
);
--> statement-breakpoint
CREATE TABLE `user_terms_notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`termsVersionId` int NOT NULL,
	`userId` int NOT NULL,
	`inAppNotifiedAt` timestamp,
	`emailStatus` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`emailSentAt` timestamp,
	`emailLastAttemptAt` timestamp,
	`emailFailureReason` varchar(500),
	`shownAt` timestamp,
	`acknowledgedAt` timestamp,
	`acceptedAt` timestamp,
	`acceptanceMethod` enum('acknowledged','explicit'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_terms_notices_id` PRIMARY KEY(`id`),
	CONSTRAINT `terms_notice_version_user_unique` UNIQUE(`termsVersionId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `terms_versions` ADD CONSTRAINT `terms_versions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terms_versions` ADD CONSTRAINT `terms_versions_publishedBy_users_id_fk` FOREIGN KEY (`publishedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_terms_notices` ADD CONSTRAINT `user_terms_notices_termsVersionId_terms_versions_id_fk` FOREIGN KEY (`termsVersionId`) REFERENCES `terms_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_terms_notices` ADD CONSTRAINT `user_terms_notices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `terms_status_effective_idx` ON `terms_versions` (`status`,`effectiveAt`);--> statement-breakpoint
CREATE INDEX `terms_notice_user_pending_idx` ON `user_terms_notices` (`userId`,`acknowledgedAt`);--> statement-breakpoint
CREATE INDEX `terms_notice_delivery_status_idx` ON `user_terms_notices` (`termsVersionId`,`emailStatus`);