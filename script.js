// script.js
(function() {
    'use strict';
    
    // Configuración de planes
    const PLANS_CONFIG = {
        'mensual': {
            name: '1 Mes',
            price: '$2.99',
            days: 30,
            type: 'mensual',
            paypalId: 'P-2UR88313VV523743JNG4WMAQ',
            containerId: 'paypal-button-container-P-2UR88313VV523743JNG4WMAQ'
        },
        '3meses': {
            name: '3 Meses', 
            price: '$7.99',
            days: 90,
            type: '3meses',
            paypalId: 'P-65Y77926TJ7680700NG4WOJI',
            containerId: 'paypal-button-container-P-65Y77926TJ7680700NG4WOJI'
        },
        'year': {
            name: '1 Año',
            price: '$24.99', 
            days: 365,
            type: 'year',
            paypalId: 'P-94K64420E70610916NG4WPKQ',
            containerId: 'paypal-button-container-P-94K64420E70610916NG4WPKQ'
        }
    };
    
    console.log('🚀 SpayCineHD - Sistema de pagos listo');
    
    function initializePayPalButtons() {
        if (typeof paypal === 'undefined') {
            setTimeout(initializePayPalButtons, 1000);
            return;
        }
        
        console.log('✅ PayPal conectado en MODO PRODUCCIÓN');
        
        Object.keys(PLANS_CONFIG).forEach(planType => {
            const plan = PLANS_CONFIG[planType];
            
            paypal.Buttons({
                style: { 
                    shape: 'rect', 
                    color: 'gold', 
                    layout: 'vertical', 
                    label: 'subscribe' 
                },
                
                createSubscription: function(data, actions) {
                    console.log(`Procesando pago: ${plan.name}`);
                    return actions.subscription.create({ 
                        plan_id: plan.paypalId 
                    });
                },
                
                onApprove: function(data, actions) {
                    console.log(`✅ Pago aprobado:`, data.subscriptionID);
                    
                    // Generar código único
                    const code = generateCode(plan.type);
                    
                    // Guardar en Firebase
                    if (window.firebaseDB) {
                        window.firebaseDB.saveCode(code, plan, data.subscriptionID)
                            .then(() => {
                                console.log('✅ Código guardado en Firebase');
                                showCode(code, plan);
                            })
                            .catch(() => {
                                console.log('⚠️ Error en Firebase, mostrando código igual');
                                showCode(code, plan, true);
                            });
                    } else {
                        showCode(code, plan, true);
                    }
                },
                
                onError: function(err) {
                    console.error('Error:', err);
                    alert('Error en el pago. Por favor, intenta de nuevo.');
                }
                
            }).render('#' + plan.containerId);
            
            console.log(`✅ Botón ${plan.name} listo`);
        });
    }
    
    function generateCode(planType) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        let length = planType === 'year' ? 9 : 7;
        
        for (let i = 0; i < length; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        
        // Asegurar que empiece con letra
        if (/^[0-9]/.test(code)) {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            code = letters[Math.floor(Math.random() * letters.length)] + code.substring(1);
        }
        
        return code;
    }
    
    function showCode(code, plan, offline = false) {
        const modal = document.getElementById('codeModal');
        if (!modal) return;
        
        // Mostrar código
        document.getElementById('premiumCode').textContent = code;
        document.getElementById('planInfo').innerHTML = `
            <p><strong>Plan:</strong> ${plan.name}</p>
            <p><strong>Precio:</strong> ${plan.price}</p>
            <p><strong>Duración:</strong> ${plan.days} días</p>
            ${offline ? '<p style="color: #ff9800;">⚠️ Modo offline - código guardado localmente</p>' : ''}
        `;
        
        modal.style.display = 'block';
        
        // Botón copiar
        document.getElementById('copyCode').onclick = () => {
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
        
        // Cerrar modal
        document.getElementById('closeModal').onclick = () => modal.style.display = 'none';
        document.querySelector('.close').onclick = () => modal.style.display = 'none';
        
        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
        
        // Countdown de 5 minutos
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
    
    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePayPalButtons);
    } else {
        initializePayPalButtons();
    }
    
})();
