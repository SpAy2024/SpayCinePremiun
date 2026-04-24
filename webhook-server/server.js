const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Leer variables de entorno de Render
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 Webhook server iniciado');
console.log(`📦 Entorno: ${NODE_ENV}`);
console.log(`🔑 PayPal Client ID: ${PAYPAL_CLIENT_ID ? '✅ Configurado' : '❌ Faltante'}`);
console.log(`🔐 PayPal Secret: ${PAYPAL_SECRET ? '✅ Configurado' : '❌ Faltante'}`);

// Endpoint del webhook
app.post('/api/paypal-webhook', (req, res) => {
  console.log('📨 Webhook recibido:', new Date().toISOString());
  console.log('Headers:', req.headers);
  console.log('Evento:', req.body.event_type);
  
  // Procesar según el tipo de evento
  const eventType = req.body.event_type;
  
  switch(eventType) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'PAYPAL.SUBSCRIPTION.ACTIVATED':
      const subscription = req.body.resource;
      console.log(`✅ Suscripción ACTIVADA: ${subscription.id}`);
      console.log(`📋 Plan ID: ${subscription.plan_id}`);
      console.log(`👤 Email: ${subscription.subscriber?.email_address || 'No disponible'}`);
      break;
      
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      console.log(`❌ Suscripción CANCELADA: ${req.body.resource?.id || 'N/A'}`);
      break;
      
    case 'PAYMENT.SALE.COMPLETED':
      console.log(`💰 Pago COMPLETADO: ${req.body.resource?.amount?.total || 'N/A'} USD`);
      break;
      
    default:
      console.log(`📌 Evento no manejado: ${eventType}`);
  }
  
  // Siempre responder 200 OK a PayPal
  res.status(200).send('Webhook recibido correctamente');
});

// Endpoint de prueba (para verificar que el servidor funciona)
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    paypalClientIdConfigured: !!PAYPAL_CLIENT_ID,
    paypalSecretConfigured: !!PAYPAL_SECRET
  });
});

// Health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Webhook server escuchando en puerto ${PORT}`);
  console.log(`📡 Endpoint POST: https://tu-servicio.onrender.com/api/paypal-webhook`);
  console.log(`🔍 Test GET: https://tu-servicio.onrender.com/api/test`);
});
