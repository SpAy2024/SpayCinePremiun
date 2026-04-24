const express = require('express');
const app = express();

app.use(express.json());

// Endpoint del webhook
app.post('/api/paypal-webhook', (req, res) => {
  console.log('📨 Webhook recibido:', new Date().toISOString());
  console.log('Evento:', req.body.event_type);
  
  if (req.body.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const subscription = req.body.resource;
    console.log(`✅ Suscripción activada: ${subscription.id}`);
    console.log(`📋 Plan: ${subscription.plan_id}`);
  }
  
  res.status(200).send('Webhook recibido');
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Webhook corriendo en puerto ${PORT}`);
});