import React, { forwardRef, useImperativeHandle } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RepresentantesIndex from '../Index';

vi.mock('@inertiajs/react', () => ({
    Head: () => <div data-testid="head" />,
    router: { get: vi.fn(), delete: vi.fn(), post: vi.fn() },
    usePage: () => ({ props: { auth: { user: { role: 'superuser' } } } })
}));

vi.mock('@/Layouts/MainLayout', () => ({
    default: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/Components/AppTable', () => ({
    default: ({ endpoint }) => <div data-testid={`app-table-${endpoint}`}>Table Mock</div>
}));

vi.mock('@/Components/PersonaFormModal', () => ({
    default: forwardRef((props, ref) => {
        useImperativeHandle(ref, () => ({
            open: vi.fn()
        }));
        return <div data-testid="persona-modal" />;
    })
}));

vi.mock('@/Components/ApoyosDrawer', () => ({
    default: ({ visible }) => visible ? <div data-testid="apoyos-drawer" /> : null
}));

describe('Representantes Index Page', () => {
    it('renders the representantes page', () => {
        render(<RepresentantesIndex />);
        
        expect(screen.getByText('Representantes de Demarcación')).toBeInTheDocument();
        expect(screen.getByTestId('app-table-/representantes')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Agregar Representante/i })).toBeInTheDocument();
    });
});
