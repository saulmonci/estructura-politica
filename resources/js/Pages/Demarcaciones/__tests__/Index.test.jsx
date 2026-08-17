import React, { forwardRef, useImperativeHandle } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DemarcacionesIndex from '../Index';

vi.mock('@inertiajs/react', () => ({
    Head: () => <div data-testid="head" />,
    router: { delete: vi.fn() },
    usePage: () => ({ props: { auth: { user: { role: 'superuser' } } } })
}));

vi.mock('@/Layouts/MainLayout', () => ({
    default: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/Components/AppTable', () => ({
    default: ({ endpoint }) => <div data-testid={`app-table-${endpoint}`}>Table Mock</div>
}));

vi.mock('../DemarcacionFormModal', () => ({
    default: forwardRef((props, ref) => {
        useImperativeHandle(ref, () => ({
            open: vi.fn()
        }));
        return <div data-testid="demarcacion-modal" />;
    })
}));

vi.mock('@/Components/SeccionesDrawer', () => ({
    default: ({ visible }) => visible ? <div data-testid="secciones-drawer" /> : null
}));

describe('Demarcaciones Index Page', () => {
    it('renders the demarcaciones page', () => {
        render(<DemarcacionesIndex />);
        
        expect(screen.getByText('Administrar Demarcaciones')).toBeInTheDocument();
        expect(screen.getByTestId('app-table-/demarcaciones')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Agregar Demarcación/i })).toBeInTheDocument();
    });
});
