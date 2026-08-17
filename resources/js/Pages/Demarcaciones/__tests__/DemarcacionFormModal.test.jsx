import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DemarcacionFormModal from '../DemarcacionFormModal';

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
    default: ({ children }) => <form data-testid="app-form">{children}</form>
}));

vi.mock('@ant-design/pro-components', () => ({
    ProFormText: ({ label }) => <div><label>{label}</label><input /></div>,
    ProFormDigit: ({ label }) => <div><label>{label}</label><input type="number" /></div>,
    ProFormSelect: ({ label }) => <div><label>{label}</label><select></select></div>
}));

describe('DemarcacionFormModal', () => {
    it('renders the creation modal', async () => {
        let modalRef;
        const TestComponent = () => {
            modalRef = useRef(null);
            return <DemarcacionFormModal ref={modalRef} />;
        };

        render(<TestComponent />);
        
        await waitFor(() => {
            expect(screen.getByText(/REGISTRO DE Demarcación Territorial/i)).toBeInTheDocument();
            expect(screen.getByText('Nombre de la Demarcación')).toBeInTheDocument();
            expect(screen.getByText('Meta de Votantes')).toBeInTheDocument();
        });
    });
});
