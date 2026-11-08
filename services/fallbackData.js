/**
 * Module de secours (Fallback & Données de démonstration) pour CoachFlow
 * Utilisé automatiquement lorsque la base de données MySQL distante n'est pas configurée
 * ou temporairement inaccessible, garantissant 0 erreur 500 sur le site public en ligne.
 */

const fallbackServices = [
    {
        id: 1,
        nom: 'Consultation juridique',
        prix: 15000,
        domaine: 'Droit & Conseil',
        coach_id: 1,
        duree_minutes: 60,
        description: 'Rendez-vous avec un conseiller juridique pour auditer vos statuts, contrats et conformité.',
        coach_nom: 'Pape Ibrahima Sane',
        coach_expertise: 'Business & Entrepreneuriat',
        coach_email: 'papeibrahimasane221@gmail.com',
        coach_role: 'admin',
        coach_sub_status: 'active'
    },
    {
        id: 2,
        nom: 'Coaching entrepreneurial',
        prix: 20000,
        domaine: 'Business',
        coach_id: 1,
        duree_minutes: 60,
        description: "Session d'une heure d'accompagnement individuel pour lancer ou développer votre projet.",
        coach_nom: 'Pape Ibrahima Sane',
        coach_expertise: 'Business & Entrepreneuriat',
        coach_email: 'papeibrahimasane221@gmail.com',
        coach_role: 'admin',
        coach_sub_status: 'active'
    },
    {
        id: 3,
        nom: 'Formation Business Plan',
        prix: 10000,
        domaine: 'Business',
        coach_id: 1,
        duree_minutes: 60,
        description: 'Accès et accompagnement complet sur la conception d’un business plan bancable.',
        coach_nom: 'Pape Ibrahima Sane',
        coach_expertise: 'Business & Entrepreneuriat',
        coach_email: 'papeibrahimasane221@gmail.com',
        coach_role: 'admin',
        coach_sub_status: 'active'
    },
    {
        id: 4,
        nom: 'Apprendre le Coran à domicile',
        prix: 10000,
        domaine: 'Langues & Spiritualité',
        coach_id: 1,
        duree_minutes: 60,
        description: 'Mémorisation et apprentissage du Coran avec tajweed depuis chez vous.',
        coach_nom: 'Pape Ibrahima Sane',
        coach_expertise: 'Business & Entrepreneuriat',
        coach_email: 'papeibrahimasane221@gmail.com',
        coach_role: 'admin',
        coach_sub_status: 'active'
    },
    {
        id: 5,
        nom: 'Consultation stratégie business',
        prix: 25000,
        domaine: 'Business',
        coach_id: 1,
        duree_minutes: 60,
        description: "Diagnostic complet de votre activité commerciale et plan d'action opérationnel.",
        coach_nom: 'Pape Ibrahima Sane',
        coach_expertise: 'Business & Entrepreneuriat',
        coach_email: 'papeibrahimasane221@gmail.com',
        coach_role: 'admin',
        coach_sub_status: 'active'
    },
    {
        id: 6,
        nom: 'Programme Remise en Forme 1-on-1',
        prix: 15000,
        domaine: 'Fitness',
        coach_id: 2,
        duree_minutes: 60,
        description: 'Séance intensive personnalisée de cardio et renforcement avec suivi alimentaire.',
        coach_nom: 'Amina Diop',
        coach_expertise: 'Fitness & Nutrition',
        coach_email: 'coach.fitness@example.com',
        coach_role: 'coach',
        coach_sub_status: 'active'
    },
    {
        id: 7,
        nom: 'Coaching HIIT & Perte de Poids',
        prix: 12000,
        domaine: 'Fitness',
        coach_id: 2,
        duree_minutes: 45,
        description: 'Entraînement par intervalles à haute intensité pour brûler les graisses et booster le cardio.',
        coach_nom: 'Amina Diop',
        coach_expertise: 'Fitness & Nutrition',
        coach_email: 'coach.fitness@example.com',
        coach_role: 'coach',
        coach_sub_status: 'active'
    },
    {
        id: 8,
        nom: 'Anglais des Affaires & Entretiens',
        prix: 18000,
        domaine: 'Langues',
        coach_id: 3,
        duree_minutes: 60,
        description: 'Perfectionnement oral intensif pour réunions, pitchs et entretiens internationaux.',
        coach_nom: 'Marc Ndione',
        coach_expertise: 'Langues & Communication',
        coach_email: 'coach.langues@example.com',
        coach_role: 'coach',
        coach_sub_status: 'active'
    },
    {
        id: 9,
        nom: 'Conversation Anglaise Débutant / Intermédiaire',
        prix: 10000,
        domaine: 'Langues',
        coach_id: 3,
        duree_minutes: 45,
        description: 'Débloquez votre expression orale et prenez confiance rapidement.',
        coach_nom: 'Marc Ndione',
        coach_expertise: 'Langues & Communication',
        coach_email: 'coach.langues@example.com',
        coach_role: 'coach',
        coach_sub_status: 'active'
    },
    {
        id: 10,
        nom: 'Masterclass Croissance & Investisseurs',
        prix: 25000,
        domaine: 'Business',
        coach_id: 4,
        duree_minutes: 60,
        description: 'Structurer sa levée de fonds et préparer ses négociations avec les investisseurs.',
        coach_nom: 'Fana',
        coach_expertise: 'Business & Entrepreneuriat',
        coach_email: 'fn@gmail.com',
        coach_role: 'coach',
        coach_sub_status: 'active'
    },
    {
        id: 11,
        nom: 'Stratégie Marketing & Acquisition Vente',
        prix: 10000,
        domaine: 'Marketing & Vente',
        coach_id: 5,
        duree_minutes: 60,
        description: 'Mise en place de votre tunnel de conversion et acquisition de clients qualifiés.',
        coach_nom: 'Omar Cisse',
        coach_expertise: 'Marketing & Vente',
        coach_email: 'oc@gmail.com',
        coach_role: 'coach',
        coach_sub_status: 'active'
    },
    {
        id: 12,
        nom: 'Développement Personnel & Leadership',
        prix: 5000,
        domaine: 'Développement Personnel',
        coach_id: 6,
        duree_minutes: 60,
        description: 'Gestion du stress, leadership bienveillant et confiance en soi pour dirigeants.',
        coach_nom: 'Ndeye Tall',
        coach_expertise: 'Développement Personnel',
        coach_email: 'nt@gmail.com',
        coach_role: 'coach',
        coach_sub_status: 'active'
    }
];

