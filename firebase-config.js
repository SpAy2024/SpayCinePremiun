// firebase-config.js - Versión actualizada con la estructura correcta
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
            
            // API pública para guardar códigos
            window.firebaseDB = {
                saveCode: async function(code, planConfig, subscriptionId) {
                    try {
                        // Crear objeto con la estructura requerida
                        // "ABC123": { "IsUsed": false, "Type": "mensual" }
                        const codeData = {
                            IsUsed: false,
                            Type: planConfig.type // 'mensual', '3meses', 'year'
                        };
                        
                        // Guardar en Firebase con la estructura exacta que necesitas
                        await database.ref('ActivationCodes/' + code).set(codeData);
                        
                        // También guardar un registro de la transacción
                        const transactionData = {
                            code: code,
                            plan: planConfig.name,
                            type: planConfig.type,
                            subscriptionId: subscriptionId,
                            price: planConfig.price,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            status: 'active'
                        };
                        
                        await database.ref('Transactions/' + subscriptionId).set(transactionData);
                        
                        console.log(`✅ Código ${code} guardado en Firebase como tipo ${planConfig.type}`);
                        
                        // Verificar que se guardó correctamente
                        const snapshot = await database.ref('ActivationCodes/' + code).once('value');
                        if (snapshot.exists()) {
                            console.log('✅ Verificación exitosa:', snapshot.val());
                        }
                        
                        return true;
                    } catch (error) {
                        console.error('Error guardando en Firebase:', error);
                        throw error;
                    }
                },
                
                // Función para verificar si un código existe
                checkCode: async function(code) {
                    try {
                        const snapshot = await database.ref('ActivationCodes/' + code).once('value');
                        return snapshot.exists();
                    } catch (error) {
                        console.error('Error verificando código:', error);
                        return false;
                    }
                },
                
                // Función para obtener todos los códigos (útil para debugging)
                getAllCodes: async function() {
                    try {
                        const snapshot = await database.ref('ActivationCodes').once('value');
                        return snapshot.val();
                    } catch (error) {
                        console.error('Error obteniendo códigos:', error);
                        return null;
                    }
                }
            };
            
            console.log('✅ Firebase configurado correctamente');
            
            // Mostrar estructura de ejemplo en consola
            console.log('📝 Estructura de datos:');
            console.log({
                "ABC123": {
                    "IsUsed": false,
                    "Type": "mensual"
                },
                "AVS1986": {
                    "IsUsed": false,
                    "Type": "3meses"
                },
                "SPAYCINE6": {
                    "IsUsed": false,
                    "Type": "year"
                }
            });
            
        } else {
            console.error('❌ Firebase no está disponible');
            window.firebaseDB = null;
        }
    } catch (error) {
        console.error('Error inicializando Firebase:', error);
        window.firebaseDB = null;
    }
    
})();
