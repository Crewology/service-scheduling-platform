ALTER TABLE `referral_credits` ADD `expiresAt` timestamp;--> statement-breakpoint
CREATE INDEX `referral_credit_expires_idx` ON `referral_credits` (`expiresAt`);