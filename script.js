// Configuración de planes con tus IDs reales de PayPal
const plansConfig = {
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

// Inicializar todos los botones de PayPal
function initializePayPalButtons() {
    Object.keys(plansConfig).forEach(planType => {
        const planConfig = plansConfig[planType];
        initializePayPalButton(planConfig, planType);
    });
}

// Inicializar un botón de PayPal específico
function initializePayPalButton(planConfig, planType) {
    paypal.Buttons({
        style: {
            shape: 'rect',
            color: 'gold',
            layout: 'vertical',
            label: 'subscribe'
        },

        createSubscription: function(data, actions) {
            console.log('🔄 Creando suscripción para plan:', planConfig.name);
            return actions.subscription.create({
                plan_id: planConfig.paypalId,
                application_context: {
                    brand_name: 'App-Animes Premium',
                    locale: 'es-ES',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'SUBSCRIBE_NOW'
                }
            });
        },

        onApprove: function(data, actions) {
            console.log('✅ Suscripción aprobada:', data.subscriptionID);
            console.log('📋 Plan:', planConfig.name);
            
            // Mostrar loading
            showLoading('Generando tu código premium...');
            
            // Generar y guardar código premium
            setTimeout(() => {
                generateAndSavePremiumCode(planType, data.subscriptionID, planConfig);
            }, 1500);
        },

        onError: function(err) {
            console.error('❌ Error en PayPal:', err);
            alert('Error en el proceso de pago. Por favor, intenta nuevamente.\nError: ' + err.toString());
        },

        onCancel: function(data) {
            console.log('⏹️ Pago cancelado:', data);
            alert('Suscripción cancelada. Puedes intentar nuevamente cuando lo desees.');
        },

        onClick: function() {
            console.log('🖱️ Click en PayPal para plan:', planConfig.name);
        }

    }).render('#' + planConfig.containerId);
}

// Generar código premium único para App-Animes
function generatePremiumCode(planType) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    let prefix = '';
    switch(planType) {
        case 'mensual':
            prefix = 'ANIM1M';
            break;
        case '3meses':
            prefix = 'ANIM3M';
            break;
        case 'year':
            prefix = 'ANIM1Y';
            break;
        default:
            prefix = 'ANIMES';
    }
    
    return `${prefix}-${timestamp}-${random}`;
}

// Guardar código en Firebase de App-Animes
function saveCodeToFirebase(code, planType, subscriptionId, planConfig) {
    const expirationDate = getExpirationDate(planConfig.days);
    
    const codeData = {
        IsUsed: false,
        Type: planType,
        SubscriptionId: subscriptionId,
        CreatedAt: firebase.database.ServerValue.TIMESTAMP,
        Plan: planConfig.name,
        Price: planConfig.price,
        DurationDays: planConfig.days,
        UsedBy: "",
        UsedDate: 0,
        ExpiresAt: expirationDate,
        App: 'App-Animes',
        Timestamp: new Date().toISOString()
    };

    return database.ref('ActivationCodes/' + code).set(codeData)
        .then(() => {
            console.log('✅ Código guardado en Firebase:', code);
            logTransaction(code, planConfig, subscriptionId);
            return true;
        })
        .catch(error => {
            console.error('❌ Error guardando código:', error);
            return false;
        });
}

// Log de transacción (para debugging)
function logTransaction(code, planConfig, subscriptionId) {
    const transactionLog = {
        code: code,
        plan: planConfig.name,
        price: planConfig.price,
        subscriptionId: subscriptionId,
        timestamp: new Date().toISOString(),
        app: 'App-Animes',
        status: 'completed'
    };
    
    database.ref('TransactionLogs/' + subscriptionId).set(transactionLog)
        .then(() => console.log('📝 Transacción logueada'))
        .catch(err => console.error('Error logueando transacción:', err));
}

// Calcular fecha de expiración
function getExpirationDate(days) {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + days);
    return expiration.getTime();
}

// Generar y guardar código
function generateAndSavePremiumCode(planType, subscriptionId, planConfig) {
    const premiumCode = generatePremiumCode(planType);
    
    saveCodeToFirebase(premiumCode, planType, subscriptionId, planConfig)
        .then(success => {
            hideLoading();
            if (success) {
                showPremiumCodeModal(premiumCode, planConfig);
            } else {
                alert('❌ Error al generar el código premium. Por favor, contacta a soporte: servidor2appspay@gmail.com');
            }
        })
        .catch(error => {
            hideLoading();
            alert('❌ Error en el proceso. Contacta soporte: servidor2appspay@gmail.com');
        });
}

// Mostrar modal con código
function showPremiumCodeModal(code, planConfig) {
    const modal = document.getElementById('codeModal');
    const codeElement = document.getElementById('premiumCode');
    const planInfoElement = document.getElementById('planInfo');
    
    codeElement.textContent = code;
    planInfoElement.innerHTML = `
        <p><strong>Plan:</strong> ${planConfig.name}</p>
        <p><strong>Precio:</strong> ${planConfig.price}</p>
        <p><strong>Duración:</strong> ${planConfig.days} días</p>
        <p><strong>ID Suscripción:</strong> ${planConfig.paypalId}</p>
    `;
    
    modal.style.display = 'block';
}

// Loading functions
function showLoading(message) {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

// Event Listeners para el modal
document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('codeModal').style.display = 'none';
});

document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('codeModal').style.display = 'none';
});

document.getElementById('copyCode').addEventListener('click', function() {
    const code = document.getElementById('premiumCode').textContent;
    navigator.clipboard.writeText(code).then(function() {
        const btn = document.getElementById('copyCode');
        const originalText = btn.textContent;
        btn.textContent = '✅ ¡Copiado!';
        btn.style.background = '#27ae60';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#4ecdc4';
        }, 2000);
    }).catch(function() {
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const btn = document.getElementById('copyCode');
        btn.textContent = '✅ ¡Copiado!';
        setTimeout(() => {
            btn.textContent = '📋 Copiar Código';
        }, 2000);
    });
});

// Cerrar modal al hacer clic fuera
window.addEventListener('click', function(event) {
    const modal = document.getElementById('codeModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Efectos de hover para tarjetas
document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App-Animes Premium Page Loaded');
    console.log('📋 Planes configurados:');
    console.log('- 1 Mes: P-18381349AF867540CNEVSH5I');
    console.log('- 3 Meses: P-5PP81994FM215525RNEVSJFA');
    console.log('- 1 Año: P-3E203769WC9540323NEVSJ5Q');
    
    initializePayPalButtons();
});