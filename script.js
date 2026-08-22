(function() {
    'use strict';

    // Los datos de precio/nombre son solo para MOSTRAR en la UI.
    // La verdad (precio, plan_id, código) vive en el servidor — el cliente
    // ya NO decide nada de eso.
    const PLANS = {
        mensual: { name: '1 Mes', priceFormatted: '$2.99', plan_id: 'P-18381349AF867540CNEVSH5I' },
        '3meses': { name: '3 Meses', priceFormatted: '$7.99', plan_id: 'P-5PP81994FM215525RNEVSJFA' },
        year: { name: '1 Año', priceFormatted: '$24.99', plan_id: 'P-3E203769WC9540323NEVSJ5Q' }
    };

    // Cambia esto por la URL real de tu backend en Render
    const API_BASE = 'https://TU-SERVIDOR.onrender.com';

    console.log('🚀 SpayCineFHD Premium - Planes cargados');

    // Pide al SERVIDOR que verifique el pago y active el código.
    // Ya no se genera nada en el navegador.
    async function activateSubscription(subscriptionId, planType) {
        const response = await fetch(`${API_BASE}/api/activate-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId, planType })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'No se pudo activar la suscripción');
        }

        return data; // { code, plan, expiresAt }
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

    function showError(message) {
        alert(`❌ ${message}\n\nSi ya pagaste y ves este error, contáctanos con tu ID de suscripción — no perdiste tu dinero.`);
    }

    // Maneja la aprobación de PayPal para cualquier plan
    async function handleApprove(data, planType, buttonLabel) {
        console.log(`✅ Suscripción ${buttonLabel} aprobada:`, data.subscriptionID);
        try {
            const result = await activateSubscription(data.subscriptionID, planType);
            showCodeModal(result.code, planType);
            alert(`🎉 ¡Suscripción exitosa!\n\nPlan: ${buttonLabel}\nCódigo: ${result.code}`);
        } catch (err) {
            console.error(`Error activando plan ${buttonLabel}:`, err);
            showError(err.message);
        }
    }

    function initPayPalButtons() {
        if (typeof paypal === 'undefined') {
            console.log('⏳ Esperando PayPal SDK...');
            setTimeout(initPayPalButtons, 500);
            return;
        }

        console.log('✅ PayPal SDK cargado');

        const buttonConfigs = [
            { containerId: 'paypal-button-container-mensual', planType: 'mensual', label: '1 Mes' },
            { containerId: 'paypal-button-container-3meses', planType: '3meses', label: '3 Meses' },
            { containerId: 'paypal-button-container-year', planType: 'year', label: '1 Año' }
        ];

        buttonConfigs.forEach(({ containerId, planType, label }) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            paypal.Buttons({
                style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
                createSubscription: function(data, actions) {
                    console.log(`💳 Creando suscripción: ${label}`);
                    return actions.subscription.create({ plan_id: PLANS[planType].plan_id });
                },
                onApprove: function(data) {
                    return handleApprove(data, planType, label);
                },
                onError: function(err) {
                    console.error(`Error en plan ${label}:`, err);
                    showError('Error al procesar el pago. Intenta de nuevo.');
                }
            }).render(`#${containerId}`);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPayPalButtons);
    } else {
        initPayPalButtons();
    }
})();
