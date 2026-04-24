(function() {
    'use strict';

    // Configuración de planes con los NUEVOS IDs
    const PLANS = {
        mensual: {
            name: '1 Mes',
            price: 2.99,
            priceFormatted: '$2.99',
            days: 30,
            plan_id: 'P-2UR88313VV523743JNG4WMAQ',  // ✅ NUEVO ID
            prefix: 'M'
        },
        '3meses': {
            name: '3 Meses',
            price: 7.99,
            priceFormatted: '$7.99',
            days: 90,
            plan_id: 'P-65Y77926TJ7680700NG4WOJI',  // ✅ NUEVO ID
            prefix: 'T'
        },
        year: {
            name: '1 Año',
            price: 24.99,
            priceFormatted: '$24.99',
            days: 365,
            plan_id: 'P-94K64420E70610916NG4WPKQ',  // ✅ NUEVO ID
            prefix: 'Y'
        }
    };

    console.log('🚀 SpayCineHD Premium - Planes actualizados');
    console.log('Plan Mensual ID:', PLANS.mensual.plan_id);
    console.log('Plan Trimestral ID:', PLANS['3meses'].plan_id);
    console.log('Plan Anual ID:', PLANS.year.plan_id);

    // Generar código premium
    function generateCode(planType) {
        const plan = PLANS[planType];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = plan.prefix;
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    // Guardar en Firebase (si está disponible)
    async function saveToFirebase(code, planType, subscriptionId) {
        if (!window.firebaseDB) {
            console.log('Firebase no disponible, guardando localmente');
            return false;
        }
        
        const plan = PLANS[planType];
        const subscriptionData = {
            code: code,
            plan: plan.name,
            planType: planType,
            price: plan.price,
            subscriptionId: subscriptionId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'active'
        };
        
        try {
            await window.firebaseDB.ref('ActivationCodes/' + code).set(subscriptionData);
            await window.firebaseDB.ref('Transactions/' + subscriptionId).set(subscriptionData);
            console.log('✅ Datos guardados en Firebase');
            return true;
        } catch (error) {
            console.error('Error guardando en Firebase:', error);
            return false;
        }
    }

    // Mostrar modal con código
    function showCodeModal(code, planType) {
        const plan = PLANS[planType];
        const modal = document.getElementById('codeModal');
        if (!modal) return;
        
        document.getElementById('premiumCode').textContent = code;
        document.getElementById('planInfo').innerHTML = `
            <p><strong>Plan:</strong> ${plan.name}</p>
            <p><strong>Precio:</strong> ${plan.priceFormatted}</p>
            <p><strong>Duración:</strong> ${plan.days} días</p>
            <p style="color: #4caf50;">✅ Suscripción activada correctamente</p>
            <p style="color: #ff9800;">⚠️ Guarda este código para activar en la app</p>
        `;
        
        modal.style.display = 'block';
        
        document.getElementById('copyCode').onclick = () => {
            navigator.clipboard.writeText(code);
            alert('✅ Código copiado');
        };
        
        document.getElementById('closeModal').onclick = () => modal.style.display = 'none';
        document.querySelector('.close').onclick = () => modal.style.display = 'none';
        
        setTimeout(() => modal.style.display = 'none', 60000);
    }

    // Inicializar botones de PayPal
    function initPayPalButtons() {
        if (typeof paypal === 'undefined') {
            console.log('⏳ Esperando PayPal SDK...');
            setTimeout(initPayPalButtons, 500);
            return;
        }
        
        console.log('✅ PayPal SDK cargado');
        
        // Plan Mensual
        if (document.getElementById('paypal-button-container-mensual')) {
            paypal.Buttons({
                style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
                createSubscription: function(data, actions) {
                    console.log('💳 Creando suscripción: 1 Mes');
                    return actions.subscription.create({ plan_id: PLANS.mensual.plan_id });
                },
                onApprove: async function(data) {
                    console.log('✅ Suscripción 1 Mes aprobada:', data.subscriptionID);
                    const code = generateCode('mensual');
                    await saveToFirebase(code, 'mensual', data.subscriptionID);
                    showCodeModal(code, 'mensual');
                    alert(`🎉 ¡Suscripción exitosa!\n\nPlan: 1 Mes\nCódigo: ${code}`);
                },
                onError: function(err) {
                    console.error('Error en plan mensual:', err);
                    alert('Error al procesar el pago. Intenta de nuevo.');
                }
            }).render('#paypal-button-container-mensual');
        }
        
        // Plan 3 Meses
        if (document.getElementById('paypal-button-container-3meses')) {
            paypal.Buttons({
                style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
                createSubscription: function(data, actions) {
                    console.log('💳 Creando suscripción: 3 Meses');
                    return actions.subscription.create({ plan_id: PLANS['3meses'].plan_id });
                },
                onApprove: async function(data) {
                    console.log('✅ Suscripción 3 Meses aprobada:', data.subscriptionID);
                    const code = generateCode('3meses');
                    await saveToFirebase(code, '3meses', data.subscriptionID);
                    showCodeModal(code, '3meses');
                    alert(`🎉 ¡Suscripción exitosa!\n\nPlan: 3 Meses\nCódigo: ${code}`);
                },
                onError: function(err) {
                    console.error('Error en plan 3 meses:', err);
                    alert('Error al procesar el pago. Intenta de nuevo.');
                }
            }).render('#paypal-button-container-3meses');
        }
        
        // Plan 1 Año
        if (document.getElementById('paypal-button-container-year')) {
            paypal.Buttons({
                style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
                createSubscription: function(data, actions) {
                    console.log('💳 Creando suscripción: 1 Año');
                    return actions.subscription.create({ plan_id: PLANS.year.plan_id });
                },
                onApprove: async function(data) {
                    console.log('✅ Suscripción 1 Año aprobada:', data.subscriptionID);
                    const code = generateCode('year');
                    await saveToFirebase(code, 'year', data.subscriptionID);
                    showCodeModal(code, 'year');
                    alert(`🎉 ¡Suscripción exitosa!\n\nPlan: 1 Año\nCódigo: ${code}`);
                },
                onError: function(err) {
                    console.error('Error en plan anual:', err);
                    alert('Error al procesar el pago. Intenta de nuevo.');
                }
            }).render('#paypal-button-container-year');
        }
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPayPalButtons);
    } else {
        initPayPalButtons();
    }
})();
