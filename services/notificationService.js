const fallbackData = require('./fallbackData');

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
     * Crée une nouvelle notification interne en base de données (avec secours en mémoire)
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
        if (!client_email) {
            console.warn('[NotificationService] client_email manquant');
            return null;
        }

        try {
            if (this.pool) {
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
        } catch (dbErr) {
            console.warn('[NotificationService] Base inaccessible, enregistrement en mémoire de secours :', dbErr.message);
        }

        // Sauvegarde dans le module de secours
        const fallbackNotif = {
            id: Date.now(),
            reservation_id,
            user_id,
            client_email: client_email.trim().toLowerCase(),
            client_nom: client_nom ? client_nom.trim() : '',
            titre,
            message,
            coach_nom,
            date_seance,
            heure_seance,
            service_nom,
            type,
            lu: 0,
            created_at: new Date()
        };
        fallbackData.notifications.unshift(fallbackNotif);
        return fallbackNotif.id;
    }

    /**
     * Notifie tous les administrateurs lors d'un nouvel abonnement de coach
     */
    async notifyAdminsNewSubscription({ coach, amount = 5000, formule = 'Formule Mensuelle Coach', transactionRef = '' }) {
        if (!coach) return [];

        let admins = [{ id: 1, email: 'papeibrahimasane221@gmail.com', nom_complet: 'Pape Ibrahima Sane' }];
        if (this.pool) {
            try {
                const [rows] = await this.pool.query("SELECT id, email, nom_complet FROM users WHERE role = 'admin'");
                if (rows.length > 0) admins = rows;
            } catch (err) {
                console.warn('[NotificationService] Erreur lecture admins :', err.message);
            }
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const coachName = coach.nom_complet || coach.email;
        const coachEmail = coach.email;
        const montantFormate = `${Number(amount).toLocaleString('fr-FR')} FCFA`;

        const titre = `🔔 Nouvel abonnement coach : ${coachName}`;
        const message = `Le coach ${coachName} (${coachEmail}) a activé son abonnement "${formule}" pour un montant de ${montantFormate} le ${dateStr} à ${heureStr}.${transactionRef ? ' (Réf: ' + transactionRef + ')' : ''}`;

        const notifIds = [];
        for (const admin of admins) {
            try {
                const notifId = await this.createNotification({
                    user_id: admin.id,
                    client_email: admin.email,
                    client_nom: admin.nom_complet || 'Administrateur',
                    titre,
                    message,
                    coach_nom: coachName,
                    service_nom: `${formule} • ${montantFormate}`,
                    date_seance: dateStr,
                    heure_seance: heureStr,
                    type: 'nouvel_abonnement'
                });
                notifIds.push(notifId);
            } catch (err) {
                console.error(`Erreur notification admin #${admin.id} :`, err.message);
            }
        }

        return notifIds;
    }

    /**
     * Récupère les notifications d'un client ou utilisateur
     */
    async getNotifications({ email, userId, limit = 20 }) {
        if (this.pool) {
            try {
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

                if (conditions.length > 0) {
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
            } catch (err) {
                console.warn('[NotificationService] Échec lecture notifications MySQL, utilisation secours :', err.message);
            }
        }

        return fallbackData.getNotifications({ email, userId });
    }

    /**
     * Calcule le nombre de notifications non lues
     */
    async getUnreadCount({ email, userId }) {
        if (this.pool) {
            try {
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

                if (conditions.length > 0) {
                    const query = `
                        SELECT COUNT(*) AS total FROM notifications 
                        WHERE (${conditions.join(' OR ')}) AND lu = 0
                    `;
                    const [rows] = await this.pool.query(query, params);
                    return rows[0]?.total || 0;
                }
            } catch (err) {
                console.warn('[NotificationService] Échec compte non lus MySQL, utilisation secours :', err.message);
            }
        }

        return fallbackData.getUnreadCount({ email, userId });
    }

    /**
     * Marque une notification spécifique comme lue
     */
    async markAsRead(id, { email, userId } = {}) {
        if (this.pool) {
            try {
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
            } catch (err) {
                console.warn('[NotificationService] Échec markAsRead MySQL, utilisation secours :', err.message);
            }
        }

        return fallbackData.markAsRead(id, { email });
    }

    /**
     * Marque toutes les notifications comme lues pour un email / utilisateur
     */
    async markAllAsRead({ email, userId }) {
        if (this.pool) {
            try {
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

                if (conditions.length > 0) {
                    await this.pool.query(
                        `UPDATE notifications SET lu = 1 WHERE (${conditions.join(' OR ')}) AND lu = 0`,
                        params
                    );
                    return true;
                }
            } catch (err) {
                console.warn('[NotificationService] Échec markAllAsRead MySQL, utilisation secours :', err.message);
            }
        }

        return fallbackData.markAllAsRead({ email });
    }
}

module.exports = new NotificationService();

