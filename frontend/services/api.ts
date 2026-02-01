import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    signup: async (data: { email: string; password: string; name: string; specialty: string }) => {
        const response = await api.post('/auth/signup', data);
        return response.data;
    },

    signin: async (data: { email: string; password: string }) => {
        const response = await api.post('/auth/signin', data);
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/auth/profile');
        return response.data;
    },

    updateProfile: async (data: { name?: string; specialty?: string }) => {
        const response = await api.put('/auth/profile', data);
        return response.data;
    }
};

// Patients API
export const patientsAPI = {
    getAll: async (limit?: number) => {
        const response = await api.get('/patients', { params: { limit } });
        return response.data;
    },

    getRecent: async (limit: number = 4) => {
        const response = await api.get('/patients', { params: { recent: 'true', limit } });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/patients/${id}`);
        return response.data;
    },

    create: async (data: {
        fullName: string;
        dateOfBirth?: string;
        gender?: string;
        contactInfo?: {
            phone?: string;
            email?: string;
            address?: string;
        };
        insuranceInfo?: {
            provider?: string;
            memberId?: string;
        };
    }) => {
        const response = await api.post('/patients', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/patients/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/patients/${id}`);
        return response.data;
    }
};

// Appointments API
export const appointmentsAPI = {
    getAll: async () => {
        const response = await api.get('/appointments');
        return response.data;
    },

    getToday: async () => {
        const response = await api.get('/appointments', { params: { date: 'today' } });
        return response.data;
    },

    getByDate: async (date: string) => {
        const response = await api.get('/appointments', { params: { date } });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/appointments/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/appointments', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/appointments/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/appointments/${id}`);
        return response.data;
    }
};

// Stats API
export const statsAPI = {
    getDashboard: async () => {
        const response = await api.get('/stats/dashboard');
        return response.data;
    },

    getSidebar: async () => {
        const response = await api.get('/stats/sidebar');
        return response.data;
    }
};

// Visits API
export const visitsAPI = {
    getAll: async () => {
        const response = await api.get('/visits');
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/visits/${id}`);
        return response.data;
    },

    create: async (data: {
        patientId: string;
        visitDate?: string;
        type?: string;
        mode?: string;
        location?: string;
        chiefComplaint?: any;
        symptoms?: any[];
        vitals?: any;
        medications?: any[];
        allergies?: string[];
        clinicalAssessment?: any;
        planOfCare?: any;
        insights?: any;
    }) => {
        const response = await api.post('/visits', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/visits/${id}`, data);
        return response.data;
    }
};

export default api;
