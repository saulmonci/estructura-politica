import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from '../Login';
import * as Inertia from '@inertiajs/react';

vi.mock('@inertiajs/react', () => ({
    useForm: vi.fn(() => ({
        data: { email: '', password: '', remember: false },
        setData: vi.fn(),
        post: vi.fn(),
        processing: false,
        errors: {}
    })),
    Head: () => <div data-testid="head" />
}));

vi.mock('@/Layouts/AuthLayout', () => ({
    default: ({ children }) => <div data-testid="auth-layout">{children}</div>
}));

describe('Login Page', () => {
    it('renders the login form', () => {
        render(<Login />);
        expect(screen.getByText('Bienvenido')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ingresa tu correo')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ingresa tu contraseña')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeInTheDocument();
    });

    it('submits the form', async () => {
        const postMock = vi.fn();
        Inertia.useForm.mockReturnValue({
            data: { email: 'test@example.com', password: 'password', remember: false },
            setData: vi.fn(),
            post: postMock,
            processing: false,
            errors: {}
        });

        render(<Login />);
        
        fireEvent.submit(document.querySelector('form'));
        
        await waitFor(() => {
            expect(postMock).toHaveBeenCalledWith('/login');
        });
    });
});
