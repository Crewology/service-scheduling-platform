ALTER TABLE `referral_credits` ADD `earnedReferralId` int;--> statement-breakpoint
ALTER TABLE `referral_credits` ADD `expiredSourceCreditId` int;--> statement-breakpoint
ALTER TABLE `referral_credits` ADD `warningNotifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `referral_credits` ADD CONSTRAINT `referral_credit_earned_referral_unique` UNIQUE(`earnedReferralId`);--> statement-breakpoint
ALTER TABLE `referral_credits` ADD CONSTRAINT `referral_credit_expired_source_unique` UNIQUE(`expiredSourceCreditId`);--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referral_referee_unique` UNIQUE(`refereeId`);