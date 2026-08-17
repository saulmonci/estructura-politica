import React, { forwardRef, useImperativeHandle } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PresidentesIndex from '../Index';

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

vi.mock('../PresidenteFormModal', () => ({
    default: forwardRef((props, ref) => {
        useImperativeHandle(ref, () => ({
            open: vi.fn()
        }));
        return <div data-testid="presidente-modal" />;
    })
}));

describe('Presidentes Index Page', () => {
    it('renders the presidentes page', () => {
        render(<PresidentesIndex />);
        
        expect(screen.getByText('Presidentes Municipales / Coordinadores')).toBeInTheDocument();
        expect(screen.getByTestId('app-table-/presidentes')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Nuevo Presidente/i })).toBeInTheDocument();
    });
});
