
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8003';

// Create axios instance with base URL
export const api = axios.create({
    baseURL: API_URL,
    timeout: 40000, // 30 seconds timeout (increased for video analysis)
});

// Interceptor to inject token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
}

export const authService = {
    register: async (email: string, password: string, full_name: string) => {
        try {
            const response = await api.post('/auth/signup', {
                email,
                password,
                full_name,
                role: 'PATIENT' // Default role
            });
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || "Registration failed";
        }
    },

    login: async (email: string, password: string) => {
        try {
            // FastAPI expects x-www-form-urlencoded for OAuth2PasswordRequestForm
            const params = new URLSearchParams();
            params.append('username', email); // Map email to username
            params.append('password', password);

            const response = await api.post('/auth/login', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
            }
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || "Login failed";
        }
    },

    googleLogin: async (token: string) => {
        try {
            const response = await api.post('/auth/google', { token });
            if (response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
            }
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || "Google Login failed";
        }
    },

    updateProfile: async (data: { full_name?: string; phone?: string; dob?: string; gender?: string }) => {
        try {
            const response = await api.put('/users/me', data);
            return response.data;
        } catch (error: any) {
             throw error.response?.data?.detail || "Failed to update profile";
        }
    },

    getAppointments: async () => {
        try {
            const response = await api.get('/appointments');
            return response.data;
        } catch (error: any) {
            console.error("Failed to fetch appointments", error);
            return [];
        }
    },

    getStats: async () => {
        try {
            const response = await api.get('/stats');
            return response.data;
        } catch (error: any) {
            console.error("Failed to fetch stats", error);
            return null;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
    },

    getCurrentUser: async (): Promise<User> => {
        try {
            const response = await api.get('/users/me');
            return response.data;
        } catch (error: any) {
            throw error.response?.data?.detail || "Failed to fetch user";
        }
    }
};
