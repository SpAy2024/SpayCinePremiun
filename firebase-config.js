// firebase-config.js
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
            const app = firebase.initializeApp(firebaseConfig);
            const database = firebase.database();
            
            window.firebaseDB = {
                saveCode: async function(code, planConfig, subscriptionId) {
                    try {
                        // Guardar código con estructura requerida
                        await database.ref('ActivationCodes/' + code).set({
                            IsUsed: false,
                            Type: planConfig.type
                        });
                        
                        // Guardar transacción
                        await database.ref('Transactions/' + subscriptionId).set({
                            code: code,
                            plan: planConfig.name,
                            type: planConfig.type,
                            subscriptionId: subscriptionId,
                            price: planConfig.price,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            status: 'active'
                        });
                        
                        console.log(`✅ Código ${code} guardado como ${planConfig.type}`);
                        return true;
                    } catch (error) {
                        console.error('Error:', error);
                        throw error;
                    }
                }
            };
            
            console.log('✅ Firebase conectado');
        }
    } catch (error) {
        console.log('Error Firebase:', error);
        window.firebaseDB = null;
    }
})();
