import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

import { message } from 'antd';

// Añadir interceptor de respuesta global
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        // Manejar errores de red (sin respuesta del servidor)
        if (!error.response) {
            message.error('Error de red. Por favor revisa tu conexión a internet.');
            return Promise.reject(error);
        }

        const status = error.response.status;

        // Manejar errores por código HTTP
        switch (status) {
            case 401:
                // Redirigir a login, aunque Inertia suele manejar esto, 
                // para llamadas API axios puras es útil.
                message.warning('Tu sesión ha expirado.');
                setTimeout(() => window.location.href = '/login', 2000);
                break;
            case 403:
                message.error('No tienes permisos para realizar esta acción.');
                break;
            case 404:
                message.error('El recurso solicitado no fue encontrado.');
                break;
            case 422:
                // Errores de validación: Usualmente se manejan en el componente específico (Inertia),
                // pero si es una llamada axios pura, podemos mostrar un mensaje genérico.
                message.error('Por favor, revisa que los datos ingresados sean correctos.');
                break;
            case 500:
                message.error('Ocurrió un error en el servidor. Inténtalo más tarde.');
                break;
            default:
                message.error('Ocurrió un error inesperado.');
        }

        return Promise.reject(error);
    }
);
