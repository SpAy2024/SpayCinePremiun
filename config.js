// config.js - Configuración para producción
const FLUXIPAY_CONFIG = {
    // Usar tu backend local o en hosting
    // Para pruebas locales con PHP: http://localhost:8000/backend.php
    // Para producción: https://tusitio.com/backend.php
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000/backend.php'
        : 'https://tusitio.com/backend.php',
    
    // Credenciales (se manejan desde el backend por seguridad)
    // No poner API_KEY aquí en producción
    
    // Gateway por defecto: null (todos), 'stripe', 'crypto', 'giftcards'
    DEFAULT_GATEWAY: 'stripe', // ← Cambiar a null para mostrar todos
    
    // Planes de suscripción
    PLANS: {
        'mensual': {
            name: '1 Mes',
            price: 2.99,
            days: 30,
            type: 'mensual',
            gateway: 'stripe'
        },
        '3meses': {
            name: '3 Meses',
            price: 6.99,
            days: 90,
            type: '3meses',
            gateway: 'stripe'
        },
        'year': {
            name: '1 Año',
            price: 24.99,
            days: 365,
            type: 'year',
            gateway: 'stripe'
        }
    }
};

window.FLUXIPAY_CONFIG = FLUXIPAY_CONFIG;