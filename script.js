// script.js - Versión simplificada y corregida
(function() {
    'use strict';
    
    // ===== CONFIGURACIÓN =====
    const PLANS_CONFIG = {
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
    };
    
    // ===== VARIABLES GLOBALES =====
    let currentTransaction = null;
    let modalCountdown = null;
    
    // ===== FUNCIÓN PRINCIPAL PARA INICIALIZAR PAYPAL =====
    function initializePayPalButtons() {
        console.log('🔄 Inicializando botones de PayPal...');
        
        // Verificar que PayPal esté cargado
        if (typeof paypal === 'undefined') {
            console.error('❌ PayPal no está cargado');
            setTimeout(initializePayPalButtons, 1000);
            return;
        }
        
        // Inicializar cada botón
        Object.keys(PLANS_CONFIG).forEach(planType => {
            const plan = PLANS_CONFIG[planType];
            initializeButton(plan, planType);
        });
    }
    
    function initializeButton(planConfig, planType) {
        const containerId = planConfig.containerId;
        
        try {
            paypal.Buttons({
                style: {
                    shape: 'rect',
                    color: 'gold',
                    layout: 'vertical',
                    label: 'subscribe'
                },
                
                createSubscription: function(data, actions) {
                    console.log('Creando suscripción para:', planConfig.name);
                    return actions.subscription.create({
                        plan_id: planConfig.paypalId
                    });
                },
                
                onApprove: async function(data, actions) {
                    console.log('✅ Pago aprobado:', data.subscriptionID);
                    
                    // Mostrar loading
                    showLoading('Generando tu código premium...');
                    
                    // Generar código
                    const code = generatePremiumCode(planType);
                    
                    // Guardar en Firebase
                    try {
                        await saveCodeToFirebase(code, planType, data.subscriptionID, planConfig);
                        console.log('✅ Código guardado en Firebase');
                    } catch (error) {
                        console.warn('⚠️ Error en Firebase, pero el código es válido:', error);
                    }
                    
                    // Ocultar loading y mostrar código
                    hideLoading();
                    showCodeModal(code, planConfig);
                },
                
                onError: function(err) {
                    console.error('❌ Error en PayPal:', err);
                    alert('Error en el proceso de pago. Por favor, intenta de nuevo.');
                },
                
                onCancel: function(data) {
                    console.log('⏹️ Pago cancelado');
                }
                
            }).render('#' + containerId);
            
            console.log(`✅ Botón para ${planConfig.name} renderizado`);
            
        } catch (error) {
            console.error(`❌ Error con botón ${planConfig.name}:`, error);
            
            // Mostrar mensaje en el contenedor
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; background: #ffebee; border-radius: 10px; text-align: center;">
                        <p>⚠️ Error cargando botón de pago</p>
                        <p>Recarga la página para intentar de nuevo</p>
                    </div>
                `;
            }
        }
    }
    
    // ===== FUNCIONES PARA CÓDIGOS =====
    
    function generatePremiumCode(planType) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const random2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const prefixes = {
            'mensual': 'ANIM1M',
            '3meses': 'ANIM3M',
            'year': 'ANIM1Y'
        };
        
        const prefix = prefixes[planType] || 'ANIMES';
        return `${prefix}-${timestamp}-${random}-${random2}`;
    }
    
    async function saveCodeToFirebase(code, planType, subscriptionId, planConfig) {
        // Usar window.firebaseDB si está disponible
        if (window.firebaseDB && window.firebaseDB.saveCode) {
            return await window.firebaseDB.saveCode(code, planType, subscriptionId, planConfig);
        }
        
        // Fallback: guardar en localStorage
        const codes = JSON.parse(localStorage.getItem('premiumCodes') || '[]');
        codes.push({
            code: code,
            plan: planConfig.name,
            date: new Date().toISOString(),
            subscriptionId: subscriptionId
        });
        localStorage.setItem('premiumCodes', JSON.stringify(codes));
        
        return true;
    }
    
    // ===== FUNCIONES DE UI =====
    
    function showLoading(message) {
        const loading = document.createElement('div');
        loading.id = 'loadingOverlay';
        loading.innerHTML = `
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
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                ">
                    <div class="spinner" style="
                        width: 50px;
                        height: 50px;
                        border: 5px solid #f3f3f3;
                        border-top: 5px solid #4ecdc4;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(loading);
        
        // Añadir estilo para la animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    function hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) loading.remove();
    }
    
    function showCodeModal(code, planConfig) {
        const modal = document.getElementById('codeModal');
        const codeElement = document.getElementById('premiumCode');
        const planInfo = document.getElementById('planInfo');
        
        if (!modal || !codeElement) {
            // Fallback si no hay modal
            alert(`¡Suscripción exitosa!\n\nTu código premium es:\n${code}\n\nPlan: ${planConfig.name}\n\nGuarda este código para activar la app.`);
            return;
        }
        
        codeElement.textContent = code;
        planInfo.innerHTML = `
            <p><strong>Plan:</strong> ${planConfig.name}</p>
            <p><strong>Precio:</strong> ${planConfig.price}</p>
            <p><strong>Válido por:</strong> ${planConfig.days} días</p>
        `;
        
        modal.style.display = 'block';
        
        // Auto-cerrar después de 5 minutos
        let seconds = 300;
        const countdown = document.getElementById('countdown');
        
        if (modalCountdown) clearInterval(modalCountdown);
        
        modalCountdown = setInterval(() => {
            seconds--;
            if (countdown) countdown.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(modalCountdown);
                modal.style.display = 'none';
            }
        }, 1000);
    }
    
    // ===== EVENT LISTENERS =====
    
    function setupEventListeners() {
        // Cerrar modal
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('codeModal').style.display = 'none';
                if (modalCountdown) clearInterval(modalCountdown);
            });
        }
        
        // Copiar código
        const copyBtn = document.getElementById('copyCode');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                const code = document.getElementById('premiumCode').textContent;
                
                navigator.clipboard.writeText(code).then(() => {
                    this.textContent = '✅ ¡Copiado!';
                    setTimeout(() => {
                        this.textContent = '📋 Copiar Código';
                    }, 2000);
                }).catch(() => {
                    alert('Código: ' + code);
                });
            });
        }
        
        // Cerrar modal con botón
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('codeModal').style.display = 'none';
                if (modalCountdown) clearInterval(modalCountdown);
            });
        }
    }
    
    // ===== INICIALIZACIÓN =====
    
    function initialize() {
        console.log('🚀 Inicializando app...');
        
        // Configurar event listeners
        setupEventListeners();
        
        // Esperar a que PayPal esté listo
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkPayPal = setInterval(() => {
            attempts++;
            
            if (typeof paypal !== 'undefined') {
                clearInterval(checkPayPal);
                console.log('✅ PayPal SDK detectado');
                
                // Pequeño retraso para asegurar que el DOM está listo
                setTimeout(() => {
                    initializePayPalButtons();
                }, 500);
                
            } else if (attempts >= maxAttempts) {
                clearInterval(checkPayPal);
                console.error('❌ PayPal SDK no cargado después de', maxAttempts, 'intentos');
                
                // Mostrar mensaje de error
                document.querySelectorAll('.paypal-button-wrapper').forEach(wrapper => {
                    wrapper.innerHTML = `
                        <div style="padding: 20px; background: #ffebee; border-radius: 10px; text-align: center;">
                            <p>⚠️ Error cargando PayPal</p>
                            <p>Por favor, recarga la página</p>
                        </div>
                    `;
                });
            }
        }, 1000);
    }
    
    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();

