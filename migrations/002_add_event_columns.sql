-- Migration: 002_add_event_columns
-- Add missing columns to events table for Flutter EventModel compatibility

ALTER TABLE `events`
  ADD COLUMN `description` TEXT DEFAULT NULL AFTER `title`,
  ADD COLUMN `start_time` TIME DEFAULT NULL AFTER `end_date`,
  ADD COLUMN `end_time` TIME DEFAULT NULL AFTER `start_time`,
  ADD COLUMN `color_hex` VARCHAR(7) NOT NULL DEFAULT '#BDB9FF' AFTER `end_time`,
  ADD COLUMN `is_all_day` TINYINT(1) NOT NULL DEFAULT 0 AFTER `color_hex`;
