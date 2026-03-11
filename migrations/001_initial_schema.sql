-- DayFlow Database Schema
-- Migration: 001_initial_schema
-- Date: 2026-03-07

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ─── Users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `firebase_uid` VARCHAR(128) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `age` TINYINT UNSIGNED DEFAULT NULL,
  `gender` TINYINT UNSIGNED DEFAULT NULL COMMENT '0=Kadın, 1=Erkek, 2=Diğer',
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `language` VARCHAR(5) NOT NULL DEFAULT 'tr',
  `is_premium` TINYINT(1) NOT NULL DEFAULT 0,
  `premium_expires_at` DATETIME DEFAULT NULL,
  `trial_used` TINYINT(1) NOT NULL DEFAULT 0,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_firebase_uid` (`firebase_uid`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── User Questionnaire Answers ───────────────────────
CREATE TABLE IF NOT EXISTS `user_questionnaire` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `question_index` TINYINT UNSIGNED NOT NULL COMMENT '0-6 for Q1-Q7',
  `selected_option` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  UNIQUE KEY `uq_user_question` (`user_id`, `question_index`),
  CONSTRAINT `fk_questionnaire_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Tasks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `color_hex` VARCHAR(7) NOT NULL DEFAULT '#BDB9FF',
  `icon_name` VARCHAR(50) NOT NULL DEFAULT 'check_circle',
  `is_recurring` TINYINT(1) NOT NULL DEFAULT 0,
  `reminder_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `reminder_time` TIME DEFAULT NULL,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_user` (`user_id`),
  CONSTRAINT `fk_task_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Task Dates (many-to-many: task ↔ dates) ─────────
CREATE TABLE IF NOT EXISTS `task_dates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_task_date` (`task_id`, `date`),
  CONSTRAINT `fk_taskdate_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE DEFAULT NULL,
  `repeat_type` ENUM('none','daily','weekly','biweekly','monthly','yearly') NOT NULL DEFAULT 'none',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_user` (`user_id`),
  KEY `idx_event_dates` (`start_date`, `end_date`),
  CONSTRAINT `fk_event_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Moods ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `moods` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `mood_index` TINYINT UNSIGNED NOT NULL COMMENT '0=Üzgün,1=Kaygılı,2=Yorgun,3=Heyecanlı,4=Mutlu,5=Enerjik',
  `date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_mood_date` (`user_id`, `date`),
  CONSTRAINT `fk_mood_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Notes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `content` TEXT NOT NULL,
  `date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_note_user_date` (`user_id`, `date`),
  CONSTRAINT `fk_note_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Routines (master data — seeded) ──────────────────
