import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HeaderImpersonateSearch from '../HeaderImpersonateSearch';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

vi.mock('axios');
vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
    router: { post: vi.fn() }
}));

// Mock ResizeObserver para Antd
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('HeaderImpersonateSearch', () => {
    it('renders simple search input if cannot impersonate', () => {
        usePage.mockReturnValue({ props: { auth: { can_impersonate: false } } });
        render(<HeaderImpersonateSearch />);
        expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
    });

    it('renders impersonate search if can impersonate', async () => {
        usePage.mockReturnValue({ props: { auth: { can_impersonate: true } } });
        axios.get.mockResolvedValueOnce({ data: [] }); // Para municipios
        
        render(<HeaderImpersonateSearch />);
        // En vista de que los placeholders pueden estar en un input real dentro del Select/Input
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/catalogos/municipios');
        });
    });
});
