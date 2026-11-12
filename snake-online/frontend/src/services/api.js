
const API_URL = 'https://localhost:3000/api';

// Funcion general para comunicarnos con el backend
export async function apiRequest(endpoint, options = {}) {

    const headers = {
        'Content-Type': 'application/json'
    };

    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body
            ? JSON.stringify(options.body)
            : undefined
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || 'Ocurrio un error en el servidor'
        );
    }

    return data;
}

// Registrar un usuario
export function registerUser(username, password, confirmPassword) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: {
            username,
            password,
            confirmPassword
        }
    });
}

// Iniciar sesion
export function loginUser(username, password) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: {
            username,
            password
        }
    });
}

// Obtener informacion del jugador
export function getMyProfile(token) {
    return apiRequest('/users/me', {
        token
    });
}
