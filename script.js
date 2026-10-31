// script.js - SpayCineFHD Premium
(function() {
    'use strict';

    const PLAN = {
        type: 'mensual',
        name: '1 Mes',
        price: 2.99,
        priceFormatted: '$2.99',
        days: 30,
        paypalLink: 'https://www.paypal.com/ncp/payment/GLM2GDPNAA6SU',
        prefix: 'M'
    };

    console.log('🚀 SpayCineFHD Premium · Plan único: 1 Mes');

    function generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = PLAN.prefix;
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    function showCodeModal(code) {
        const modal = document.getElementById('codeModal');
        if (!modal) return;

        document.getElementById('premiumCode').textContent = code;
        document.getElementById('planInfo').innerHTML = `
            <p><strong>Plan:</strong> ${PLAN.name}</p>
            <p><strong>Precio:</strong> ${PLAN.priceFormatted}</p>
            <p><strong>Duración:</strong> ${PLAN.days} días</p>
            <p style="color:#4caf50;">✅ Pago confirmado por PayPal</p>
            <p style="color:#ff9800;">⚠️ Guarda este código para activar en la app</p>
        `;
        modal.style.display = 'flex';

        const copyBtn = document.getElementById('copyCode');
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(code);
                copyBtn.innerHTML = '<span>✅</span> ¡Copiado!';
                setTimeout(() => copyBtn.innerHTML = '<span>📋</span> Copiar Código', 2000);
            } catch {
                alert('Copia manual: ' + code);
            }
        };

        const closeModal = () => { modal.style.display = 'none'; };
        document.getElementById('closeModal').onclick = closeModal;
        document.querySelector('.close').onclick = closeModal;
        window.onclick = (e) => { if (e.target === modal) closeModal(); };

        let seconds = 60;
        const cd = document.getElementById('countdown');
        const timer = setInterval(() => {
            seconds--;
            if (cd) cd.textContent = seconds;
            if (seconds <= 0) { clearInterval(timer); closeModal(); }
        }, 1000);
    }

    async function handlePayPalReturn() {
        const params = new URLSearchParams(window.location.search);
        const paymentId = params.get('paymentId') || params.get('tx');
        const status = params.get('status');

        if (paymentId && (status === 'success' || !status)) {
            console.log('✅ Pago detectado:', paymentId);
            window.history.replaceState({}, document.title, window.location.pathname);

            // Bloqueamos la pantalla mientras verificamos
            alert('⏳ Verificando pago real con PayPal... Por favor, espera.');

            try {
                // 🔒 LLAMADA AL SERVIDOR EN RENDER
                const BACKEND_URL = 'https://spaycinepremiun-3u9j.onrender.com/api/verify-payment'; 
                
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentId: paymentId })
                });
                
                const result = await response.json();
                console.log('Respuesta del servidor:', result);

                if (result.valid === true) {
                    // Si PayPal dice que el pago es real, generamos y guardamos
                    const code = generateCode();
                    if (typeof window.savePremiumCode === 'function') {
                        await window.savePremiumCode(code, {
                            name: PLAN.name, type: PLAN.type, price: PLAN.price, paymentId: paymentId
                        });
                    }
                    showCodeModal(code);
                } else {
                    alert('⚠️ Pago no válido o no encontrado. No se generará ningún código.');
                }
            } catch (error) {
                console.error('Error conectando al servidor:', error);
                alert('❌ Error de conexión. Asegúrate de haber pagado primero.');
            }
        }
    }

    function initPayButton() {
        const btn = document.getElementById('paypal-button-mensual');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = PLAN.paypalLink;
        });
    }

    function init() {
        initPayButton();
        handlePayPalReturn();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();