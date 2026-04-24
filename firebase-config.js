// firebase-config.js - Configuración REAL de tu proyecto Firebase
(function() {
    'use strict';
    
    // ✅ Tu configuración de Firebase (de app-animes-63d30)
    const firebaseConfig = {
        apiKey: "AIzaSyD3b2c4E5fG6h7I8j9K0l1M2n3O4p5Q6r7S",
        authDomain: "app-animes-63d30.firebaseapp.com",
        databaseURL: "https://app-animes-63d30-default-rtdb.firebaseio.com",
        projectId: "app-animes-63d30",
        storageBucket: "app-animes-63d30.appspot.com",
        messagingSenderId: "378450975564",
        appId: "1:378450975564:android:a9f08c48a1bc80ae074de9"
    };
    
    // Inicializar Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    window.firebaseDB = database;
    
    // Función para llamar a la Cloud Function (webhook)
    window.callPayPalWebhook = async (subscriptionData) => {
        try {
            // Usar la función de Firebase (cuando esté desplegada)
            const paypalWebhook = firebase.functions().httpsCallable('paypalWebhook');
            const result = await paypalWebhook(subscriptionData);
            console.log('✅ Webhook llamado:', result.data);
            return result.data;
        } catch (error) {
            console.error('❌ Error llamando webhook:', error);
            // Fallback: guardar en Firebase para procesar después
            await database.ref('PendingWebhooks/').push({
                ...subscriptionData,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                retry: 0
            });
            return { error: error.message, queued: true };
        }
    };
    
    console.log('✅ Firebase conectado - Proyecto: app-animes-63d30');
})();