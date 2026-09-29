UPDATE `events` SET `status` = 'tentative' WHERE `status` IN ('contacted', 'ready_for_estimate', 'estimate_sent', 'estimate_confirmed', 'agreement_sent');--> statement-breakpoint
UPDATE `events` SET `status` = 'confirmed' WHERE `status` IN ('agreement_and_deposit_received', 'planning', 'details_locked');--> statement-breakpoint
UPDATE `events` SET `status` = 'closed' WHERE `status` IN ('event_complete', 'invoice_sent', 'paid_in_full');--> statement-breakpoint
UPDATE `events` SET `status` = 'new_lead' WHERE `status` NOT IN ('new_lead', 'tentative', 'confirmed', 'closed', 'lost');
