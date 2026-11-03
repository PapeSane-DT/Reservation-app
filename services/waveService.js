const crypto = require('crypto');

/**
 * Service d'intégration Wave pour le Sénégal (Wave Business & Wave Checkout)
 * Documentation Wave Checkout : https://api.wave.com/v1/checkout
 * Lien Marchand Wave Business : https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/
 */
class WaveService {
    constructor() {
        this.apiUrl = 'https://api.wave.com/v1/checkout/sessions';
        this.secretKey = process.env.WAVE_SECRET_KEY || '';
        this.webhookSecret = process.env.WAVE_WEBHOOK_SECRET || '';
    }

    /**
     * Génère l'URL directe Wave Business avec le montant prescrit
     * Sur smartphone, ce lien ouvre directement l'application Wave avec le compte et montant pré-remplis.
     * Le client n'a plus qu'à appuyer sur 'Valider' / 'Payer'.
     * 
     * @param {number|string} [amount] - Montant en FCFA (ex: 5000)
     * @returns {string} URL de navigation / deep link Wave (ex: https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/?amount=5000)
     */
    getBusinessPaymentUrl(amount) {
        let base = (process.env.WAVE_BUSINESS_URL || 'https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/').trim();
        if (!base.endsWith('/')) {
            base += '/';
        }
        if (amount && Number(amount) > 0) {
            const cleanAmount = Math.round(Number(amount));
            return `${base}?amount=${cleanAmount}`;
        }
        return base;
    }

    /**
     * Initialise une session de paiement Wave Checkout
     * Si aucune clé secrète API officielle n'est configurée, bascule automatiquement
     * et en toute transparence sur l'URL directe Wave Business marchand avec montant prescrit.
     * 
     * @param {Object} params
     * @param {number|string} params.amount - Montant en FCFA (ex: 5000)
     * @param {string} [params.currency='XOF'] - Devise (XOF pour le Sénégal)
     * @param {string} params.errorUrl - URL de redirection en cas d'échec ou abandon
     * @param {string} params.successUrl - URL de redirection après validation
     * @param {string} params.clientReference - Référence unique pour réconcilier la transaction
     * @returns {Promise<Object>} Détails de la session avec `wave_launch_url`
     */
    async createCheckoutSession({ amount, currency = 'XOF', errorUrl, successUrl, clientReference }) {
        const secretKey = (process.env.WAVE_SECRET_KEY || this.secretKey || '').trim();

        // Si la clé API est absente ou correspond à la clé fictive de test, utiliser directement le lien Marchand Wave Business
        if (!secretKey || secretKey.includes('votre_cle')) {
            const directUrl = this.getBusinessPaymentUrl(amount);
            console.log(`[Wave Service] Navigation directe via lien Wave Business Marchand : ${directUrl}`);
            return {
                id: `sess_wb_${Date.now()}`,
                wave_launch_url: directUrl,
                amount: String(amount),
                currency: currency,
                mode: 'business_direct_link'
            };
        }

        const payload = {
            amount: String(amount),
            currency: currency,
            error_url: errorUrl,
            success_url: successUrl,
            client_reference: clientReference
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'CoachFlow-SaaS/1.0'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn(`[Wave Service] API Checkout a répondu [${response.status}]. Bascule sur le lien Wave Business marchand.`);
                return {
                    id: `sess_wb_fallback_${Date.now()}`,
                    wave_launch_url: this.getBusinessPaymentUrl(amount),
                    amount: String(amount),
                    currency: currency,
                    mode: 'business_fallback'
                };
            }

            return data;
        } catch (fetchError) {
            console.warn(`[Wave Service] Échec réseau API Wave Checkout (${fetchError.message}). Bascule sur le lien Wave Business.`);
            return {
                id: `sess_wb_offline_${Date.now()}`,
                wave_launch_url: this.getBusinessPaymentUrl(amount),
                amount: String(amount),
                currency: currency,
                mode: 'business_fallback'
            };
        }
    }

    /**
     * Vérifie la signature de sécurité du Webhook Wave
     * En-tête attendu : Wave-Signature: t=1614275086,v1=5f7c3b2a...
     * 
     * @param {string} signatureHeader - Contenu de l'en-tête 'Wave-Signature'
     * @param {Buffer|string} rawBody - Corps brut de la requête HTTP (Buffer)
     * @param {number} [toleranceSeconds=300] - Tolérance pour éviter les attaques par rejeu (5 min par défaut)
     * @returns {boolean} true si la signature est valide, sinon false
     */
    verifyWebhookSignature(signatureHeader, rawBody, toleranceSeconds = 300) {
        const webhookSecret = (process.env.WAVE_WEBHOOK_SECRET || this.webhookSecret || '').trim();

        if (!webhookSecret || webhookSecret.includes('votre_secret')) {
            console.warn("⚠️ WAVE_WEBHOOK_SECRET non configuré dans .env. Signature ignorée en mode test.");
            return true;
        }

        if (!signatureHeader || !rawBody) {
            return false;
        }

        try {
            // Extraire timestamp (t) et signatures (v1)
            const parts = signatureHeader.split(',');
            let timestamp = null;
            const signatures = [];

            for (const part of parts) {
                const [key, value] = part.trim().split('=');
                if (key === 't') {
                    timestamp = parseInt(value, 10);
                } else if (key === 'v1') {
                    signatures.push(value);
                }
            }

            if (!timestamp || signatures.length === 0) {
                return false;
            }

            // Vérification de l'horodatage pour prévenir les attaques par rejeu (Replay attacks)
            const nowSeconds = Math.floor(Date.now() / 1000);
            if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
                console.error(`Signature Wave expirée (diff: ${Math.abs(nowSeconds - timestamp)}s > ${toleranceSeconds}s)`);
                return false;
            }

            // Calcul du HMAC SHA-256 : timestamp + rawBody
            const rawBodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
            const payloadToSign = `${timestamp}${rawBodyString}`;

            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(payloadToSign)
                .digest('hex');

            // Comparaison sécurisée contre les attaques temporelles (timing attacks)
            for (const sig of signatures) {
                const sigBuffer = Buffer.from(sig, 'hex');
                const expectedBuffer = Buffer.from(expectedSignature, 'hex');
                if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error("Erreur lors de la vérification de la signature Wave :", error);
            return false;
        }
    }
}

module.exports = new WaveService();
