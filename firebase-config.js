// firebase-config.js - Configuración segura para App-Animes
(function() {
    'use strict';
    
    // 🔒 Validar que estamos en contexto seguro
    const isSecureContext = window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
        console.error('❌ Contexto inseguro detectado. Se requiere HTTPS.');
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; background: #f44336; color: white; min-height: 100vh;">
                <h1>⚠️ ERROR DE SEGURIDAD</h1>
                <p>Esta página requiere conexión segura (HTTPS).</p>
                <p>Por favor, accede a través de: <strong>https://tu-dominio.com</strong></p>
                <p>Redirigiendo en 5 segundos...</p>
            </div>
        `;
        setTimeout(() => {
            window.location.href = 'https://' + window.location.host + window.location.pathname;
        }, 5000);
        return;
    }
    
    // Configuración de Firebase para App-Animes
    const firebaseConfig = {
        apiKey: "AIzaSyD3b2c4E5fG6h7I8j9K0l1M2n3O4p5Q6r7S",
        authDomain: "app-animes-63d30.firebaseapp.com",
        databaseURL: "https://app-animes-63d30-default-rtdb.firebaseio.com",
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
            config[key].length > 10
        );
        
        if (!valid) {
            console.error('❌ Configuración de Firebase inválida');
            return false;
        }
        
        // Verificar que la API Key tenga formato correcto
        if (!config.apiKey.startsWith('AIza')) {
            console.warn('⚠️ API Key de Firebase con formato inusual');
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
            const database = firebase.database(app);
            
            console.log('✅ Firebase inicializado correctamente');
            return { app, database };
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            
            // Mostrar mensaje amigable al usuario
            if (document.getElementById('loading')) {
                hideLoading();
            }
            
            alert('Error de conexión con el servidor. Por favor, recarga la página o intenta más tarde.');
            return null;
        }
    }
    
    // 🔒 Generar código premium seguro
    function generateSecureCode(planType) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(3)))
            .map(b => b.toString(36))
            .join('')
            .toUpperCase()
            .substr(0, 4);
        
        // Prefijo según plan
        const prefixes = {
            'mensual': 'ANIM1M',
            '3meses': 'ANIM3M', 
            'year': 'ANIM1Y'
        };
        
        const prefix = prefixes[planType] || 'ANIMES';
        const code = `${prefix}-${timestamp}-${randomPart}`;
        
        // Validar formato del código
        if (code.length !== 20) {
            console.error('❌ Código generado con longitud incorrecta:', code);
            return generateSecureCode(planType); // Regenerar
        }
        
        console.log('🔐 Código seguro generado:', code.substring(0, 8) + '...');
        return code;
    }
    
    // 🔒 Obtener información del cliente de forma segura
    function getClientInfo() {
        return {
            userAgent: navigator.userAgent.substring(0, 200),
            language: navigator.language,
            platform: navigator.platform,
            screenSize: `${screen.width}x${screen.height}`,
            timestamp: Date.now(),
            referrer: document.referrer || 'direct',
            isSecure: window.isSecureContext,
            hasCookies: navigator.cookieEnabled
        };
    }
    
    // 🔒 Sanitizar datos antes de enviar a Firebase
    function sanitizeData(data) {
        const sanitized = {};
        
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                
                // Sanitizar según tipo
                if (typeof value === 'string') {
                    // Limitar longitud y eliminar caracteres peligrosos
                    sanitized[key] = value
                        .substring(0, 1000)
                        .replace(/[<>]/g, '')
                        .trim();
                } else if (typeof value === 'number') {
                    // Validar números
                    if (isFinite(value)) {
                        sanitized[key] = value;
                    }
                } else if (typeof value === 'boolean') {
                    sanitized[key] = value;
                } else if (value === null || value === undefined) {
                    sanitized[key] = null;
                }
            }
        }
        
        return sanitized;
    }
    
    // 🔒 Calcular fecha de expiración
    function getExpirationDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        date.setHours(23, 59, 59, 999); // Fin del día
        return date.getTime();
    }
    
    // 🔒 Inicialización principal
    const firebaseInstance = initializeFirebaseSafely(firebaseConfig);
    
    // Exportar funciones seguras
    if (firebaseInstance) {
        window.firebaseDB = {
            database: firebaseInstance.database,
            
            // Guardar código en Firebase
            saveCode: async function(code, planType, subscriptionId, planConfig) {
                if (!this.validateCode(code)) {
                    throw new Error('Código inválido');
                }
                
                const expirationDate = getExpirationDate(planConfig.days);
                const clientInfo = getClientInfo();
                
                const codeData = sanitizeData({
                    IsUsed: false,
                    Type: planType,
                    SubscriptionId: subscriptionId,
                    CreatedAt: firebase.database.ServerValue.TIMESTAMP,
                    Plan: planConfig.name,
                    Price: planConfig.price,
                    DurationDays: planConfig.days,
                    UsedBy: "",
                    UsedDate: 0,
                    ExpiresAt: expirationDate,
                    App: 'App-Animes',
                    Timestamp: new Date().toISOString(),
                    ClientInfo: clientInfo,
                    IPHash: await this.getIPHash()
                });
                
                try {
                    await firebaseInstance.database.ref('ActivationCodes/' + code).set(codeData);
                    console.log('✅ Código guardado con éxito:', code.substring(0, 8) + '...');
                    
                    // Registrar transacción
                    await this.logTransaction(code, planConfig, subscriptionId, clientInfo);
                    
                    return true;
                } catch (error) {
                    console.error('❌ Error guardando código:', error);
                    throw error;
                }
            },
            
            // Validar código
            validateCode: function(code) {
                return typeof code === 'string' && 
                       code.length === 20 && 
                       /^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{4}$/.test(code);
            },
            
            // Obtener hash de IP (simplificado)
            getIPHash: async function() {
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    
                    // Crear hash simple (en producción usaría backend)
                    const encoder = new TextEncoder();
                    const dataBuffer = encoder.encode(data.ip + 'salt_secreta');
                    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    
                    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
                } catch (error) {
                    console.warn('⚠️ No se pudo obtener IP, usando fallback');
                    return 'unknown_' + Date.now().toString(36);
                }
            },
            
            // Registrar transacción con logging seguro
            logTransaction: async function(code, planConfig, subscriptionId, clientInfo) {
                const logData = sanitizeData({
                    code: code.substring(0, 8) + '...',
                    plan: planConfig.name,
                    price: planConfig.price,
                    subscriptionId: subscriptionId.substring(0, 20),
                    timestamp: new Date().toISOString(),
                    app: 'App-Animes',
                    status: 'completed',
                    client: clientInfo
                });
                
                const logId = Date.now().toString(36) + '_' + 
                            Math.random().toString(36).substr(2, 4);
                
                try {
                    await firebaseInstance.database.ref('TransactionLogs/' + logId).set(logData);
                    console.log('📝 Transacción registrada:', logId);
                } catch (error) {
                    console.error('❌ Error registrando transacción:', error);
                    // No arrojar error para no afectar flujo principal
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
        
        // Función de fallback
        window.firebaseDB = {
            saveCode: async function() {
                throw new Error('Firebase no disponible');
            },
            validateCode: function() { return false; },
            checkCodeExists: async function() { return false; }
        };
        
        window.generatePremiumCode = function() {
            return 'ERROR-NO-FIREBASE';
        };
    }
    
    // 🔒 Protección adicional
    Object.freeze(window.firebaseDB);
    
})();
