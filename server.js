// server.js - Backend para Render
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ── PayPal ────────────────────────────────────────────────
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID; // ID del webhook, no el secret
const PAYPAL_API = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    console.error('❌ Falta PAYPAL_CLIENT_ID / PAYPAL_SECRET en las variables de entorno');
}
if (!PAYPAL_WEBHOOK_ID) {
    console.error('⚠️ Falta PAYPAL_WEBHOOK_ID — las renovaciones y cancelaciones no se procesarán');
}

async function paypalAuthHeader() {
    return 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
}

async function getSubscription(subscriptionId) {
    const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: {
            Authorization: await paypalAuthHeader(),
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) throw new Error(`PayPal respondió ${res.status}`);
    return res.json();
}

// Verifica que el webhook realmente viene de PayPal (evita que cualquiera
// pueda pegarle a /api/paypal-webhook y falsificar una renovación o cancelación)
async function verifyWebhookSignature(headers, body) {
    const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
            Authorization: await paypalAuthHeader(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            transmission_id: headers['paypal-transmission-id'],
            transmission_time: headers['paypal-transmission-time'],
            cert_url: headers['paypal-cert-url'],
            auth_algo: headers['paypal-auth-algo'],
            transmission_sig: headers['paypal-transmission-sig'],
            webhook_id: PAYPAL_WEBHOOK_ID,
            webhook_event: body
        })
    });
    const data = await res.json();
    return data.verification_status === 'SUCCESS';
}

// ── Firebase Admin ───────────────────────────────────────────
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

// ── Planes (fuente de verdad) ────────────────────────────────
const PLANS = {
    mensual: { name: '1 Mes', price: 2.99, days: 30, plan_id: 'P-18381349AF867540CNEVSH5I', prefix: 'M' },
    '3meses': { name: '3 Meses', price: 7.99, days: 90, plan_id: 'P-5PP81994FM215525RNEVSJFA', prefix: 'T' },
    year: { name: '1 Año', price: 24.99, days: 365, plan_id: 'P-3E203769WC9540323NEVSJ5Q', prefix: 'Y' }
};

function generateCode(prefix) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

async function generateUniqueCode(prefix) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode(prefix);
        const snap = await db.ref('ActivationCodes/' + code).get();
        if (!snap.exists()) return code;
    }
    throw new Error('No se pudo generar un código único, intenta de nuevo');
}

// ── Activación inicial: el frontend SOLO manda el subscriptionID ──
app.post('/api/activate-subscription', async (req, res) => {
    const { subscriptionId, planType } = req.body;

    if (!subscriptionId || !PLANS[planType]) {
        return res.status(400).json({ error: 'subscriptionId o planType inválido' });
    }

    try {
        const existing = await db.ref('Transactions/' + subscriptionId).get();
        if (existing.exists()) {
            return res.json({ code: existing.val().code, plan: PLANS[planType].name });
        }

        const subscription = await getSubscription(subscriptionId);

        if (subscription.status !== 'ACTIVE') {
            return res.status(402).json({ error: `Suscripción no activa (status: ${subscription.status})` });
        }

        if (subscription.plan_id !== PLANS[planType].plan_id) {
            return res.status(400).json({ error: 'El plan no coincide con la suscripción verificada' });
        }

        const plan = PLANS[planType];
        const code = await generateUniqueCode(plan.prefix);
        const now = Date.now();
        const expiresAt = now + plan.days * 24 * 60 * 60 * 1000;

        const record = {
            code,
            plan: plan.name,
            planType,
            price: plan.price,
            subscriptionId,
            createdAt: now,
            expiresAt,
            status: 'active',
            isUsed: false
        };

        await db.ref('ActivationCodes/' + code).set(record);
        await db.ref('Transactions/' + subscriptionId).set(record);

        res.json({ code, plan: plan.name, expiresAt });
    } catch (error) {
        console.error('Error activando suscripción:', error);
        res.status(500).json({ error: 'No se pudo verificar el pago, intenta de nuevo' });
    }
});