const fallbackUsers = [
    {
        id: 1,
        nom_complet: 'Pape Ibrahima Sane',
        email: 'papeibrahimasane221@gmail.com',
        role: 'admin',
        expertise: 'Business & Entrepreneuriat',
        subscription_status: 'active',
        subscription_expires_at: '2027-12-31'
    },
    {
        id: 2,
        nom_complet: 'Amina Diop',
        email: 'coach.fitness@example.com',
        role: 'coach',
        expertise: 'Fitness & Nutrition',
        subscription_status: 'active',
        subscription_expires_at: '2027-12-31'
    },
    {
        id: 3,
        nom_complet: 'Marc Ndione',
        email: 'coach.langues@example.com',
        role: 'coach',
        expertise: 'Langues & Communication',
        subscription_status: 'active',
        subscription_expires_at: '2027-12-31'
    },
    {
        id: 4,
        nom_complet: 'Fana',
        email: 'fn@gmail.com',
        role: 'coach',
        expertise: 'Business & Entrepreneuriat',
        subscription_status: 'active',
        subscription_expires_at: '2027-12-31'
    },
    {
        id: 5,
        nom_complet: 'Omar Cisse',
        email: 'oc@gmail.com',
        role: 'coach',
        expertise: 'Marketing & Vente',
        subscription_status: 'active',
        subscription_expires_at: '2027-12-31'
    },
    {
        id: 6,
        nom_complet: 'Ndeye Tall',
        email: 'nt@gmail.com',
        role: 'coach',
        expertise: 'Développement Personnel',
        subscription_status: 'active',
        subscription_expires_at: '2027-12-31'
    }
];

// Réservations en mémoire pour la session de démo
const inMemoryReservations = [
    {
        id: 101,
        service_id: 2,
        service_nom: 'Coaching entrepreneurial',
        prenom: 'Fatou',
        nom: 'Ndiaye',
        email: 'fatou.ndiaye@example.com',
        telephone: '+221 77 123 45 67',
        date_reservation: '2026-11-12',
        heure_reservation: '10:00',
        statut: 'confirme',
        prix: 20000,
        coach_nom: 'Pape Ibrahima Sane',
        created_at: new Date('2026-11-05T14:30:00Z')
    },
    {
        id: 102,
        service_id: 6,
        service_nom: 'Programme Remise en Forme 1-on-1',
        prenom: 'Moussa',
        nom: 'Diallo',
        email: 'moussa.diallo@example.com',
        telephone: '+221 78 987 65 43',
        date_reservation: '2026-11-14',
        heure_reservation: '15:30',
        statut: 'en_attente',
        prix: 15000,
        coach_nom: 'Amina Diop',
        created_at: new Date('2026-11-06T10:15:00Z')
    }
];

