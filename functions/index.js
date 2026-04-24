const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

// Webhook para PayPal
exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  console.log('📨 Webhook PayPal recibido:', req.body);

  try {
    const eventType = req.body.event_type;

    // Procesar suscripción
    if (eventType === 'PAYPAL.SUBSCRIPTION.ACTIVATED' ||
        eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscription = req.body.resource;
      const subscriptionId = subscription.id;

      // Buscar en Firebase
      const snapshot = await db.ref(`Transactions/${subscriptionId}`).once('value');
      const transaction = snapshot.val();

      if (transaction && transaction.code) {
        await db.ref(`ActivationCodes/${transaction.code}`).update({
          paypalVerified: true,
          verifiedAt: admin.database.ServerValue.TIMESTAMP,
          subscriptionStatus: 'ACTIVE',
        });
        console.log(`✅ Suscripción ${subscriptionId} verificada`);
      }
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).send('Error');
  }
});

// Función llamable desde cliente
exports.callPayPalWebhook = functions.https.onCall(async (data, context) => {
  console.log('📞 Función llamable:', data);

  try {
    const {subscriptionId, planId, planName, code, amount, status} = data;

    await db.ref(`WebhookLogs/${subscriptionId}`).set({
      subscriptionId: subscriptionId,
      planId: planId,
      planName: planName,
      code: code,
      amount: amount,
      status: status,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      processed: true,
    });

    return {success: true, message: 'Webhook procesado'};
  } catch (error) {
    console.error('Error:', error);
    return {success: false, error: error.message};
  }
});