/**
 * Service de gestion des notifications internes du SaaS CoachFlow
 */
class NotificationService {
    constructor(pool = null) {
        this.pool = pool;
    }

    setPool(pool) {
        this.pool = pool;
    }

    /**
     * Crée une nouvelle notification interne en base de données
     */
    async createNotification({
        reservation_id = null,
        user_id = null,
        client_email,
        client_nom = '',
        titre,
        message,
        coach_nom = '',
        date_seance = '',
        heure_seance = '',
        service_nom = '',
        type = 'reservation_confirmee'
    }) {
        if (!this.pool) {
            throw new Error("Pool de base de données non configuré sur NotificationService");
        }
        if (!client_email) {
            console.warn('[NotificationService] client_email manquant');
            return null;
        }

        const [result] = await this.pool.query(
            `INSERT INTO notifications (reservation_id, user_id, client_email, client_nom, titre, message, coach_nom, date_seance, heure_seance, service_nom, type, lu)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                reservation_id,
                user_id,
                client_email.trim().toLowerCase(),
                client_nom ? client_nom.trim() : '',
                titre,
                message,
                coach_nom,
                date_seance,
                heure_seance,
                service_nom,
                type
            ]
        );

        console.log(`🔔 Notification #${result.insertId} créée pour ${client_email} (Type: ${type})`);
        return result.insertId;
    }

    /**
     * Récupère les notifications d'un client ou utilisateur
     */
    async getNotifications({ email, userId, limit = 20 }) {
        if (!this.pool) return [];

        const conditions = [];
        const params = [];

        if (email && email.trim() !== '') {
            conditions.push('client_email = ?');
            params.push(email.trim().toLowerCase());
        }
        if (userId) {
            conditions.push('user_id = ?');
            params.push(userId);
        }

        if (conditions.length === 0) {
            return [];
        }

        const query = `
            SELECT * FROM notifications 
            WHERE (${conditions.join(' OR ')})
            ORDER BY created_at DESC 
            LIMIT ?
        `;
        params.push(Number(limit) || 20);

        const [rows] = await this.pool.query(query, params);
        return rows;
    }

    /**
     * Calcule le nombre de notifications non lues
     */
    async getUnreadCount({ email, userId }) {
        if (!this.pool) return 0;

        const conditions = [];
        const params = [];

        if (email && email.trim() !== '') {
            conditions.push('client_email = ?');
            params.push(email.trim().toLowerCase());
        }
        if (userId) {
            conditions.push('user_id = ?');
            params.push(userId);
        }

        if (conditions.length === 0) {
            return 0;
        }

        const query = `
            SELECT COUNT(*) AS total FROM notifications 
            WHERE (${conditions.join(' OR ')}) AND lu = 0
        `;

        const [rows] = await this.pool.query(query, params);
        return rows[0]?.total || 0;
    }

    /**
     * Marque une notification spécifique comme lue
     */
    async markAsRead(id, { email, userId } = {}) {
        if (!this.pool || !id) return false;

        const conditions = ['id = ?'];
        const params = [id];

        if (email || userId) {
            const authConds = [];
            if (email && email.trim() !== '') {
                authConds.push('client_email = ?');
                params.push(email.trim().toLowerCase());
            }
            if (userId) {
                authConds.push('user_id = ?');
                params.push(userId);
            }
            if (authConds.length > 0) {
                conditions.push(`(${authConds.join(' OR ')})`);
            }
        }

        await this.pool.query(
            `UPDATE notifications SET lu = 1 WHERE ${conditions.join(' AND ')}`,
            params
        );
        return true;
    }

    /**
     * Marque toutes les notifications comme lues pour un email / utilisateur
     */
    async markAllAsRead({ email, userId }) {
        if (!this.pool) return false;

        const conditions = [];
        const params = [];

        if (email && email.trim() !== '') {
            conditions.push('client_email = ?');
            params.push(email.trim().toLowerCase());
        }
        if (userId) {
            conditions.push('user_id = ?');
            params.push(userId);
        }

        if (conditions.length === 0) {
            return false;
        }

        await this.pool.query(
            `UPDATE notifications SET lu = 1 WHERE (${conditions.join(' OR ')}) AND lu = 0`,
            params
        );
        return true;
    }
}

module.exports = new NotificationService();

