// server.js - Backend para Render
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Servir archivos estáticos

// ✅ IMPORTANTE: Usa TU Client ID real de PayPal
// El que me diste parece incorrecto (Client ID = Secret)
// Ve a https://developer.paypal.com -> Apps & Credentials
// y obtén el CLIENT ID correcto

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'TU_CLIENT_ID_REAL_AQUI';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || 'TU_SECRET_REAL_AQUI';
const PAYPAL_API = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// Endpoint para verificar suscripción
app.post('/api/verify-subscription', async (req, res) => {
    const { subscriptionId } = req.body;
    
    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
        
        const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para cancelar suscripción
app.post('/api/cancel-subscription', async (req, res) => {
    const { subscriptionId, reason } = req.body;
    
    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
        
        const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
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