// Notifications en mémoire
const inMemoryNotifications = [
    {
        id: 201,
        client_email: 'fatou.ndiaye@example.com',
        titre: 'Votre réservation est confirmée ✅',
        message: 'Votre coach Pape Ibrahima Sane a confirmé votre séance pour le 12/11/2026 à 10:00.',
        coach_nom: 'Pape Ibrahima Sane',
        date_seance: '12/11/2026',
        heure_seance: '10:00',
        service_nom: 'Coaching entrepreneurial',
        type: 'reservation_confirmee',
        lu: 0,
        created_at: new Date('2026-11-05T15:00:00Z')
    },
    {
        id: 202,
        client_email: 'papeibrahimasane221@gmail.com',
        titre: '🔔 Nouvel abonnement coach activé',
        message: 'Bienvenue sur CoachFlow SaaS ! Votre compte est opérationnel.',
        coach_nom: 'CoachFlow',
        date_seance: '06/11/2026',
        heure_seance: '20:00',
        service_nom: 'Formule Mensuelle Coach • 5 000 FCFA',
        type: 'nouvel_abonnement',
        lu: 0,
        created_at: new Date()
    }
];

module.exports = {
    services: fallbackServices,
    users: fallbackUsers,
    reservations: inMemoryReservations,
    notifications: inMemoryNotifications,

    getServices({ search, domaine } = {}) {
        let results = [...fallbackServices];

        if (search && search.trim() !== '') {
            const s = search.trim().toLowerCase();
            results = results.filter(srv => 
                (srv.nom && srv.nom.toLowerCase().includes(s)) ||
                (srv.description && srv.description.toLowerCase().includes(s)) ||
                (srv.coach_nom && srv.coach_nom.toLowerCase().includes(s)) ||
                (srv.domaine && srv.domaine.toLowerCase().includes(s))
            );
        }

        if (domaine && domaine !== 'Tous') {
            results = results.filter(srv => srv.domaine && srv.domaine.toLowerCase() === domaine.toLowerCase());
        }

        const domaines = [...new Set(fallbackServices.map(s => s.domaine).filter(Boolean))].sort();

        return { services: results, domaines };
    },

    getServiceById(id) {
        const numId = Number(id);
        return fallbackServices.find(s => s.id === numId) || null;
    },

    getDomaines() {
        return [...new Set(fallbackServices.map(s => s.domaine).filter(Boolean))].sort();
    },

    addReservation(data) {
        const newBooking = {
            id: inMemoryReservations.length + 101,
            created_at: new Date(),
            statut: 'en_attente',
            ...data
        };
        inMemoryReservations.unshift(newBooking);

        // Ajouter une notification pour le client
        if (data.email) {
            inMemoryNotifications.unshift({
                id: inMemoryNotifications.length + 201,
                client_email: data.email.toLowerCase().trim(),
                titre: 'Demande de réservation enregistrée ⏳',
                message: `Votre séance "${data.service_nom || 'Coaching'}" avec le coach ${data.coach_nom || 'votre coach'} pour le ${data.date_reservation} à ${data.heure_reservation || '10:00'} a été reçue avec succès.`,
                coach_nom: data.coach_nom || 'Coach',
                date_seance: data.date_reservation,
                heure_seance: data.heure_reservation || '10:00',
                service_nom: data.service_nom || 'Prestation',
                type: 'demande_enregistree',
                lu: 0,
                created_at: new Date()
            });
        }

        return newBooking;
    },

    getReservationsForEmail(email) {
        if (!email) return [];
        const clean = email.toLowerCase().trim();
        return inMemoryReservations.filter(r => r.email && r.email.toLowerCase().trim() === clean);
    },

    getNotifications({ email, userId } = {}) {
        let results = [...inMemoryNotifications];
        if (email) {
            const clean = email.toLowerCase().trim();
            results = results.filter(n => n.client_email && n.client_email.toLowerCase().trim() === clean);
        }
        return results;
    },

    getUnreadCount({ email, userId } = {}) {
        const notifs = this.getNotifications({ email, userId });
        return notifs.filter(n => !n.lu).length;
    },

    markAsRead(id, { email } = {}) {
        const notif = inMemoryNotifications.find(n => n.id == id);
        if (notif) notif.lu = 1;
        return true;
    },

    markAllAsRead({ email } = {}) {
        inMemoryNotifications.forEach(n => {
            if (!email || (n.client_email && n.client_email.toLowerCase().trim() === email.toLowerCase().trim())) {
                n.lu = 1;
            }
        });
        return true;
    }
};

