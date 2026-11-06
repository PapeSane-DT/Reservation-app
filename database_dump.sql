-- CoachFlow Database Dump
-- Generated on 2026-11-06T19:28:18.021Z

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `email_logs`;
CREATE TABLE `email_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recipient` varchar(150) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `status` varchar(20) NOT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `email_logs` (`id`, `recipient`, `subject`, `content`, `status`, `error_message`, `created_at`) VALUES (1, 'papeibrahimasane221@gmail.com', 'Votre réservation est confirmée ✅', '<p>Test confirmation</p>', 'failed', 'Aucune clé d\'email valide configurée dans le fichier .env (RESEND_API_KEY ou EMAIL_PASSWORD).', '2026-10-29 11:32:30');
INSERT INTO `email_logs` (`id`, `recipient`, `subject`, `content`, `status`, `error_message`, `created_at`) VALUES (2, 'papeibrahimasane221@gmail.com', 'Demande de réservation reçue — Business plan', '
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4361ee;">Bonjour Pape Sané,</h2>
                <p>Votre demande de réservation pour la formation/coaching <strong>Business plan</strong> a bien été enregistrée avec succès.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date souhaitée :</strong> 2026-11-08</p>
                    <p style="margin: 5px 0;"><strong>Coach :</strong> Omar Cisse</p>
                    <p style="margin: 5px 0;"><strong>Montant :</strong> 10 000 FCFA</p>
                    <p style="margin: 5px 0;"><strong>Téléphone de contact :</strong> 709899794</p>
                </div>
                <p>Votre coach va examiner votre créneau et vous recevrez une confirmation très prochainement.</p>
                <p style="color: #64748b; font-size: 13px;">Merci pour votre confiance sur CoachFlow.</p>
            </div>
        ', 'failed', 'Gmail SMTP: Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
535 5.7.8  https://support.google.com/mail/?p=BadCredentials 5b1f17b1804b1-4aa7f41895fsm55420315e9.5 - gsmtp', '2026-10-29 11:35:06');
INSERT INTO `email_logs` (`id`, `recipient`, `subject`, `content`, `status`, `error_message`, `created_at`) VALUES (3, 'papeibrahimasane221@gmail.com', 'Votre réservation pour Business plan est confirmée ✅', '<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #10b981;">Réservation Confirmée !</h2>
                            <p>Bonjour Pape Sané,</p>
                            <p>Excellente nouvelle ! Votre coach a <strong>confirmé</strong> votre séance pour <strong>Business plan</strong> le <strong>2026-11-07</strong>.</p>
                            <p>Préparez vos questions et vos objectifs avant la séance.</p>
                            <p style="color: #64748b; font-size: 13px;">L\'équipe CoachFlow</p>
                           </div>', 'failed', 'Gmail SMTP: Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
535 5.7.8  https://support.google.com/mail/?p=BadCredentials 5b1f17b1804b1-4aa80285b88sm62870715e9.14 - gsmtp', '2026-10-29 11:35:39');
INSERT INTO `email_logs` (`id`, `recipient`, `subject`, `content`, `status`, `error_message`, `created_at`) VALUES (4, 'papeibrahimasane221@gmail.com', 'Demande de réservation reçue — Business plan', '
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4361ee;">Bonjour Pape Sané,</h2>
                <p>Votre demande de réservation pour la formation/coaching <strong>Business plan</strong> a bien été enregistrée avec succès.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date souhaitée :</strong> 2026-11-05</p>
                    <p style="margin: 5px 0;"><strong>Coach :</strong> Omar Cisse</p>
                    <p style="margin: 5px 0;"><strong>Montant :</strong> 10 000 FCFA</p>
                    <p style="margin: 5px 0;"><strong>Téléphone de contact :</strong> 709899794</p>
                </div>
                <p>Votre coach va examiner votre créneau et vous recevrez une confirmation très prochainement.</p>
                <p style="color: #64748b; font-size: 13px;">Merci pour votre confiance sur CoachFlow.</p>
            </div>
        ', 'failed', 'Gmail SMTP: Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
535 5.7.8  https://support.google.com/mail/?p=BadCredentials ffacd0b85a97d-48e3eb8f25fsm33290228f8f.2 - gsmtp', '2026-10-29 11:39:15');
INSERT INTO `email_logs` (`id`, `recipient`, `subject`, `content`, `status`, `error_message`, `created_at`) VALUES (5, 'papeibrahimasane221@gmail.com', 'Votre réservation pour Business plan est confirmée ✅', '<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #10b981;">Réservation Confirmée !</h2>
                            <p>Bonjour Pape Sané,</p>
                            <p>Excellente nouvelle ! Votre coach a <strong>confirmé</strong> votre séance pour <strong>Business plan</strong> le <strong>2026-11-04</strong>.</p>
                            <p>Préparez vos questions et vos objectifs avant la séance.</p>
                            <p style="color: #64748b; font-size: 13px;">L\'équipe CoachFlow</p>
                           </div>', 'failed', 'Gmail SMTP: Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
535 5.7.8  https://support.google.com/mail/?p=BadCredentials ffacd0b85a97d-48e3ebcb851sm29555207f8f.26 - gsmtp', '2026-10-29 11:39:29');
INSERT INTO `email_logs` (`id`, `recipient`, `subject`, `content`, `status`, `error_message`, `created_at`) VALUES (6, 'ss@gmail.com', 'Demande de réservation reçue — Business plan', '
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4361ee;">Bonjour Saly Sane,</h2>
                <p>Votre demande de réservation pour la formation/coaching <strong>Business plan</strong> a bien été enregistrée avec succès.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date & Heure souhaitées :</strong> 2026-11-28 à 10:00</p>
                    <p style="margin: 5px 0;"><strong>Coach :</strong> Omar Cisse</p>
                    <p style="margin: 5px 0;"><strong>Montant :</strong> 10 000 FCFA</p>
                    <p style="margin: 5px 0;"><strong>Téléphone de contact :</strong> 771234567</p>
                </div>
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                    <div style="font-weight: 700; color: #1e40af; margin-bottom: 6px;">
                        Paiement sécurisé via Wave Sénégal
                    </div>
                    <p style="font-size: 13px; color: #1e3a8a; margin: 0 0 12px;">
                        Réglez directement votre séance en 1 clic (montant de <strong>10 000 FCFA</strong> pré-rempli) :
                    </p>
                    <a href="https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/?amount=10000" style="background-color: #1da1f2; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Payer 10 000 FCFA avec Wave
                    </a>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 8px;">
                        Compte Wave Business : <strong>+221 70 989 97 94</strong>
                    </div>
                </div>
                <p>Votre coach va examiner votre créneau et vous recevrez une confirmation très prochainement.</p>
                <p style="color: #64748b; font-size: 13px;">Merci pour votre confiance sur CoachFlow.</p>
            </div>
        ', 'failed', 'Gmail SMTP: Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
535 5.7.8  https://support.google.com/mail/?p=BadCredentials ffacd0b85a97d-48fc9c76102sm378915f8f.7 - gsmtp', '2026-11-03 19:09:21');
INSERT INTO `email_logs` (`id`, `recipient`, `subject`, `content`, `status`, `error_message`, `created_at`) VALUES (7, 'ss@gmail.com', 'Votre réservation pour Business plan est confirmée ✅', '<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #10b981;">Réservation Confirmée !</h2>
                            <p>Bonjour Saly Sane,</p>
                            <p>Excellente nouvelle ! Votre coach <strong>Omar Cisse</strong> a <strong>confirmé</strong> votre séance pour <strong>Business plan</strong> le <strong>28/11/2026 à 10:00</strong>.</p>
                            <p>Préparez vos questions et vos objectifs avant la séance.</p>
                            <p style="color: #64748b; font-size: 13px;">L\'équipe CoachFlow</p>
                           </div>', 'failed', 'Gmail SMTP: Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
535 5.7.8  https://support.google.com/mail/?p=BadCredentials 5b1f17b1804b1-4b2ab010a66sm116435595e9.13 - gsmtp', '2026-11-03 19:09:48');

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reservation_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `client_email` varchar(255) NOT NULL,
  `client_nom` varchar(255) DEFAULT NULL,
  `titre` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `coach_nom` varchar(255) DEFAULT NULL,
  `date_seance` varchar(50) DEFAULT NULL,
  `heure_seance` varchar(20) DEFAULT NULL,
  `service_nom` varchar(255) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'reservation_confirmee',
  `lu` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_client_email` (`client_email`),
  KEY `idx_lu` (`lu`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `notifications` (`id`, `reservation_id`, `user_id`, `client_email`, `client_nom`, `titre`, `message`, `coach_nom`, `date_seance`, `heure_seance`, `service_nom`, `type`, `lu`, `created_at`) VALUES (2, 9, 5, 'oc@gmail.com', 'Saly Sane', 'Nouvelle réservation reçue 📅', 'Saly Sane a réservé "Business plan" pour le 2026-11-28 à 10:00.', 'Omar Cisse', '2026-11-28', '10:00', 'Business plan', 'nouvelle_reservation', 0, '2026-11-03 19:09:20');
INSERT INTO `notifications` (`id`, `reservation_id`, `user_id`, `client_email`, `client_nom`, `titre`, `message`, `coach_nom`, `date_seance`, `heure_seance`, `service_nom`, `type`, `lu`, `created_at`) VALUES (3, 9, NULL, 'ss@gmail.com', 'Saly Sane', 'Réservation confirmée avec Omar Cisse ✅', 'Votre réservation pour "Business plan" avec le coach Omar Cisse a été confirmée pour le 28/11/2026 à 10:00.', 'Omar Cisse', '28/11/2026', '10:00', 'Business plan', 'reservation_confirmee', 1, '2026-11-03 19:09:47');
INSERT INTO `notifications` (`id`, `reservation_id`, `user_id`, `client_email`, `client_nom`, `titre`, `message`, `coach_nom`, `date_seance`, `heure_seance`, `service_nom`, `type`, `lu`, `created_at`) VALUES (4, NULL, 1, 'papeibrahimasane221@gmail.com', 'Pape Ibrahima Sane', '🔔 Nouvel abonnement coach : Amina Diop', 'Le coach Amina Diop (coach.fitness@example.com) a activé son abonnement "Formule Mensuelle Coach" pour un montant de 5 000 FCFA le 03/11/2026 à 22:03. (Réf: WAVE_TEST_VERIF_123)', 'Amina Diop', '03/11/2026', '22:03', 'Formule Mensuelle Coach • 5 000 FCFA', 'nouvel_abonnement', 0, '2026-11-03 21:03:18');

DROP TABLE IF EXISTS `platform_settings`;
CREATE TABLE `platform_settings` (
  `cle` varchar(100) NOT NULL,
  `valeur` text NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `platform_settings` (`cle`, `valeur`, `description`, `updated_at`) VALUES ('app_name', 'CoachFlow Sénégal', 'Nom public du SaaS', '2026-11-03 20:19:30');
INSERT INTO `platform_settings` (`cle`, `valeur`, `description`, `updated_at`) VALUES ('contact_email', 'papeibrahimasane221@gmail.com', 'Email de contact support', '2026-11-03 20:19:30');
INSERT INTO `platform_settings` (`cle`, `valeur`, `description`, `updated_at`) VALUES ('currency', 'FCFA', 'Devise utilisée sur la plateforme', '2026-11-03 20:19:30');
INSERT INTO `platform_settings` (`cle`, `valeur`, `description`, `updated_at`) VALUES ('subscription_price', '10', 'Tarif mensuel abonnement coach en FCFA', '2026-11-03 21:15:33');
INSERT INTO `platform_settings` (`cle`, `valeur`, `description`, `updated_at`) VALUES ('wave_business_phone', '+221 70 989 97 94', 'Numéro Wave Business officiel', '2026-11-03 20:19:30');
INSERT INTO `platform_settings` (`cle`, `valeur`, `description`, `updated_at`) VALUES ('wave_business_url', 'https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/', 'Lien marchand Wave Business', '2026-11-03 20:19:30');

DROP TABLE IF EXISTS `reclamations`;
CREATE TABLE `reclamations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `sujet` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `statut` varchar(30) DEFAULT 'ouvert',
  `reponse` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `reclamations` (`id`, `nom`, `email`, `sujet`, `message`, `statut`, `reponse`, `created_at`, `updated_at`) VALUES (1, 'Fatou Ndiaye', 'fatou.ndiaye@gmail.com', 'Question sur le paiement Wave', 'Bonjour, mon reçu Wave mentionne la transaction WB_102, je voulais savoir si ma séance est confirmée.', 'ouvert', NULL, '2026-11-03 20:19:30', '2026-11-03 20:19:30');
INSERT INTO `reclamations` (`id`, `nom`, `email`, `sujet`, `message`, `statut`, `reponse`, `created_at`, `updated_at`) VALUES (2, 'Ibrahima Ba', 'ibrahima.ba@yahoo.fr', 'Demande de report de séance', 'Bonjour cher coach, j ai un empêchement pour la date prévue, puis-je décaler au lendemain ?', 'en_cours', NULL, '2026-11-03 20:19:30', '2026-11-03 20:19:30');
INSERT INTO `reclamations` (`id`, `nom`, `email`, `sujet`, `message`, `statut`, `reponse`, `created_at`, `updated_at`) VALUES (3, 'Awa Diop', 'awa.diop@outlook.com', 'Remerciement pour la formation', 'La séance avec le coach s est très bien passée, merci pour la plateforme !', 'resolu', NULL, '2026-11-03 20:19:30', '2026-11-03 20:19:30');

DROP TABLE IF EXISTS `reservations`;
CREATE TABLE `reservations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utilisateur_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `date_reservation` date NOT NULL,
  `statut` varchar(20) DEFAULT 'en_attente',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `prenom` varchar(100) DEFAULT NULL,
  `nom` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `telephone` varchar(50) DEFAULT NULL,
  `heure_reservation` varchar(20) DEFAULT '10:00',
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (1, 1, 2, '2026-07-10 23:00:00', 'annule', '2026-07-11 22:02:23', NULL, NULL, NULL, NULL, '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (2, 2, 3, '2026-07-10 23:00:00', 'confirme', '2026-07-11 22:17:25', NULL, NULL, NULL, NULL, '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (3, 1, 1, '2026-07-09 23:00:00', 'en_attente', '2026-07-11 22:22:38', NULL, NULL, NULL, NULL, '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (4, -10, 7, '2026-07-10 23:00:00', 'en_attente', '2026-07-11 22:55:30', NULL, NULL, NULL, NULL, '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (5, 0, 8, '2026-11-14 23:00:00', 'en_attente', '2026-10-28 21:00:18', 'Amadou', 'Sow', 'amadou.sow.test@example.com', '+221 77 456 78 90', '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (6, 0, 13, '2026-10-30 23:00:00', 'confirme', '2026-10-29 10:53:07', 'Pape', 'Sané', 'papeibrahimasane221@gmail.com', '709899794', '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (7, 0, 13, '2026-11-07 23:00:00', 'confirme', '2026-10-29 11:35:05', 'Pape', 'Sané', 'papeibrahimasane221@gmail.com', '709899794', '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (8, 0, 13, '2026-11-04 23:00:00', 'confirme', '2026-10-29 11:39:14', 'Pape', 'Sané', 'papeibrahimasane221@gmail.com', '709899794', '10:00');
INSERT INTO `reservations` (`id`, `utilisateur_id`, `service_id`, `date_reservation`, `statut`, `created_at`, `prenom`, `nom`, `email`, `telephone`, `heure_reservation`) VALUES (9, 0, 13, '2026-11-27 23:00:00', 'confirme', '2026-11-03 19:09:20', 'Saly', 'Sane', 'ss@gmail.com', '771234567', '10:00');

DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `duree_minutes` int(11) DEFAULT 60,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `coach_id` int(11) DEFAULT NULL,
  `domaine` varchar(100) DEFAULT 'Business',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (1, 'Consultation juridique', 'Rendez-vous avec un avocat pour conseil', '15000.00', 60, '2026-07-11 21:58:01', 1, 'Droit & Conseil');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (2, 'Coaching entrepreneurial', 'Session d\'une heure avec un coach', '20000.00', 60, '2026-07-11 21:58:01', 1, 'Business');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (3, 'Formation en ligne', 'Accès à une formation sur le business plan', '10000.00', 60, '2026-07-11 21:58:01', 1, 'Business');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (4, 'Apprendre le coran à domicile ', 'Mémorisé le coran depuis chez vous', '10000.00', 60, '2026-07-11 22:20:04', 1, 'Langues');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (5, 'Consultation stratégie business', 'Diagnostic complet de votre activité et plan d\'action', '25000.00', 60, '2026-07-11 22:46:07', 1, 'Business');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (6, 'Coaching entrepreneurial', 'Accompagnement individuel pour lancer ou développer votre projet', '20000.00', 45, '2026-07-11 22:46:07', 1, 'Business');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (7, 'Session mentorat express', 'Réponses ciblées à vos questions urgentes', '12000.00', 30, '2026-07-11 22:46:07', 1, 'Business');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (8, 'Programme Remise en Forme 1-on-1', 'Séance intensive personnalisée de cardio et renforcement avec suivi alimentaire.', '15000.00', 60, '2026-10-28 20:54:07', 2, 'Fitness');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (9, 'Coaching HIIT & Perte de Poids', 'Entraînement par intervalles à haute intensité pour brûler les graisses.', '12000.00', 45, '2026-10-28 20:54:07', 2, 'Fitness');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (10, 'Anglais des Affaires & Entretiens', 'Perfectionnement oral intensif pour réunions, présentations et entretiens internationaux.', '18000.00', 60, '2026-10-28 20:54:07', 3, 'Langues');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (11, 'Conversation Anglaise Débutant / Intermédiaire', 'Débloquez votre expression orale et prenez confiance rapidement.', '10000.00', 45, '2026-10-28 20:54:07', 3, 'Langues');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (12, 'Masterclass', NULL, '25000.00', 60, '2026-10-28 21:03:25', 4, 'Business');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (13, 'Business plan', NULL, '10000.00', 60, '2026-10-29 10:52:15', 5, 'Autre');
INSERT INTO `services` (`id`, `nom`, `description`, `prix`, `duree_minutes`, `created_at`, `coach_id`, `domaine`) VALUES (14, 'Développement personnel', NULL, '5000.00', 60, '2026-11-03 20:45:32', 6, 'Développement Personnel');

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `nom_complet` varchar(150) DEFAULT NULL,
  `expertise` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `telephone` varchar(50) DEFAULT NULL,
  `subscription_status` varchar(20) DEFAULT 'inactive',
  `subscription_expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (1, 'papeibrahimasane221@gmail.com', '$2b$10$KJVufWPNHf6mzCYMy545VutcGb/bCkabkNP0jAYoFG7a9d4AZXvKa', 'admin', '2026-07-11 22:09:11', 'Pape Ibrahima Sane', 'Business & Entrepreneuriat', 'Coach certifié en création d\'entreprise, stratégie business et financement.', '+221 70 989 97 94', 'inactive', NULL);
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (2, 'coach.fitness@example.com', '$2b$10$76bTqyjjZwfSpF6xIzu.duEvZ/BVuMxKjflwg6usspyq4r3.KJZGi', 'coach', '2026-10-28 20:54:07', 'Amina Diop', 'Fitness', 'Coach sportive diplômée, spécialisée en remise en forme, renforcement musculaire et nutrition saine.', '+221 77 123 45 67', 'inactive', NULL);
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (3, 'coach.langues@example.com', '$2b$10$76bTqyjjZwfSpF6xIzu.duEvZ/BVuMxKjflwg6usspyq4r3.KJZGi', 'coach', '2026-10-28 20:54:07', 'Marc Ndione', 'Langues', 'Formateur bilingue Anglais et Espagnol professionnel avec plus de 8 ans d\'expérience.', '+221 78 987 65 43', 'inactive', NULL);
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (4, 'fn@gmail.com', '$2b$10$NctY0AghvHqT.0c32eCJ8emPo2nZfN/EXawM/ozCvloBoTcdKJvnG', 'coach', '2026-10-28 21:02:50', 'Fana', 'Business & Entrepreneuriat', 'qwert', '+221771234567', 'inactive', NULL);
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (5, 'oc@gmail.com', '$2b$10$u6ZuWqtVAkjFxLF38g.f4e3Or/MJtdD4Ar46xiFkTIrk1e1xWOMWu', 'coach', '2026-10-29 10:49:59', 'Omar Cisse', 'Marketing & Vente', NULL, '762306750', 'inactive', NULL);
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (6, 'nt@gmail.com', '$2b$10$7AsWbSZU1zN4D5hJ5YaWCO2ZTtvgD1.R/LUWhqymALEhv0rxGrVBy', 'coach', '2026-11-03 20:43:30', 'Ndeye Tall', 'Développement Personnel', 'Soyez courageux', '779890000', 'inactive', NULL);
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (7, 'ed@gmail.com', '$2b$10$uR9SXeVavWXEWJHFLL3w1.XCTfy9biGVtKI4s0Vi2F29RFqhh14m.', 'coach', '2026-11-03 21:05:39', 'Edu', 'Tech, Code & Data', NULL, '772223940', 'inactive', NULL);
INSERT INTO `users` (`id`, `email`, `password`, `role`, `created_at`, `nom_complet`, `expertise`, `bio`, `telephone`, `subscription_status`, `subscription_expires_at`) VALUES (8, 'ss221@gmail.com', '$2b$10$16MQ5eMa6rrRNciHinHbEOoWje.EeeMiB1sHLo8RClpeujrFxNLwi', 'coach', '2026-11-03 21:11:24', 'saly nioule', 'Langues & Communication', NULL, '766486114', 'inactive', NULL);

DROP TABLE IF EXISTS `wave_transactions`;
CREATE TABLE `wave_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `coach_id` int(11) NOT NULL,
  `client_reference` varchar(150) NOT NULL,
  `wave_session_id` varchar(150) DEFAULT NULL,
  `wave_transaction_id` varchar(150) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'XOF',
  `status` varchar(20) DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_reference` (`client_reference`),
  KEY `coach_id` (`coach_id`),
  CONSTRAINT `wave_transactions_ibfk_1` FOREIGN KEY (`coach_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `wave_transactions` (`id`, `coach_id`, `client_reference`, `wave_session_id`, `wave_transaction_id`, `amount`, `currency`, `status`, `created_at`, `completed_at`) VALUES (8, 1, 'SUB_COACH_1_1793273532826', NULL, NULL, '20000.00', 'XOF', 'failed', '2026-10-29 11:32:12', NULL);
INSERT INTO `wave_transactions` (`id`, `coach_id`, `client_reference`, `wave_session_id`, `wave_transaction_id`, `amount`, `currency`, `status`, `created_at`, `completed_at`) VALUES (9, 5, 'SUB_COACH_5_1793273652275', NULL, NULL, '20000.00', 'XOF', 'failed', '2026-10-29 11:34:12', NULL);
INSERT INTO `wave_transactions` (`id`, `coach_id`, `client_reference`, `wave_session_id`, `wave_transaction_id`, `amount`, `currency`, `status`, `created_at`, `completed_at`) VALUES (10, 5, 'SUB_COACH_5_1793274662866', NULL, NULL, '20000.00', 'XOF', 'failed', '2026-10-29 11:51:02', NULL);
INSERT INTO `wave_transactions` (`id`, `coach_id`, `client_reference`, `wave_session_id`, `wave_transaction_id`, `amount`, `currency`, `status`, `created_at`, `completed_at`) VALUES (11, 5, 'SUB_COACH_5_1793618292135', NULL, NULL, '20000.00', 'XOF', 'failed', '2026-11-02 11:18:12', NULL);

SET FOREIGN_KEY_CHECKS = 1;
