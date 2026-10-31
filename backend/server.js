const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'TU_CLIENT_ID_AQUI';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || 'TU_SECRET_AQUI';
const PAYPAL_API = 'https://api-m.paypal.com'; 

app.post('/api/verify-payment', async (req, res) => {
    const { paymentId } = req.body;
    
    if (!paymentId) {
        return res.status(400).json({ valid: false, error: 'Falta paymentId' });
    }

    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
        
        // 🔍 Intentamos buscar el pago como Orden (v2) o como Pago (v1)
        let isValid = false;
        
        // 1. Intentar con la API de Ordenes (la más común en Link de Pago)
        let response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paymentId}`, {
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }
        });
        let data = await response.json();

        if (data.status === 'COMPLETED' && data.purchase_units[0].amount.value === '2.99') {
            isValid = true;
        } else {
            // 2. Si falla, intentar con la API de Pagos (v1)
            response = await fetch(`${PAYPAL_API}/v1/payments/payment/${paymentId}`, {
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }
            });
            data = await response.json();
            
            if (data.state === 'approved' && data.transactions[0].amount.total === '2.99') {
                isValid = true;
            }
        }

        if (isValid) {
            return res.json({ valid: true });
        } else {
            console.log('❌ Pago no válido:', data);
            return res.json({ valid: false, error: 'El pago no está completado o el monto es incorrecto' });
        }

    } catch (error) {
        console.error('Error verificando pago:', error);
        res.status(500).json({ valid: false, error: 'Error de conexión con PayPal' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});