// ── Webhook de PayPal: renovaciones, cancelaciones, reembolsos ──
// Configúralo en developer.paypal.com -> tu app -> Webhooks, apuntando a
// https://TU-SERVIDOR.onrender.com/api/paypal-webhook con estos eventos:
//   PAYMENT.SALE.COMPLETED, BILLING.SUBSCRIPTION.CANCELLED,
//   BILLING.SUBSCRIPTION.SUSPENDED, BILLING.SUBSCRIPTION.EXPIRED,
//   PAYMENT.SALE.REFUNDED
app.post('/api/paypal-webhook', async (req, res) => {
    const event = req.body;

    try {
        const isValid = await verifyWebhookSignature(req.headers, event);
        if (!isValid) {
            console.warn('⚠️ Webhook con firma inválida, ignorado');
            return res.status(400).json({ error: 'Firma inválida' });
        }

        console.log('📩 Webhook PayPal:', event.event_type);

        switch (event.event_type) {
            // Cobro de renovación exitoso → extiende la fecha de expiración
            case 'PAYMENT.SALE.COMPLETED': {
                const subscriptionId = event.resource.billing_agreement_id;
                if (!subscriptionId) break;

                const txSnap = await db.ref('Transactions/' + subscriptionId).get();
                if (!txSnap.exists()) {
                    console.warn(`Pago recibido para suscripción desconocida: ${subscriptionId}`);
                    break;
                }

                const tx = txSnap.val();
                const plan = PLANS[tx.planType];
                if (!plan) break;

                // Extiende desde la fecha de expiración actual (o desde ahora si ya venció)
                const base = Math.max(tx.expiresAt || 0, Date.now());
                const newExpiresAt = base + plan.days * 24 * 60 * 60 * 1000;

                await db.ref('Transactions/' + subscriptionId).update({ expiresAt: newExpiresAt, status: 'active' });
                await db.ref('ActivationCodes/' + tx.code).update({ expiresAt: newExpiresAt, status: 'active' });

                console.log(`✅ Renovado ${tx.code} hasta ${new Date(newExpiresAt).toISOString()}`);
                break;
            }

            // Cancelación, suspensión o vencimiento → revoca el acceso
            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.SUSPENDED':
            case 'BILLING.SUBSCRIPTION.EXPIRED': {
                const subscriptionId = event.resource.id;
                const txSnap = await db.ref('Transactions/' + subscriptionId).get();
                if (!txSnap.exists()) break;

                const tx = txSnap.val();
                await db.ref('Transactions/' + subscriptionId).update({ status: 'revoked' });
                await db.ref('ActivationCodes/' + tx.code).update({ status: 'revoked' });

                console.log(`🚫 Revocado ${tx.code} (${event.event_type})`);
                break;
            }

            // Reembolso → revoca de inmediato
            case 'PAYMENT.SALE.REFUNDED': {
                const subscriptionId = event.resource.billing_agreement_id;
                if (!subscriptionId) break;

                const txSnap = await db.ref('Transactions/' + subscriptionId).get();
                if (!txSnap.exists()) break;

                const tx = txSnap.val();
                await db.ref('Transactions/' + subscriptionId).update({ status: 'revoked' });
                await db.ref('ActivationCodes/' + tx.code).update({ status: 'revoked' });

                console.log(`🚫 Revocado por reembolso: ${tx.code}`);
                break;
            }

            default:
                // Otros eventos no nos interesan
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error procesando webhook:', error);
        // Responder 200 igual evita que PayPal reintente infinitamente un evento
        // que va a seguir fallando por el mismo motivo; solo lo dejamos logueado.
        res.status(200).json({ received: true, error: 'internal' });
    }
});

// Cancelar suscripción manualmente desde tu propio panel/soporte
app.post('/api/cancel-subscription', async (req, res) => {
    const { subscriptionId, reason } = req.body;
    try {
        const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: {
                Authorization: await paypalAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason || 'Customer requested cancellation' })
        });
        res.json({ status: response.status === 204 ? 'cancelled' : 'error' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`📦 Modo: ${process.env.NODE_ENV || 'development'}`);
});
