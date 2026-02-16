// script.js - Versión ultra simplificada que funciona
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
                        
                        // Generar código INMEDIATAMENTE
                        const code = generateCode(planType);
                        
                        // MOSTRAR CÓDIGO INMEDIATAMENTE
                        showCode(code, planConfig);
                        
                        // Intentar guardar en Firebase (en segundo plano)
                        saveCodeToFirebase(code, planType, data.subscriptionID, planConfig)
                            .then(() => console.log('✅ Código guardado'))
                            .catch(err => console.log('⚠️ Firebase offline, código guardado localmente'));
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
    
    // ===== FUNCIONES PARA CÓDIGOS =====
    
    function generateCode(planType) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const random2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        const prefixes = {
            'mensual': 'ANM',
            '3meses': 'AN3',
            'year': 'ANY'
        };
        
        const prefix = prefixes[planType] || 'ANC';
        return `${prefix}${year}${month}${day}-${random}-${random2}`;
    }
    
    async function saveCodeToFirebase(code, planType, subscriptionId, planConfig) {
        // Intentar Firebase
        if (window.firebaseDB && window.firebaseDB.saveCode) {
            try {
                await window.firebaseDB.saveCode(code, planType, subscriptionId, planConfig);
                return true;
            } catch (e) {
                console.log('Firebase error, guardando local');
            }
        }
        
        // Guardar localmente
        const saved = JSON.parse(localStorage.getItem('premiumCodes') || '[]');
        saved.push({
            code: code,
            plan: planConfig.name,
            date: new Date().toISOString(),
            subscriptionId: subscriptionId
        });
        localStorage.setItem('premiumCodes', JSON.stringify(saved));
        return true;
    }
    
    // ===== FUNCIONES UI =====
    
    function showCode(code, planConfig) {
        console.log('🎫 Mostrando código:', code);
        
        // Buscar o crear modal
        let modal = document.getElementById('codeModal');
        
        if (!modal) {
            // Crear modal si no existe
            modal = document.createElement('div');
            modal.id = 'codeModal';
            modal.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                ">
                    <div style="
                        background: white;
                        padding: 30px;
                        border-radius: 15px;
                        max-width: 500px;
                        width: 90%;
                        text-align: center;
                        position: relative;
                        animation: slideIn 0.3s ease;
                    ">
                        <span onclick="this.parentElement.parentElement.parentElement.remove()" style="
                            position: absolute;
                            right: 15px;
                            top: 10px;
                            font-size: 28px;
                            cursor: pointer;
                        ">&times;</span>
                        
                        <h2 style="color: #4ecdc4; margin-bottom: 20px;">🎉 ¡Suscripción Exitosa!</h2>
                        
                        <div id="codeDisplay" style="
                            background: #f5f5f5;
                            padding: 20px;
                            border-radius: 10px;
                            font-family: monospace;
                            font-size: 24px;
                            letter-spacing: 2px;
                            margin: 20px 0;
                            border: 2px dashed #4ecdc4;
                            user-select: all;
                        ">${code}</div>
                        
                        <div id="planInfo" style="margin: 15px 0; padding: 15px; background: #e8f5e9; border-radius: 10px;">
                            <p><strong>Plan:</strong> ${planConfig.name}</p>
                            <p><strong>Precio:</strong> ${planConfig.price}</p>
                            <p><strong>Duración:</strong> ${planConfig.days} días</p>
                        </div>
                        
                        <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 10px; text-align: left;">
                            <p style="color: #856404;"><strong>📱 INSTRUCCIONES:</strong></p>
                            <ol style="color: #856404; margin-left: 20px;">
                                <li>Copia este código</li>
                                <li>Abre la app App-Animes</li>
                                <li>Ve a "Canjear Código"</li>
                                <li>Pega el código y activa</li>
                            </ol>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="copyCode('${code}')" style="
                                background: #4ecdc4;
                                color: white;
                                border: none;
                                padding: 12px 30px;
                                border-radius: 10px;
                                font-size: 16px;
                                cursor: pointer;
                                flex: 1;
                            ">📋 Copiar Código</button>
                            
                            <button onclick="this.closest('#codeModal').remove()" style="
                                background: #95a5a6;
                                color: white;
                                border: none;
                                padding: 12px 30px;
                                border-radius: 10px;
                                font-size: 16px;
                                cursor: pointer;
                            ">✅ Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Añadir animación
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateY(-100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        } else {
            // Actualizar modal existente
            modal.querySelector('#codeDisplay').textContent = code;
            modal.querySelector('#planInfo').innerHTML = `
                <p><strong>Plan:</strong> ${planConfig.name}</p>
                <p><strong>Precio:</strong> ${planConfig.price}</p>
                <p><strong>Duración:</strong> ${planConfig.days} días</p>
            `;
            modal.style.display = 'flex';
        }
        
        // Hacer función de copia global
        window.copyCode = function(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✅ Código copiado al portapapeles');
            }).catch(() => {
                prompt('Copia este código:', text);
            });
        };
    }
    
    // ===== INICIALIZACIÓN =====
    
    function initialize() {
        console.log('🚀 Iniciando...');
        
        // Verificar PayPal cada segundo
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
        
        // Configurar cierre de modal con ESC
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
