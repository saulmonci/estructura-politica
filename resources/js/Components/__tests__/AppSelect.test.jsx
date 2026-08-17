import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppSelect from '../AppSelect';
import axios from 'axios';

vi.mock('axios');
vi.mock('@ant-design/pro-components', () => ({
    ProFormSelect: ({ options }) => (
        <select data-testid="mock-select">
            {options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    )
}));

describe('AppSelect', () => {
    it('fetches data and maps options correctly', async () => {
        axios.get.mockResolvedValueOnce({
            data: [
                { id: 1, nombre: 'Opcion 1' },
                { id: 2, nombre: 'Opcion 2' }
            ]
        });

        render(<AppSelect name="test" fetchUrl="/api/options" labelKey="nombre" valueKey="id" />);

        expect(axios.get).toHaveBeenCalledWith('/api/options');

        await waitFor(() => {
            expect(screen.getByText('Opcion 1')).toBeInTheDocument();
            expect(screen.getByText('Opcion 2')).toBeInTheDocument();
        });
    });

    it('does not fetch if fetchUrl is undefined', async () => {
        axios.get.mockClear();
        render(<AppSelect name="test" />);
        expect(axios.get).not.toHaveBeenCalled();
    });
});
