import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Form } from 'antd';
import PresidenteFormModal from '../PresidenteFormModal';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { id: 1 } } } })
}));

vi.mock('@/Components/AppModal', () => ({
    default: React.forwardRef(({ children, title }, ref) => {
        React.useImperativeHandle(ref, () => ({
            open: vi.fn(),
            close: vi.fn(),
            getData: vi.fn()
        }));
        return (
            <div>
                {typeof title === 'function' ? title({ id: null }) : title}
                {children({ id: null, url: null }, vi.fn())}
            </div>
        );
    })
}));

vi.mock('@/Components/AppForm', () => ({
    default: ({ children, form }) => <Form form={form} data-testid="app-form">{children}</Form>
}));

vi.mock('@/Components/AppSelect', () => ({
    default: ({ placeholder }) => <select data-testid="app-select"><option>{placeholder}</option></select>
}));

describe('PresidenteFormModal', () => {
    it('renders the creation modal', async () => {
        let modalRef;
        const TestComponent = () => {
            modalRef = useRef(null);
            return <PresidenteFormModal ref={modalRef} />;
        };

        render(<TestComponent />);
        
        await waitFor(() => {
            expect(screen.getByText(/Registrar Nuevo Presidente Municipal/i)).toBeInTheDocument();
            expect(screen.getByText('Nombre(s)')).toBeInTheDocument();
            expect(screen.getByText('Apellidos')).toBeInTheDocument();
        });
    });
});
