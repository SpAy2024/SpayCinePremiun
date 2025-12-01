// script.js - Con medidas de seguridad mejoradas
(function() {
    'use strict';
    
    // ===== CONFIGURACIÓN Y CONSTANTES =====
    const PLANS_CONFIG = Object.freeze({
        'mensual': {
            name: '1 Mes',
            price: '$2.99',
            days: 30,
            paypalId: 'P-18381349AF867540CNEVSH5I',
            containerId: 'paypal-button-container-P-18381349AF867540CNEVSH5I'
        },
        '3meses': {
            name: '3 Meses', 
            price: '$7.99',
            days: 90,
            paypalId: 'P-5PP81994FM215525RNEVSJFA',
            containerId: 'paypal-button-container-P-5PP81994FM215525RNEVSJFA'
        },
        'year': {
            name: '1 Año',
            price: '$24.99', 
            days: 365,
            paypalId: 'P-3E203769WC9540323NEVSJ5Q',
            containerId: 'paypal-button-container-P-3E203769WC9540323NEVSJ5Q'
        }
    });
    
    // ===== VARIABLES GLOBALES SEGURAS =====
    let currentTransaction = null;
    let modalCountdown = null;
    const MAX_ATTEMPTS = 3;
    let attemptCount = 0;
    
    // ===== FUNCIONES DE SEGURIDAD =====
    
    // Validar que PayPal esté cargado
    function validatePayPal() {
        if (typeof paypal === 'undefined') {
            throw new Error('PayPal SDK no está cargado');
        }
        return true;
    }
    
    // Validar datos del plan
    function validatePlanConfig(planType) {
        const plan = PLANS_CONFIG[planType];
        if (!plan) {
            throw new Error(`Plan ${planType} no configurado`);
        }
        
        // Validar formato del ID de PayPal
        if (!plan.paypalId || !plan.paypalId.startsWith('P-')) {
            console.warn('⚠️ ID de PayPal con formato inusual:', plan.paypalId);
        }
        
        return plan;
    }
    
    // Detectar entorno
    function detectEnvironment() {
        return {
            isLocalhost: ['localhost', '127.0.0.1', ''].includes(window.location.hostname),
            isSecure: window.location.protocol === 'https:',
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        };
    }
    
    // Sanitizar entrada de usuario
    function sanitizeInput(input, maxLength = 100) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .substring(0, maxLength)
            .replace(/[<>"']/g, '')
            .trim();
    }
    
    // ===== FUNCIONES PRINCIPALES =====
    
    // Inicializar todos los botones de PayPal
    function initializePayPalButtons() {
        console.log('🔄 Inicializando botones de PayPal...');
        
        try {
            validatePayPal();
            
            Object.keys(PLANS_CONFIG).forEach(planType => {
                const planConfig = validatePlanConfig(planType);
                initializePayPalButton(planConfig, planType);
            });
            
            console.log('✅ Botones de PayPal inicializados correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando PayPal:', error);
            showErrorModal('Error de configuración de pago. Por favor, recarga la página.');
        }
    }
    
    // Inicializar un botón de PayPal específico
    function initializePayPalButton(planConfig, planType) {
        try {
            paypal.Buttons({
                style: {
                    shape: 'rect',
                    color: 'gold',
                    layout: 'vertical',
                    label: 'subscribe',
                    height: 50,
                    tagline: false
                },
    
                createSubscription: function(data, actions) {
                    console.log(`🔄 Creando suscripción: ${planConfig.name}`);
                    
                    // Validar límite de intentos
                    if (attemptCount >= MAX_ATTEMPTS) {
                        throw new Error('Demasiados intentos. Por favor, espera unos minutos.');
                    }
                    
                    attemptCount++;
                    
                    return actions.subscription.create({
                        plan_id: planConfig.paypalId,
                        application_context: {
                            brand_name: 'App-Animes Premium',
                            locale: 'es-ES',
                            shipping_preference: 'NO_SHIPPING',
                            user_action: 'SUBSCRIBE_NOW',
                            return_url: window.location.href,
                            cancel_url: window.location.href
                        }
                    });
                },
    
                onApprove: function(data, actions) {
                    console.log('✅ Suscripción aprobada:', {
                        id: data.subscriptionID,
                        plan: planConfig.name
                    });
                    
                    currentTransaction = {
                        subscriptionId: data.subscriptionID,
                        planType: planType,
                        timestamp: Date.now(),
                        status: 'approved'
                    };
                    
                    // Mostrar loading con seguridad
                    showLoading('Generando tu código premium seguro...');
                    
                    // Generar y guardar código premium con retry
                    generateAndSavePremiumCode(planType, data.subscriptionID, planConfig)
                        .then(success => {
                            if (!success) {
                                throw new Error('Error generando código');
                            }
                        })
                        .catch(error => {
                            console.error('❌ Error en proceso:', error);
                            hideLoading();
                            showErrorModal('Error procesando tu suscripción. Contacta soporte: servidor2appspay@gmail.com');
                        });
                },
    
                onError: function(err) {
                    console.error('❌ Error en PayPal:', err);
                    
                    // Log del error
                    logError('PAYPAL_ERROR', {
                        error: err.toString(),
                        plan: planConfig.name,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Mostrar error amigable
                    setTimeout(() => {
                        showErrorModal(
                            'Error en el proceso de pago. ' +
                            'Por favor, verifica tus datos o intenta con otro método de pago.'
                        );
                    }, 1000);
                },
    
                onCancel: function(data) {
                    console.log('⏹️ Pago cancelado:', {
                        plan: planConfig.name,
                        reason: data
                    });
                    
                    // Resetear contador de intentos
                    attemptCount = Math.max(0, attemptCount - 1);
                    
                    showTemporaryMessage(
                        'Suscripción cancelada. Puedes intentar nuevamente cuando lo desees.',
                        'info'
                    );
                },
    
                onClick: function() {
                    console.log('🖱️ Click en PayPal para plan:', planConfig.name);
                    
                    // Prevenir doble clic
                    const now = Date.now();
                    if (currentTransaction && (now - currentTransaction.timestamp) < 5000) {
                        console.warn('⚠️ Click muy rápido, ignorando');
                        return false;
                    }
                }
    
            }).render('#' + planConfig.containerId);
            
        } catch (error) {
            console.error(`❌ Error creando botón para ${planConfig.name}:`, error);
            
            // Mostrar mensaje de error en el contenedor
            const container = document.getElementById(planConfig.containerId);
            if (container) {
                container.innerHTML = `
                    <div class="error-container" style="
                        padding: 20px;
                        background: #ffebee;
                        border: 2px solid #f44336;
                        border-radius: 10px;
                        text-align: center;
                        color: #c62828;
                    ">
                        <p>⚠️ Error cargando botón de pago</p>
                        <p>Por favor, recarga la página o contacta soporte</p>
                    </div>
                `;
            }
        }
    }
    
    // Generar y guardar código premium
    async function generateAndSavePremiumCode(planType, subscriptionId, planConfig) {
        try {
            // Validar parámetros
            if (!subscriptionId || subscriptionId.length < 10) {
                throw new Error('ID de suscripción inválido');
            }
            
            // Generar código seguro
            const premiumCode = window.generatePremiumCode(planType);
            
            if (!premiumCode || premiumCode === 'ERROR-NO-FIREBASE') {
                throw new Error('Error generando código');
            }
            
            // Verificar que el código no exista (prevención de colisiones)
            if (window.firebaseDB && window.firebaseDB.checkCodeExists) {
                const exists = await window.firebaseDB.checkCodeExists(premiumCode);
                if (exists) {
                    console.warn('⚠️ Colisión de código detectada, regenerando...');
                    return generateAndSavePremiumCode(planType, subscriptionId, planConfig);
                }
            }
            
            // Guardar en Firebase
            const saveSuccess = await window.firebaseDB.saveCode(
                premiumCode, 
                planType, 
                subscriptionId, 
                planConfig
            );
            
            if (!saveSuccess) {
                throw new Error('Error guardando código en base de datos');
            }
            
            // Mostrar modal con código
            hideLoading();
            showPremiumCodeModal(premiumCode, planConfig);
            
            // Resetear contador de intentos
            attemptCount = 0;
            
            return true;
            
        } catch (error) {
            console.error('❌ Error en generateAndSavePremiumCode:', error);
            hideLoading();
            
            // Intentar mostrar código de respaldo si hay error de Firebase
            if (error.message.includes('Firebase') || error.message.includes('base de datos')) {
                const backupCode = generateBackupCode(planType);
                showPremiumCodeModal(backupCode, planConfig);
                showTemporaryMessage(
                    '⚠️ Usando código de respaldo. Contacta soporte para validación.',
                    'warning'
                );
                return false;
            }
            
            throw error;
        }
    }
    
    // Generar código de respaldo
    function generateBackupCode(planType) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        const prefixes = {
            'mensual': 'BACKUP1M',
            '3meses': 'BACKUP3M',
            'year': 'BACKUP1Y'
        };
        
        return `${prefixes[planType] || 'BACKUP'}-${timestamp}-${random}`;
    }
    
    // ===== FUNCIONES DE UI =====
    
    // Mostrar modal con código
    function showPremiumCodeModal(code, planConfig) {
        try {
            const modal = document.getElementById('codeModal');
            const codeElement = document.getElementById('premiumCode');
            const planInfoElement = document.getElementById('planInfo');
            
            if (!modal || !codeElement) {
                throw new Error('Elementos del modal no encontrados');
            }
            
            // Sanitizar y mostrar código
            codeElement.textContent = sanitizeInput(code);
            
            // Mostrar información del plan
            planInfoElement.innerHTML = `
                <p><strong>Plan:</strong> ${sanitizeInput(planConfig.name)}</p>
                <p><strong>Precio:</strong> ${sanitizeInput(planConfig.price)}</p>
                <p><strong>Duración:</strong> ${planConfig.days} días</p>
                <p><strong>ID Suscripción:</strong> ${planConfig.paypalId.substring(0, 10)}...</p>
            `;
            
            // Mostrar modal
            modal.style.display = 'block';
            
            // Iniciar contador de cierre automático
            startAutoCloseTimer();
            
            // Registrar evento
            logEvent('MODAL_SHOWN', { plan: planConfig.name });
            
        } catch (error) {
            console.error('❌ Error mostrando modal:', error);
            
            // Fallback: mostrar código en alerta
            alert(`Tu código premium es: ${code}\n\nPlan: ${planConfig.name}\n\n⚠️ IMPORTANTE: Copia este código y pégalo en la app App-Animes en la sección "Canjear Código"`);
        }
    }
    
    // Iniciar temporizador de cierre automático
    function startAutoCloseTimer() {
        let seconds = 300; // 5 minutos
        
        if (modalCountdown) {
            clearInterval(modalCountdown);
        }
        
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;
        
        modalCountdown = setInterval(() => {
            seconds--;
            countdownElement.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(modalCountdown);
                closeModal();
                
                showTemporaryMessage(
                    'El modal se cerró automáticamente por seguridad. ' +
                    'Si necesitas ver el código nuevamente, contacta soporte.',
                    'info'
                );
            }
        }, 1000);
    }
    
    // Cerrar modal
    function closeModal() {
        const modal = document.getElementById('codeModal');
        if (modal) {
            modal.style.display = 'none';
            
            if (modalCountdown) {
                clearInterval(modalCountdown);
                modalCountdown = null;
            }
        }
    }
    
    // Mostrar loading
    function showLoading(message) {
        hideLoading(); // Limpiar cualquier loading previo
        
        const loading = document.createElement('div');
        loading.id = 'globalLoading';
        loading.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${sanitizeInput(message)}</p>
                <p style="font-size: 12px; opacity: 0.7; margin-top: 10px;">
                    🔒 Procesando transacción segura...
                </p>
            </div>
        `;
        
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;
        
        document.body.appendChild(loading);
        document.body.style.overflow = 'hidden';
    }
    
    // Ocultar loading
    function hideLoading() {
        const loading = document.getElementById('globalLoading');
        if (loading) {
            loading.remove();
        }
        document.body.style.overflow = '';
    }
    
    // Mostrar mensaje temporal
    function showTemporaryMessage(message, type = 'info') {
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        
        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = `
            <div style="
                padding: 15px 20px;
                background: ${colors[type]};
                color: white;
                border-radius: 10px;
                margin: 10px;
                font-weight: bold;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease;
            ">
                ${sanitizeInput(message)}
            </div>
        `;
        
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9998;
            max-width: 400px;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 5000);
    }
    
    // Mostrar modal de error
    function showErrorModal(message) {
        hideLoading();
        
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                padding: 20px;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    max-width: 500px;
                    width: 100%;
                    text-align: center;
                    border: 3px solid #f44336;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <h2 style="color: #f44336; margin-bottom: 20px;">⚠️ Error</h2>
                    <p style="margin-bottom: 25px; color: #333;">${sanitizeInput(message)}</p>
                    <div style="
                        background: #ffebee;
                        padding: 15px;
                        border-radius: 10px;
                        margin: 20px 0;
                        text-align: left;
                        font-size: 14px;
                    ">
                        <p><strong>📧 Soporte:</strong> servidor2appspay@gmail.com</p>
                        <p><strong>🕒 Horario:</strong> 24/7</p>
                    </div>
                    <button id="closeErrorModal" style="
                        background: #f44336;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 10px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        modal.id = 'errorModal';
        document.body.appendChild(modal);
        
        // Evento para cerrar
        document.getElementById('closeErrorModal').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // ===== LOGGING Y MONITOREO =====
    
    function logEvent(eventName, data = {}) {
        const env = detectEnvironment();
        const logData = {
            event: eventName,
            ...data,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100),
            environment: env
        };
        
        console.log(`📊 EVENTO: ${eventName}`, logData);
        
        // Enviar a Firebase si está disponible
        if (window.firebaseDB && window.firebaseDB.database) {
            try {
                const logRef = window.firebaseDB.database().ref('EventLogs/' + Date.now());
                logRef.set(logData).catch(err => {
                    console.error('❌ Error logueando evento:', err);
                });
            } catch (error) {
                // Silenciar errores de logging
            }
        }
    }
    
    function logError(errorType, errorData = {}) {
        logEvent('ERROR', {
            type: errorType,
            ...errorData,
            attemptCount,
            currentTransaction
        });
    }
    
    // ===== EVENT LISTENERS =====
    
    function setupEventListeners() {
        // Cerrar modal con X
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        // Cerrar modal con botón
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }
        
        // Copiar código
        const copyBtn = document.getElementById('copyCode');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                const codeElement = document.getElementById('premiumCode');
                if (!codeElement) return;
                
                const code = codeElement.textContent;
                
                navigator.clipboard.writeText(code).then(() => {
                    // Éxito
                    const originalText = this.textContent;
                    this.textContent = '✅ ¡Copiado!';
                    this.style.background = 'linear-gradient(45deg, #27ae60, #219653)';
                    
                    showTemporaryMessage('Código copiado al portapapeles', 'success');
                    logEvent('CODE_COPIED');
                    
                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.background = 'linear-gradient(45deg, #4ecdc4, #44a08d)';
                    }, 2000);
                    
                }).catch(() => {
                    // Fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = code;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    
                    try {
                        document.execCommand('copy');
                        this.textContent = '✅ ¡Copiado!';
                        setTimeout(() => {
                            this.textContent = '📋 Copiar Código';
                        }, 2000);
                    } catch (err) {
                        showTemporaryMessage('Error copiando código', 'error');
                    }
                    
                    document.body.removeChild(textArea);
                });
            });
        }
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('codeModal');
            if (event.target === modal) {
                closeModal();
            }
        });
        
        // Efectos hover para tarjetas
        document.querySelectorAll('.plan-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
            
            // Prevenir clics rápidos
            card.addEventListener('click', function(e) {
                const now = Date.now();
                if (this.lastClick && (now - this.lastClick) < 1000) {
                    e.stopPropagation();
                    return;
                }
                this.lastClick = now;
            });
        });
        
        // Prevenir F5 y Ctrl+R
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
                e.preventDefault();
                showTemporaryMessage('Por favor, usa los controles de la página para actualizar', 'warning');
                return false;
            }
        });
    }
    
    // ===== INICIALIZACIÓN =====
    
    function initializeApp() {
        console.log('🚀 Inicializando App-Animes Premium...');
        
        const env = detectEnvironment();
        console.log('🌍 Entorno:', env);
        
        if (!env.isSecure && !env.isLocalhost) {
            console.warn('⚠️ Conexión no segura detectada');
            showTemporaryMessage('Se recomienda usar HTTPS para mayor seguridad', 'warning');
        }
        
        // Configurar listeners
        setupEventListeners();
        
        // Esperar a que PayPal esté listo
        const checkPayPal = setInterval(() => {
            if (typeof paypal !== 'undefined') {
                clearInterval(checkPayPal);
                
                // Esperar un poco más para asegurar
                setTimeout(() => {
                    initializePayPalButtons();
                    logEvent('APP_INITIALIZED', { env });
                }, 1000);
            }
        }, 100);
        
        // Timeout de seguridad
        setTimeout(() => {
            if (typeof paypal === 'undefined') {
                console.error('❌ Timeout cargando PayPal');
                showErrorModal(
                    'Error cargando sistema de pago. ' +
                    'Por favor, verifica tu conexión a internet o desactiva bloqueadores.'
                );
            }
        }, 10000);
    }
    
    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
    
    // ===== FUNCIONES GLOBALES =====
    
    window.appSecurity = {
        getCurrentTransaction: () => ({ ...currentTransaction }),
        getAttemptCount: () => attemptCount,
        resetAttempts: () => { attemptCount = 0; },
        closeAllModals: () => {
            closeModal();
            const errorModal = document.getElementById('errorModal');
            if (errorModal) errorModal.remove();
            hideLoading();
        }
    };
    
})();
