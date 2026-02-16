// firebase-config.js - Versión simplificada
(function() {
    'use strict';
    
    const firebaseConfig = {
        apiKey: "AIzaSyD3b2c4E5fG6h7I8j9K0l1M2n3O4p5Q6r7S",
        authDomain: "app-animes-63d30.firebaseapp.com",
        databaseURL: "https://app-animes-63d30-default-rtdb.firebaseio.com",
        projectId: "app-animes-63d30",
        storageBucket: "app-animes-63d30.appspot.com",
        messagingSenderId: "378450975564",
        appId: "1:378450975564:android:a9f08c48a1bc80ae074de9"
    };
    
    try {
        if (typeof firebase !== 'undefined') {
            // Inicializar Firebase
            const app = firebase.initializeApp(firebaseConfig);
            const database = firebase.database();
            
            // Verificar conexión
            database.ref('.info/connected').on('value', (snap) => {
                if (snap.val() === true) {
                    console.log('✅ Conectado a Firebase');
                } else {
                    console.log('⚠️ Firebase offline');
                }
            });
            
            // API pública
            window.firebaseDB = {
                saveCode: async function(code, planType, subscriptionId, planConfig) {
                    try {
                        await database.ref('ActivationCodes/' + code).set({
                            code: code,
                            plan: planConfig.name,
                            type: planType,
                            subscriptionId: subscriptionId,
                            createdAt: firebase.database.ServerValue.TIMESTAMP,
                            used: false
                        });
                        console.log('✅ Código guardado en Firebase');
                        return true;
                    } catch (error) {
                        console.log('Firebase error:', error);
                        throw error;
                    }
                }
            };
            
            console.log('✅ Firebase configurado');
        }
    } catch (error) {
        console.log('Error Firebase:', error);
        window.firebaseDB = null;
    }
    
    // Generador de códigos
    window.generatePremiumCode = function(planType) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const prefixes = {mensual:'ANM', '3meses':'AN3', year:'ANY'};
        return `${prefixes[planType]||'ANC'}-${timestamp}-${random}`;
    };
    
})();
