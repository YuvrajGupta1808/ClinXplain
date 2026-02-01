import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/api';

interface User {
    id: string;
    email: string;
    name: string;
    specialty: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    signin: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string, specialty: string) => Promise<void>;
    signout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const signin = async (email: string, password: string) => {
        try {
            const response = await authAPI.signin({ email, password });
            
            if (response.success) {
                const { doctor, token: newToken } = response.data;
                setUser(doctor);
                setToken(newToken);
                localStorage.setItem('token', newToken);
                localStorage.setItem('user', JSON.stringify(doctor));
            } else {
                throw new Error(response.error || 'Sign in failed');
            }
        } catch (error: any) {
            console.error('Sign in error:', error);
            throw new Error(error.response?.data?.error || 'Invalid email or password');
        }
    };

    const signup = async (email: string, password: string, name: string, specialty: string) => {
        try {
            const response = await authAPI.signup({ email, password, name, specialty });
            
            if (response.success) {
                const { doctor, token: newToken } = response.data;
                setUser(doctor);
                setToken(newToken);
                localStorage.setItem('token', newToken);
                localStorage.setItem('user', JSON.stringify(doctor));
            } else {
                throw new Error(response.error || 'Sign up failed');
            }
        } catch (error: any) {
            console.error('Sign up error:', error);
            throw new Error(error.response?.data?.error || 'Sign up failed');
        }
    };

    const signout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                signin,
                signup,
                signout,
                isAuthenticated: !!token
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
