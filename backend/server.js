const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ REEMPLAZA ESTO CON TUS DATOS DE PAYPAL (Los copiaste de la pantalla anterior)
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'TU_CLIENT_ID_AQUI';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || 'TU_SECRET_AQUI';
const PAYPAL_API = 'https://api-m.paypal.com'; // Modo Real (Producción)

app.post('/api/verify-payment', async (req, res) => {
    const { paymentId } = req.body;
    
    if (!paymentId) {
        return res.status(400).json({ valid: false, error: 'Falta paymentId' });
    }

    try {
        // 1. Autenticarse con PayPal
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
        
        // 2. Preguntar a PayPal sobre el pago
        // Usamos el endpoint de órdenes (orders) o pagos (payments)
        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paymentId}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();

        // 3. Verificar que el pago esté COMPLETADO y sea por $2.99 USD
        if (data.status === 'COMPLETED' && data.purchase_units[0].amount.value === '2.99') {
            return res.json({ valid: true });
        } else {
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