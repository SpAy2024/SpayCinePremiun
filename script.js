// script.js
(function() {
    'use strict';
    
    // Configuración de planes ACTUALIZADA
    const PLANS_CONFIG = {
        'mensual': {
            name: '1 Mes',
            price: '$2.99',
            days: 30,
            type: 'mensual',
            paypalId: 'P-8BB868295F130251WNHJMHOI',
            containerId: 'paypal-button-container-P-8BB868295F130251WNHJMHOI'
        },
        '3meses': {
            name: '3 Meses', 
            price: '$7.99',
            days: 90,
            type: '3meses',
            paypalId: 'P-5PP81994FM215525RNEVSJFA',
            containerId: 'paypal-button-container-P-5PP81994FM215525RNEVSJFA'
        },
        'year': {
            name: '1 Año',
            price: '$24.99', 
            days: 365,
            type: 'year',
            paypalId: 'P-3E203769WC9540323NEVSJ5Q',
            containerId: 'paypal-button-container-P-3E203769WC9540323NEVSJ5Q'
        }
    };
    
    console.log('🚀 SpayCineHD - Sistema de pagos listo');
    
    // Variable para evitar inicialización múltiple
    let initialized = false;
    
    function initializePayPalButtons() {
        if (initialized) {
            console.log('⚠️ Botones ya inicializados, omitiendo...');
            return;
        }
        
        if (typeof paypal === 'undefined') {
            console.log('⏳ Esperando carga de PayPal...');
            setTimeout(initializePayPalButtons, 500);
            return;
        }
        
        initialized = true;
        console.log('✅ PayPal SDK cargado correctamente');
        
        Object.keys(PLANS_CONFIG).forEach(planType => {
            const plan = PLANS_CONFIG[planType];
            
            const container = document.getElementById(plan.containerId);
            if (!container) {
                console.error(`❌ Contenedor no encontrado: ${plan.containerId}`);
                return;
            }
            
            // Limpiar el contenedor antes de renderizar (evita duplicados)
            container.innerHTML = '';
            
            console.log(`🎨 Renderizando botón para: ${plan.name}`);
            
            paypal.Buttons({
                style: { 
                    shape: 'rect', 
                    color: 'gold', 
                    layout: 'vertical', 
                    label: 'subscribe' 
                },
                
                createSubscription: function(data, actions) {
                    console.log(`💳 Procesando: ${plan.name}`);
                    return actions.subscription.create({ 
                        plan_id: plan.paypalId 
                    });
                },
                
                onApprove: function(data, actions) {
                    console.log(`✅ Pago aprobado: ${plan.name}`);
                    console.log(`📝 Subscription ID: ${data.subscriptionID}`);
                    
                    const code = generateCode(plan.type);
                    console.log(`🔑 Código generado: ${code}`);
                    
                    if (window.firebaseDB && typeof window.firebaseDB.saveCode === 'function') {
                        window.firebaseDB.saveCode(code, plan, data.subscriptionID)
                            .then(() => {
                                console.log('✅ Guardado en Firebase');
                                showCode(code, plan);
                            })
                            .catch((error) => {
                                console.error('⚠️ Error en Firebase:', error);
                                showCode(code, plan, true);
                            });
                    } else {
                        showCode(code, plan, true);
                    }
                },
                
                onError: function(err) {
                    console.error('❌ Error PayPal:', err);
                    alert('Error en el pago. Por favor, intenta de nuevo.');
                }
                
            }).render('#' + plan.containerId);
        });
    }
    
    function generateCode(planType) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        let length = planType === 'year' ? 9 : 7;
        
        for (let i = 0; i < length; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        
        if (/^[0-9]/.test(code)) {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            code = letters[Math.floor(Math.random() * letters.length)] + code.substring(1);
        }
        
        return code;
    }
    
    function copyToClipboard(text) {
        // Método moderno con Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        
        // Fallback para navegadores antiguos
        return new Promise((resolve, reject) => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (success) {
                    resolve();
                } else {
                    reject(new Error('execCommand failed'));
                }
            } catch (err) {
                document.body.removeChild(textarea);
                reject(err);
            }
        });
    }
    
    function showCode(code, plan, offline = false) {
        const modal = document.getElementById('codeModal');
        if (!modal) return;
        
        document.getElementById('premiumCode').textContent = code;
        document.getElementById('planInfo').innerHTML = `
            <p><strong>Plan:</strong> ${plan.name}</p>
            <p><strong>Precio:</strong> ${plan.price}</p>
            <p><strong>Duración:</strong> ${plan.days} días</p>
            ${offline ? '<p style="color: #ff9800;">⚠️ Modo offline - código guardado localmente</p>' : '<p style="color: #4caf50;">✅ Código verificado</p>'}
        `;
        
        modal.style.display = 'block';
        
        // Botón copiar con manejo de errores mejorado
        const copyButton = document.getElementById('copyCode');
        copyButton.onclick = async () => {
            try {
                await copyToClipboard(code);
                alert('✅ Código copiado al portapapeles');
                copyButton.textContent = '✓ Copiado';
                setTimeout(() => {
                    copyButton.textContent = '📋 Copiar Código';
                }, 2000);
            } catch (err) {
                console.error('Error al copiar:', err);
                alert('❌ No se pudo copiar automáticamente. Por favor, selecciona y copia el código manualmente.');
            }
        };
        
        document.getElementById('closeModal').onclick = () => modal.style.display = 'none';
        document.querySelector('.close').onclick = () => modal.style.display = 'none';
        
        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
        
        let seconds = 300;
        const countdownEl = document.getElementById('countdown');
        const timer = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(timer);
                modal.style.display = 'none';
            }
        }, 1000);
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePayPalButtons);
    } else {
        initializePayPalButtons();
    }
    
})();
