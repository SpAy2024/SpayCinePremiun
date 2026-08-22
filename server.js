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
const PAYPAL_API = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    console.error('❌ Falta PAYPAL_CLIENT_ID / PAYPAL_SECRET en las variables de entorno');
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

// ── Firebase Admin (privilegios de servidor, no el SDK del cliente) ──
// En Render, pon el JSON de la cuenta de servicio en la variable de entorno
// FIREBASE_SERVICE_ACCOUNT (como texto), y la URL de tu Realtime Database
// en FIREBASE_DB_URL.
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

// ── Planes (fuente de verdad: SOLO el servidor decide precio/duración) ──
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

// Genera un código único reintentando si ya existe en la base de datos
async function generateUniqueCode(prefix) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode(prefix);
        const snap = await db.ref('ActivationCodes/' + code).get();
        if (!snap.exists()) return code;
    }
    throw new Error('No se pudo generar un código único, intenta de nuevo');
}

// ── Endpoint clave: el frontend SOLO manda el subscriptionID ──
// El servidor decide si el código se genera o no.
app.post('/api/activate-subscription', async (req, res) => {
    const { subscriptionId, planType } = req.body;

    if (!subscriptionId || !PLANS[planType]) {
        return res.status(400).json({ error: 'subscriptionId o planType inválido' });
    }

    try {
        // Evita generar dos códigos para la misma suscripción si el usuario
        // recarga la página o hace doble clic
        const existing = await db.ref('Transactions/' + subscriptionId).get();
        if (existing.exists()) {
            return res.json({ code: existing.val().code, plan: PLANS[planType].name });
        }

        // Verificación REAL contra PayPal — esto es lo que faltaba
        const subscription = await getSubscription(subscriptionId);

        if (subscription.status !== 'ACTIVE') {
            return res.status(402).json({ error: `Suscripción no activa (status: ${subscription.status})` });
        }

        // Confirma que el plan aprobado coincide con el que se está reclamando
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

// Cancelar suscripción (igual que antes)
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
