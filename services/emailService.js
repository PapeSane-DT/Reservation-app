const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

/**
 * Service centralisé pour l'envoi d'emails transactionnels (Resend & Gmail SMTP)
 * avec journalisation complète en base de données (table email_logs)
 */
class EmailService {
    constructor() {
        this.resendClient = null;
        this.nodemailerTransporter = null;
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'reservation_db'
        });
        this.init();
    }

    init() {
        // Initialisation de Resend si une clé valide est fournie
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey && resendKey !== 're_ta_cle_ici' && resendKey.startsWith('re_')) {
            this.resendClient = new Resend(resendKey);
        } else {
            this.resendClient = null;
        }

        // Initialisation de Nodemailer (Gmail) si configuré
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASSWORD;
        if (emailUser && emailPass && emailPass.length >= 8) {
            this.nodemailerTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPass
                }
            });
        } else {
            this.nodemailerTransporter = null;
        }
    }

    /**
     * Envoie un email transactionnel et enregistre le résultat dans email_logs
     * 
     * @param {Object} options
     * @param {string} options.to - Adresse du destinataire
     * @param {string} options.subject - Sujet du message
     * @param {string} options.html - Contenu HTML
     * @returns {Promise<{success: boolean, provider: string, error?: string}>}
     */
    async sendEmail({ to, subject, html }) {
        this.init(); // Recharger les clés au cas où le .env a été modifié
        let lastError = null;

        // 1. Tenter l'envoi via Resend si configuré
        if (this.resendClient) {
            try {
                const response = await this.resendClient.emails.send({
                    from: 'CoachFlow <onboarding@resend.dev>',
                    to: to,
                    subject: subject,
                    html: html
                });

                if (response.error) {
                    console.warn(`⚠️ Erreur API Resend (${response.error.name}): ${response.error.message}`);
                    lastError = `Resend: ${response.error.message}`;
                } else if (response.data && response.data.id) {
                    console.log(`✉️ [EMAIL RÉUSSI] Envoyé via Resend à ${to} (ID: ${response.data.id})`);
                    await this.logEmail(to, subject, html, 'sent', null);
                    return { success: true, provider: 'resend', id: response.data.id };
                }
            } catch (err) {
                console.warn(`⚠️ Exception Resend: ${err.message}`);
                lastError = `Resend: ${err.message}`;
            }
        }

        // 2. Tenter l'envoi via Nodemailer (Gmail) en secours
        if (this.nodemailerTransporter) {
            try {
                const info = await this.nodemailerTransporter.sendMail({
                    from: `"CoachFlow" <${process.env.EMAIL_USER}>`,
                    to: to,
                    subject: subject,
                    html: html
                });
                console.log(`✉️ [EMAIL RÉUSSI] Envoyé via Gmail SMTP à ${to} (MessageId: ${info.messageId})`);
                await this.logEmail(to, subject, html, 'sent', null);
                return { success: true, provider: 'gmail', id: info.messageId };
            } catch (err) {
                console.warn(`⚠️ Échec Gmail SMTP: ${err.message}`);
                lastError = `Gmail SMTP: ${err.message}`;
            }
        }

        // 3. Aucun service fonctionnel
        const finalError = lastError || "Aucune clé d'email valide configurée dans le fichier .env (RESEND_API_KEY ou EMAIL_PASSWORD).";
        console.error(`\n❌ [EMAIL NON ENVOYÉ] Destinataire: ${to} | Sujet: ${subject}`);
        console.error(`Détail: ${finalError}\n`);

        await this.logEmail(to, subject, html, 'failed', finalError);

        return {
            success: false,
            provider: 'none',
            error: finalError
        };
    }

    async logEmail(recipient, subject, content, status, errorMessage) {
        try {
            await this.pool.query(
                'INSERT INTO email_logs (recipient, subject, content, status, error_message) VALUES (?, ?, ?, ?, ?)',
                [recipient, subject, content, status, errorMessage]
            );
        } catch (e) {
            console.error('Erreur écriture email_logs:', e.message);
        }
    }

    async getRecentLogs(limit = 5) {
        try {
            const [rows] = await this.pool.query('SELECT * FROM email_logs ORDER BY id DESC LIMIT ?', [limit]);
            return rows;
        } catch (e) {
            return [];
        }
    }
}

module.exports = new EmailService();
