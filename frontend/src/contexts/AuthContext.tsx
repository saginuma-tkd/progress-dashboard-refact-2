import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface User {
    username: string;
    role: 'developer' | 'admin' | 'user' | 'instructor' | 'student' | 'super_admin';
    school?: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Decode token or fetch user profile (simplified: decode base64 payload)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({ username: payload.sub, role: payload.role, school: payload.school });
            } catch (e) {
                console.error("Invalid token", e);
                localStorage.removeItem('token');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (token: string) => {
        localStorage.setItem('token', token);
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.sub, role: payload.role, school: payload.school });
        navigate('/');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
