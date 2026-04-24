// main.js - Script principal
(function() {
    'use strict';
    
    console.log('🚀 SpayCineHD Premium con FluxiPay');
    console.log('Planes disponibles:', FLUXIPAY_CONFIG.PLANS);
    
    // Configurar eventos de los botones de pago
    function setupPlanButtons() {
        const planCards = document.querySelectorAll('.plan-card');
        
        planCards.forEach(card => {
            const btn = card.querySelector('.btn-fluxipay');
            if (btn) {
                // Los eventos ya están configurados en el onclick del HTML
                console.log('✅ Botón configurado:', card.dataset.plan);
            }
        });
    }
    
    // Verificar transacciones pendientes
    function checkPendingTransactions() {
        const transactions = JSON.parse(localStorage.getItem('spaycine_transactions') || '[]');
        const pending = transactions.filter(t => t.status === 'pending');
        
        if (pending.length > 0) {
            console.log(`📋 ${pending.length} transacción(es) pendiente(s)`);
        }
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupPlanButtons();
            checkPendingTransactions();
        });
    } else {
        setupPlanButtons();
        checkPendingTransactions();
    }
    
    // Exportar funciones útiles globalmente
    window.SpayCineHD = {
        version: '2.0.0',
        paymentGateway: 'FluxiPay',
        checkCodeStatus: async (code) => {
            if (window.firebaseDB && window.firebaseDB.getCodeStatus) {
                return await window.firebaseDB.getCodeStatus(code);
            }
            return null;
        },
        getTransactionHistory: () => {
            return JSON.parse(localStorage.getItem('spaycine_transactions') || '[]');
        }
    };
    
})();