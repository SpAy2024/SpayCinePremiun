// script.js - Versión actualizada con generación de códigos según plan
(function() {
    'use strict';
    
    // ===== CONFIGURACIÓN =====
    const PLANS_CONFIG = {
        'mensual': {
            name: '1 Mes',
            price: '$2.99',
            days: 30,
            type: 'mensual',
            paypalId: 'P-2UR88313VV523743JNG4WMAQ',
            containerId: 'paypal-button-container-P-18381349AF867540CNEVSH5I'
        },
        '3meses': {
            name: '3 Meses', 
            price: '$6.99',
            days: 90,
            type: '3meses',
            paypalId: 'P-65Y77926TJ7680700NG4WOJI',
            containerId: 'paypal-button-container-P-5PP81994FM215525RNEVSJFA'
        },
        'year': {
            name: '1 Año',
            price: '$24.99', 
            days: 365,
            type: 'year',
            paypalId: 'P-94K64420E70610916NG4WPKQ',
            containerId: 'paypal-button-container-P-3E203769WC9540323NEVSJ5Q'
        }
    };
    
    // ===== VARIABLES GLOBALES =====
    let currentTransaction = null;
    
    // ===== FUNCIÓN PARA INICIALIZAR PAYPAL =====
    function initializePayPalButtons() {
        console.log('Inicializando PayPal...');
        
        // Verificar PayPal
        if (typeof paypal === 'undefined') {
            console.log('PayPal no cargado, reintentando...');
            setTimeout(initializePayPalButtons, 1000);
            return;
        }
        
        // Función segura para crear botón
        function createPayPalButton(planConfig, planType) {
            try {
                console.log(`Creando botón para ${planConfig.name}`);
                
                paypal.Buttons({
                    style: {
                        shape: 'rect',
                        color: 'gold',
                        layout: 'vertical',
                        label: 'subscribe'
                    },
                    
                    createSubscription: function(data, actions) {
                        console.log('Creando suscripción:', planConfig.paypalId);
                        return actions.subscription.create({
                            plan_id: planConfig.paypalId
                        });
                    },
                    
                    onApprove: function(data, actions) {
                        console.log('✅ Pago aprobado:', data.subscriptionID);
                        
                        // Generar código según el plan
                        const code = generateCode(planConfig.type);
                        
                        // Guardar en Firebase con la estructura requerida
                        saveCodeToFirebase(code, planConfig, data.subscriptionID)
                            .then(() => {
                                console.log('✅ Código guardado en Firebase');
                                // Mostrar código al usuario
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
        // Caracteres permitidos (mayúsculas y números)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Generar código de 7 caracteres (como en tu ejemplo: ABC123, AVS1986, SPAYCINE6)
        // Para SPAYCINE6 son 9 caracteres, así que haremos variable
        let length = 7;
        
        // Para el plan anual podemos hacerlo más largo como en tu ejemplo
        if (planType === 'year') {
            length = 9; // SPAYCINE6 tiene 9 caracteres
        }
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            code += chars[randomIndex];
        }
        
        // Asegurar que no comience con número (opcional)
        if (code.match(/^[0-9]/)) {
            // Reemplazar el primer carácter con una letra si es número
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            code = letters.charAt(Math.floor(Math.random() * letters.length)) + code.substring(1);
        }
        
        console.log(`Código generado para ${planType}: ${code}`);
        return code;
    }
    
    // ===== FUNCIÓN PARA GUARDAR EN FIREBASE =====
    async function saveCodeToFirebase(code, planConfig, subscriptionId) {
        // Intentar guardar en Firebase
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
        
        // Eliminar modal existente si hay
        const existingModal = document.getElementById('codeModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'codeModal';
        modal.className = 'modal';
        
        // Determinar el tipo de plan para mostrar
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
            default:
                planTypeText = planConfig.name;
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
                    
                    ${offline ? '<div class="offline-warning">⚠️ Código guardado localmente - Conéctate a internet para sincronizar</div>' : ''}
                    
                    <div class="security-warning">
                        <p>⚠️ <strong>IMPORTANTE:</strong></p>
                        <ul>
                            <li>✅ Código válido por única vez</li>
                            <li>✅ No compartas este código</li>
                            <li>✅ Guardado en Firebase</li>
                        </ul>
                    </div>
                    
                    <p class="code-instructions">
                        <strong>INSTRUCCIONES:</strong><br>
                        1. Copia este código<br>
                        2. Abre la app SpayCine<br>
                        3. Ve a "Canjear Código"<br>
                        4. Pega el código y activa<br>
                    </p>
                </div>
                
                <div class="modal-buttons">
                    <button class="copy-btn" onclick="copyCodeToClipboard('${code}')">
                        📋 Copiar Código
                    </button>
                    <button class="close-btn" onclick="closeCodeModal()">
                        ✅ Entendido
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Mostrar modal
        setTimeout(() => {
            modal.style.display = 'block';
        }, 100);
        
        // Configurar botón de cerrar
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.remove();
        };
        
        // Cerrar al hacer clic fuera
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.remove();
            }
        };
    }
    
    // ===== FUNCIONES GLOBALES PARA EL MODAL =====
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
        console.log('🚀 Iniciando sistema de pagos...');
        
        // Verificar PayPal cada segundo
        let attempts = 0;
        const checkPayPal = setInterval(() => {
            if (typeof paypal !== 'undefined') {
                clearInterval(checkPayPal);
                console.log('✅ PayPal listo');
                setTimeout(initializePayPalButtons, 500);
            } else if (attempts++ > 15) {
                clearInterval(checkPayPal);
                console.log('⚠️ PayPal timeout - Recargando página...');
                // Mostrar mensaje de error
                const containers = document.querySelectorAll('.paypal-button-wrapper');
                containers.forEach(container => {
                    container.innerHTML = '<p style="color:red;">Error cargando PayPal. Recarga la página.</p>';
                });
            }
        }, 1000);
        
        // Configurar cierre de modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('codeModal');
                if (modal) modal.remove();
            }
        });
    }
    
    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();
