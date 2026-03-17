// script.js - Versión actualizada con los nuevos Plan IDs de PayPal
(function() {
    'use strict';
    
    // ===== CONFIGURACIÓN CON LOS NUEVOS PLAN IDs =====
    const PLANS_CONFIG = {
        'mensual': {
            name: '1 Mes',
            price: '$2.99',
            days: 30,
            type: 'mensual',
            paypalId: 'P-2UR88313VV523743JNG4WMAQ', // ✅ NUEVO ID 1 MES
            containerId: 'paypal-button-container-P-2UR88313VV523743JNG4WMAQ'
        },
        '3meses': {
            name: '3 Meses', 
            price: '$7.99',
            days: 90,
            type: '3meses',
            paypalId: 'P-65Y77926TJ7680700NG4WOJI', // ✅ NUEVO ID 3 MESES
            containerId: 'paypal-button-container-P-65Y77926TJ7680700NG4WOJI'
        },
        'year': {
            name: '1 Año',
            price: '$24.99', 
            days: 365,
            type: 'year',
            paypalId: 'P-94K64420E70610916NG4WPKQ', // ✅ NUEVO ID 1 AÑO
            containerId: 'paypal-button-container-P-94K64420E70610916NG4WPKQ'
        }
    };
    
    // ===== VARIABLES GLOBALES =====
    let currentTransaction = null;
    
    // ===== FUNCIÓN PARA INICIALIZAR PAYPAL =====
    function initializePayPalButtons() {
        console.log('Inicializando PayPal con los nuevos Plan IDs...');
        console.log('Plan IDs:', {
            mensual: 'P-2UR88313VV523743JNG4WMAQ',
            '3meses': 'P-65Y77926TJ7680700NG4WOJI',
            year: 'P-94K64420E70610916NG4WPKQ'
        });
        
        // Verificar PayPal
        if (typeof paypal === 'undefined') {
            console.log('PayPal no cargado, reintentando...');
            setTimeout(initializePayPalButtons, 1000);
            return;
        }
        
        // Función para crear botón
        function createPayPalButton(planConfig, planType) {
            try {
                console.log(`Creando botón para ${planConfig.name} con ID: ${planConfig.paypalId}`);
                
                paypal.Buttons({
                    style: {
                        shape: 'rect',
                        color: 'gold',
                        layout: 'vertical',
                        label: 'subscribe'
                    },
                    
                    createSubscription: function(data, actions) {
                        console.log(`Creando suscripción para ${planConfig.name}:`, planConfig.paypalId);
                        return actions.subscription.create({
                            plan_id: planConfig.paypalId
                        });
                    },
                    
                    onApprove: function(data, actions) {
                        console.log(`✅ Pago aprobado para ${planConfig.name}:`, data.subscriptionID);
                        
                        // Generar código según el plan
                        const code = generateCode(planConfig.type);
                        
                        // Guardar en Firebase
                        saveCodeToFirebase(code, planConfig, data.subscriptionID)
                            .then(() => {
                                console.log('✅ Código guardado en Firebase:', code);
                                // Mostrar modal con el código
                                showCode(code, planConfig);
                            })
                            .catch(error => {
                                console.error('Error guardando en Firebase:', error);
                                // Aún así mostrar el código al usuario
                                showCode(code, planConfig, true);
                            });
                    },
                    
                    onError: function(err) {
                        console.error('Error PayPal:', err);
                        alert('Error en el pago. Por favor, intenta de nuevo.');
                    },
                    
                    onCancel: function() {
                        console.log('Pago cancelado');
                    }
                    
                }).render('#' + planConfig.containerId);
                
                console.log(`✅ Botón ${planConfig.name} listo`);
                
            } catch (error) {
                console.error(`Error con ${planConfig.name}:`, error);
                document.getElementById(planConfig.containerId).innerHTML = 
                    '<p style="color:red;padding:10px;">Error cargando botón</p>';
            }
        }
        
        // Crear todos los botones
        Object.keys(PLANS_CONFIG).forEach(planType => {
            createPayPalButton(PLANS_CONFIG[planType], planType);
        });
    }
    
    // ===== FUNCIÓN PARA GENERAR CÓDIGO =====
    function generateCode(planType) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Longitud según el plan
        let length = 7; // Por defecto 7 caracteres
        if (planType === 'year') {
            length = 9; // Para anual, 9 caracteres como SPAYCINE6
        }
        
        // Generar código aleatorio
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            code += chars[randomIndex];
        }
        
        // Asegurar que empiece con letra
        if (code.match(/^[0-9]/)) {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            code = letters.charAt(Math.floor(Math.random() * letters.length)) + code.substring(1);
        }
        
        console.log(`Código generado para ${planType}: ${code}`);
        return code;
    }
    
    // ===== FUNCIÓN PARA GUARDAR EN FIREBASE =====
    async function saveCodeToFirebase(code, planConfig, subscriptionId) {
        if (window.firebaseDB && window.firebaseDB.saveCode) {
            try {
                await window.firebaseDB.saveCode(code, planConfig, subscriptionId);
                return true;
            } catch (e) {
                console.error('Error en Firebase:', e);
                throw e;
            }
        } else {
            throw new Error('Firebase no disponible');
        }
    }
    
    // ===== FUNCIÓN PARA MOSTRAR CÓDIGO =====
    function showCode(code, planConfig, offline = false) {
        console.log('🎫 Mostrando código:', code);
        
        // Eliminar modal existente
        const existingModal = document.getElementById('codeModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'codeModal';
        modal.className = 'modal';
        
        // Texto del plan
        let planTypeText = '';
        switch(planConfig.type) {
            case 'mensual':
                planTypeText = 'Mensual';
                break;
            case '3meses':
                planTypeText = '3 Meses';
                break;
            case 'year':
                planTypeText = 'Anual';
                break;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>🎉 ¡Suscripción Exitosa!</h2>
                <div class="code-container">
                    <p>Tu código premium es:</p>
                    <div class="premium-code" id="premiumCodeDisplay">${code}</div>
                    
                    <div class="plan-info">
                        <p><strong>Plan:</strong> ${planConfig.name}</p>
                        <p><strong>Tipo:</strong> ${planTypeText}</p>
                        <p><strong>Precio:</strong> ${planConfig.price}</p>
                        <p><strong>Duración:</strong> ${planConfig.days} días</p>
                    </div>
                    
                    ${offline ? '<div class="offline-warning">⚠️ Código guardado localmente - Sincronizará cuando haya conexión</div>' : ''}
                    
                    <div class="security-warning">
                        <p>⚠️ <strong>IMPORTANTE:</strong></p>
                        <ul>
                            <li>✅ Código válido por única vez</li>
                            <li>✅ Guardado en Firebase</li>
                            <li>✅ No compartas este código</li>
                        </ul>
                    </div>
                    
                    <p class="code-instructions">
                        <strong>📱 INSTRUCCIONES:</strong><br>
                        1. Copia este código<br>
                        2. Abre la app SpayCine<br>
                        3. Ve a "Canjear Código"<br>
                        4. Pega el código y activa<br>
                    </p>
                </div>
                
                <div class="modal-buttons">
                    <button class="copy-btn" onclick="copyCodeToClipboard('${code}')">
                        📋 COPIAR CÓDIGO
                    </button>
                    <button class="close-btn" onclick="closeCodeModal()">
                        ✅ ENTENDIDO
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Mostrar modal
        setTimeout(() => {
            modal.style.display = 'block';
        }, 100);
        
        // Configurar cierre
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.remove();
        };
        
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.remove();
            }
        };
        
        // Auto-cerrar después de 5 minutos
        setTimeout(() => {
            if (document.getElementById('codeModal')) {
                document.getElementById('codeModal').remove();
            }
        }, 300000); // 5 minutos
    }
    
    // ===== FUNCIONES GLOBALES =====
    window.copyCodeToClipboard = function(code) {
        navigator.clipboard.writeText(code).then(() => {
            alert('✅ Código copiado al portapapeles');
        }).catch(() => {
            // Fallback para móviles
            const textarea = document.createElement('textarea');
            textarea.value = code;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('✅ Código copiado al portapapeles');
        });
    };
    
    window.closeCodeModal = function() {
        const modal = document.getElementById('codeModal');
        if (modal) {
            modal.remove();
        }
    };
    
    // ===== INICIALIZACIÓN =====
    function initialize() {
        console.log('🚀 Iniciando sistema de pagos con nuevos Plan IDs...');
        
        // Verificar PayPal
        let attempts = 0;
        const checkPayPal = setInterval(() => {
            if (typeof paypal !== 'undefined') {
                clearInterval(checkPayPal);
                console.log('✅ PayPal listo');
                setTimeout(initializePayPalButtons, 500);
            } else if (attempts++ > 15) {
                clearInterval(checkPayPal);
                console.log('⚠️ PayPal timeout');
            }
        }, 1000);
        
        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('codeModal');
                if (modal) modal.remove();
            }
        });
    }
    
    // Iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
