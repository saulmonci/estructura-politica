import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PromovidoFormModal from '../PromovidoFormModal';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'superuser' } } } }),
    router: { post: vi.fn(), put: vi.fn() }
}));

vi.mock('../AppModal', () => ({
    default: forwardRef(({ children }, ref) => {
        useImperativeHandle(ref, () => ({
            open: vi.fn(),
            close: vi.fn(),
            getData: vi.fn()
        }));
        return <div>{children({ id: null, url: null }, vi.fn())}</div>;
    })
}));

vi.mock('@ant-design/pro-components', () => {
    const ProFormText = ({ label }) => <div><label>{label}</label><input /></div>;
    ProFormText.Password = ({ label }) => <div><label>{label}</label><input type="password" /></div>;
    return {
        ProFormText,
        ProFormSelect: ({ label }) => <div><label>{label}</label><select /></div>,
        ProFormTextArea: ({ label }) => <div><label>{label}</label><textarea /></div>,
    };
});

vi.mock('../AppForm', () => ({
    default: ({ children }) => <form>{children}</form>
}));

describe('PromovidoFormModal', () => {
    it('renders fields', async () => {
        let modalRef;
        const TestComponent = () => {
            modalRef = useRef(null);
            return <PromovidoFormModal ref={modalRef} />;
        };

        render(<TestComponent />);
        
        await waitFor(() => {
            expect(screen.getByText(/Nombre\(s\)/i)).toBeInTheDocument();
        });
    });
});
