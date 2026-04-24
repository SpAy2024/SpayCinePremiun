// script.js - Versión final con PayPal + Firebase
(function() {
    'use strict';

    // Planes con sus IDs de PayPal
    const PLANS = {
        mensual: {
            name: '1 Mes',
            price: 2.99,
            priceFormatted: '$2.99',
            days: 30,
            plan_id: 'P-18381349AF867540CNEVSH5I',
            prefix: 'M'
        },
        '3meses': {
            name: '3 Meses',
            price: 7.99,
            priceFormatted: '$7.99',
            days: 90,
            plan_id: 'P-5PP81994FM215525RNEVSJFA',
            prefix: 'T'
        },
        year: {
            name: '1 Año',
            price: 24.99,
            priceFormatted: '$24.99',
            days: 365,
            plan_id: 'P-3E203769WC9540323NEVSJ5Q',
            prefix: 'Y'
        }
    };

    console.log('🚀 SpayCineHD Premium - Iniciando...');

    // Generar código único
    function generateCode(planType) {
        const plan = PLANS[planType];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = plan.prefix;
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    // Guardar en Firebase
    async function saveSubscription(code, planType, subscriptionId, email = null) {
        const plan = PLANS[planType];
        
        const subscriptionData = {
            code: code,
            plan: plan.name,
            planType: planType,
            price: plan.price,
            subscriptionId: subscriptionId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'active',
            isUsed: false
        };
        
        try {
            // Guardar en ActivationCodes
            await window.firebaseDB.ref('ActivationCodes/' + code).set(subscriptionData);
            
            // Guardar en Transactions
            await window.firebaseDB.ref('Transactions/' + subscriptionId).set({
                ...subscriptionData,
                email: email || 'pending@webhook.com'
            });
            
            console.log('✅ Suscripción guardada en Firebase');
            
            // Llamar al webhook (Cloud Function)
            if (typeof window.callPayPalWebhook === 'function') {
                await window.callPayPalWebhook({
                    subscription_id: subscriptionId,
                    plan_id: plan.plan_id,
                    plan_name: plan.name,
                    code: code,
                    amount: plan.price,
                    status: 'ACTIVE',
                    event_type: 'PAYPAL.SUBSCRIPTION.ACTIVATED'
                });
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error guardando:', error);
            return false;
        }
    }

    // Mostrar modal
    function showModal(code, planType) {
        const plan = PLANS[planType];
        const modal = document.getElementById('codeModal');
        
        document.getElementById('premiumCode').textContent = code;
        document.getElementById('planInfo').innerHTML = `
            <p><strong>Plan:</strong> ${plan.name}</p>
            <p><strong>Precio:</strong> ${plan.priceFormatted}</p>
            <p><strong>Duración:</strong> ${plan.days} días</p>
            <p style="color: #4caf50; margin-top: 10px;">✅ Suscripción activada correctamente</p>
            <p style="color: #ff9800; font-size: 0.9em;">⚠️ Guarda este código para activar tu cuenta en la app</p>
        `;
        
        modal.style.display = 'block';
        
        // Botón copiar
        document.getElementById('copyCode').onclick = async () => {
            try {
                await navigator.clipboard.writeText(code);
                alert('✅ Código copiado al portapapeles');
            } catch (err) {
                alert('❌ Copia manual: Selecciona el código y presiona Ctrl+C');
            }
        };
        
        // Botón cerrar
        document.getElementById('closeModal').onclick = () => modal.style.display = 'none';
        document.querySelector('.close').onclick = () => modal.style.display = 'none';
        
        // Cierre automático a los 60 segundos
        setTimeout(() => modal.style.display = 'none', 60000);
    }

    // Inicializar botones PayPal
    function initPayPal() {
        if (typeof paypal === 'undefined') {
            console.log('⏳ Esperando PayPal SDK...');
            setTimeout(initPayPal, 500);
            return;
        }
        
        console.log('✅ PayPal SDK cargado');
        
        Object.keys(PLANS).forEach(planType => {
            const plan = PLANS[planType];
            const container = document.getElementById(`paypal-button-container-${planType}`);
            if (!container) return;
            
            container.innerHTML = '';
            
            paypal.Buttons({
                style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
                
                createSubscription: (data, actions) => {
                    console.log(`💳 Creando suscripción: ${plan.name}`);
                    return actions.subscription.create({ plan_id: plan.plan_id });
                },
                
                onApprove: async (data) => {
                    console.log(`✅ Suscripción aprobada:`, data);
                    
                    const code = generateCode(planType);
                    await saveSubscription(code, planType, data.subscriptionID);
                    showModal(code, planType);
                    
                    alert(`🎉 ¡Suscripción exitosa!\n\nPlan: ${plan.name}\nCódigo: ${code}\n\nGuarda este código para activar tu cuenta.`);
                },
                
                onError: (err) => {
                    console.error(`❌ Error en ${plan.name}:`, err);
                    alert('Error al procesar el pago. Por favor intenta de nuevo.');
                }
                
            }).render(`#paypal-button-container-${planType}`);
        });
    }
    
    // Esperar Firebase y luego iniciar PayPal
    function waitForFirebase() {
        if (window.firebaseDB) {
            console.log('✅ Firebase listo');
            initPayPal();
        } else {
            console.log('⏳ Esperando Firebase...');
            setTimeout(waitForFirebase, 300);
        }
    }
    
    waitForFirebase();
})();