CREATE TABLE IF NOT EXISTS `routines` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(50) NOT NULL COMMENT 'Sağlıklı Yaşam, Hareket & Egzersiz, etc.',
  `title` VARCHAR(100) NOT NULL,
  `icon_name` VARCHAR(100) NOT NULL,
  `color_hex` VARCHAR(7) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_premium` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_routine_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── User ↔ Routine relationship ─────────────────────
CREATE TABLE IF NOT EXISTS `user_routines` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `routine_id` INT UNSIGNED NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_routine` (`user_id`, `routine_id`),
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_routine` FOREIGN KEY (`routine_id`) REFERENCES `routines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Notifications ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `icon_name` VARCHAR(50) NOT NULL DEFAULT 'notifications',
  `icon_bg_hex` VARCHAR(7) NOT NULL DEFAULT '#6ACBFF',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`),
  KEY `idx_notif_created` (`created_at`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Subscriptions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `plan_type` ENUM('monthly','yearly') NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'TRY',
  `rc_subscription_id` VARCHAR(255) DEFAULT NULL COMMENT 'RevenueCat subscription identifier',
  `status` ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `starts_at` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sub_user` (`user_id`),
  KEY `idx_sub_status` (`status`),
  CONSTRAINT `fk_sub_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Day Trackers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `day_trackers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `color_hex` VARCHAR(7) NOT NULL,
  `icon_name` VARCHAR(50) NOT NULL,
  `tracker_type` ENUM('mood','counter') NOT NULL DEFAULT 'mood',
  `value` INT NOT NULL DEFAULT 0,
  `date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tracker_user_date` (`user_id`, `date`),
  CONSTRAINT `fk_tracker_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Seed: Routines master data ───────────────────────
INSERT INTO `routines` (`category`, `title`, `icon_name`, `color_hex`, `sort_order`) VALUES
-- 1. Sağlıklı Yaşam
('Sağlıklı Yaşam', 'Sağlıklı Beslenme', 'saglikli-beslenme', '#FFF7F7', 1),
('Sağlıklı Yaşam', 'Zihinsel Sağlık', 'zihinsel-saglik', '#FFF0F0', 2),
('Sağlıklı Yaşam', 'Fiziksel Sağlık', 'fiziksel-yasam', '#FFF5F5', 3),
('Sağlıklı Yaşam', 'Duygusal Sağlık', 'duygusal-saglik', '#FFF2F2', 4),
('Sağlıklı Yaşam', 'İş - Yaşam Dengesi', 'is-yasam-dengesi', '#FFF8F3', 5),
-- 2. Hareket & Egzersiz
('Hareket & Egzersiz', 'Sabah Egzersizi', 'sabah-egzersizi', '#F5FFF7', 1),
('Hareket & Egzersiz', 'Öğle Egzersizi', 'ogle-egzersizi', '#F0FFF4', 2),
('Hareket & Egzersiz', 'Akşam Egzersizi', 'aksam-egzersizi', '#FFF3DE', 3),
('Hareket & Egzersiz', 'Evde Egzersiz', 'evde-egzersiz', '#F5FFF7', 4),
('Hareket & Egzersiz', 'Spor Salonu Egzersizi', 'spor-salonu-egzersizi', '#EEFFE1', 5),
('Hareket & Egzersiz', 'Açık Hava Egzersizi', 'acik-hava-egzersizi', '#E8FFF0', 6),
-- 3. Odak & Üretkenlik
('Odak & Üretkenlik', 'Sabah Çalışması', 'sabah-calismasi', '#E8F9FF', 1),
('Odak & Üretkenlik', 'Öğleden Sonra Çalışması', 'ogleden-sonra-calismasi', '#E0F4FF', 2),
('Odak & Üretkenlik', 'Akşam Çalışması', 'aksam-calismasi', '#E5EFFF', 3),
('Odak & Üretkenlik', 'Sınav Hazırlığı', 'sinav-hazirligi', '#E8F9FF', 4),
('Odak & Üretkenlik', 'Çalışma Alanı', 'calisma-alani', '#EDF5FF', 5),
('Odak & Üretkenlik', 'Öğrenme Kaynakları', 'ogrenme-kaynaklari', '#F0F7FF', 6),
-- 4. Düzen & Ortam
('Düzen & Ortam', 'Günlük Temizlik', 'gunluk-temizlik', '#FDF9E2', 1),
('Düzen & Ortam', 'Haftalık Temizlik', 'haftalik-temizlik', '#FFF8DC', 2),
('Düzen & Ortam', 'Aylık Temizlik', 'aylik-temizlik', '#EBFFFE', 3),
('Düzen & Ortam', 'Mevsimsel Temizlik', 'mevsimlik-temizlik', '#FDF5E6', 4),
('Düzen & Ortam', 'Temizlik İpuçları', 'temizlik-ipuclari', '#FDF9E2', 5),
-- 5. Rahatla
('Rahatla', 'Akşam Rahatlaması', 'aksam-rahatlamasi', '#FFEDFF', 1),
('Rahatla', 'Hafta Sonu Rahatlaması', 'hafta-sonu-rahatlamasi', '#FFEDFF', 2),
('Rahatla', 'Stresten Kurtulma', 'stresten-kurtulma', '#FFF0FF', 3),
('Rahatla', 'Bakım Rutini', 'bakim-rutini', '#FFF5FF', 4),
-- 6. Harekete Geç
('Harekete Geç', 'Enerji Yönetim Planı', 'enerji-yonetim-plani', '#E0E7FD', 1),
('Harekete Geç', 'Gün Sonu Sakinleşme', 'gun-sonu-sakinlestirmesi', '#E0E7FD', 2),
('Harekete Geç', 'Sabah Motivasyonu', 'sabah-motivasyonu', '#E5ECFF', 3),
('Harekete Geç', 'Erteleme Karşıtı', 'erteleme-karsiti', '#EAEFFF', 4),
('Harekete Geç', 'Amaçlı Odaklanma', 'amacli-odaklanma', '#E8EDFF', 5),
-- 7. Uyku
('Uyku', 'Yatmadan Önce Rutini', 'yatmadan-once-rutini', '#E3EEFF', 1),
('Uyku', 'Uyku Ortamı', 'uyku-ortami', '#E8F3FF', 2),
('Uyku', 'Uyku Hijyeni', 'uyku-hijyeni', '#EBF5FF', 3),
('Uyku', 'Uykusuzluk İpuçları', 'uykusuzluk-ipuclari', '#E3EEFF', 4),
('Uyku', 'Gece Atıştırmaları', 'gece-atistirmalari', '#EEFFE1', 5);
