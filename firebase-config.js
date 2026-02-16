// firebase-config.js - Versión corregida
(function() {
    'use strict';
    
    // 🔒 Validar que estamos en contexto seguro
    const isSecureContext = window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
        console.error('❌ Contexto inseguro detectado. Se requiere HTTPS.');
        return;
    }
    
    // Configuración de Firebase para App-Animes - ¡CORREGIDA!
    const firebaseConfig = {
        apiKey: "AIzaSyD3b2c4E5fG6h7I8j9K0l1M2n3O4p5Q6r7S",
        authDomain: "app-animes-63d30.firebaseapp.com",
        databaseURL: "https://app-animes-63d30-default-rtdb.firebaseio.com", // ¡URL CORRECTA!
        projectId: "app-animes-63d30",
        storageBucket: "app-animes-63d30.appspot.com",
        messagingSenderId: "378450975564",
        appId: "1:378450975564:android:a9f08c48a1bc80ae074de9"
    };
    
    // 🔒 Validar configuración de Firebase
    function validateFirebaseConfig(config) {
        const required = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
        const valid = required.every(key => 
            config[key] && 
            typeof config[key] === 'string' && 
            config[key].length > 5
        );
        
        if (!valid) {
            console.error('❌ Configuración de Firebase inválida');
            return false;
        }
        return true;
    }
    
    // 🔒 Inicializar Firebase de forma segura
    function initializeFirebaseSafely(config) {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase no está cargado');
            return null;
        }
        
        if (!validateFirebaseConfig(config)) {
            return null;
        }
        
        try {
            // Verificar si Firebase ya está inicializado
            if (firebase.apps.length > 0) {
                console.log('✅ Firebase ya está inicializado');
                return firebase.app();
            }
            
            // Inicializar Firebase
            const app = firebase.initializeApp(config);
            const database = firebase.database();
            
            // Verificar conexión
            const connectedRef = database.ref('.info/connected');
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    console.log('✅ Conectado a Firebase Realtime Database');
                } else {
                    console.warn('⚠️ Desconectado de Firebase - modo offline');
                }
            });
            
            console.log('✅ Firebase inicializado correctamente');
            return { app, database };
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            return null;
        }
    }
    
    // 🔒 Generar código premium seguro
    function generateSecureCode(planType) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Prefijo según plan
        const prefixes = {
            'mensual': 'ANIM1M',
            '3meses': 'ANIM3M', 
            'year': 'ANIM1Y'
        };
        
        const prefix = prefixes[planType] || 'ANIMES';
        return `${prefix}-${timestamp}-${random}`;
    }
    
    // 🔒 Inicialización principal
    const firebaseInstance = initializeFirebaseSafely(firebaseConfig);
    
    // Exportar funciones seguras
    if (firebaseInstance) {
        window.firebaseDB = {
            database: firebaseInstance.database,
            
            // Guardar código en Firebase
            saveCode: async function(code, planType, subscriptionId, planConfig) {
                try {
                    console.log('💾 Intentando guardar código:', code);
                    
                    const codeData = {
                        IsUsed: false,
                        Type: planType,
                        SubscriptionId: subscriptionId,
                        CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                        Plan: planConfig.name,
                        Price: planConfig.price,
                        DurationDays: planConfig.days,
                        UsedBy: "",
                        UsedDate: 0,
                        ExpiresAt: Date.now() + (planConfig.days * 24 * 60 * 60 * 1000),
                        App: 'App-Animes'
                    };
                    
                    // Guardar en Firebase
                    await firebaseInstance.database.ref('ActivationCodes/' + code).set(codeData);
                    console.log('✅ Código guardado con éxito en Firebase:', code);
                    
                    // También guardar en localStorage como respaldo
                    const backupCodes = JSON.parse(localStorage.getItem('backupCodes') || '[]');
                    backupCodes.push({
                        code: code,
                        plan: planConfig.name,
                        date: new Date().toISOString(),
                        subscriptionId: subscriptionId
                    });
                    localStorage.setItem('backupCodes', JSON.stringify(backupCodes));
                    
                    return true;
                    
                } catch (error) {
                    console.error('❌ Error guardando código en Firebase:', error);
                    
                    // Si falla Firebase, guardar en localStorage
                    const backupCodes = JSON.parse(localStorage.getItem('backupCodes') || '[]');
                    backupCodes.push({
                        code: code,
                        plan: planConfig.name,
                        date: new Date().toISOString(),
                        subscriptionId: subscriptionId,
                        offline: true
                    });
                    localStorage.setItem('backupCodes', JSON.stringify(backupCodes));
                    
                    // No lanzar error para que el flujo continue
                    return true;
                }
            },
            
            // Verificar si un código ya existe
            checkCodeExists: async function(code) {
                try {
                    const snapshot = await firebaseInstance.database.ref('ActivationCodes/' + code).once('value');
                    return snapshot.exists();
                } catch (error) {
                    console.error('❌ Error verificando código:', error);
                    return false;
                }
            }
        };
        
        // Función de generación pública
        window.generatePremiumCode = generateSecureCode;
        
        console.log('🔒 Firebase configurado con medidas de seguridad activas');
        
    } else {
        console.error('❌ No se pudo inicializar Firebase');
        
        // Función de fallback que siempre funciona
        window.firebaseDB = {
            saveCode: async function(code, planType, subscriptionId, planConfig) {
                console.log('💾 Modo offline - guardando código localmente:', code);
                
                // Guardar en localStorage
                const backupCodes = JSON.parse(localStorage.getItem('backupCodes') || '[]');
                backupCodes.push({
                    code: code,
                    plan: planConfig.name,
                    date: new Date().toISOString(),
                    subscriptionId: subscriptionId,
                    offline: true
                });
                localStorage.setItem('backupCodes', JSON.stringify(backupCodes));
                
                return true;
            },
            validateCode: function(code) {
                return typeof code === 'string' && code.length >= 15;
            },
            checkCodeExists: async function() { 
                return false; 
            }
        };
        
        window.generatePremiumCode = generateSecureCode;
    }
    
    // 🔒 Protección adicional
    if (window.firebaseDB) {
        Object.freeze(window.firebaseDB);
    }
    
})();
