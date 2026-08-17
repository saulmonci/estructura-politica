import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ApoyosDrawer from '../ApoyosDrawer';
import axios from 'axios';

vi.mock('axios');

describe('ApoyosDrawer', () => {
    it('does not render content if visible is false', () => {
        render(<ApoyosDrawer visible={false} onClose={() => {}} promovido={{ id: 1, nombre_completo: 'Test' }} />);
        expect(screen.queryByText(/Kardex de Apoyos/i)).not.toBeInTheDocument();
    });

    it('fetches and displays data when visible', async () => {
        axios.get.mockResolvedValueOnce({
            data: [
                { id: 1, tipo_apoyo: 'Despensa', fecha: '2023-01-01', estado: 'Entregado' }
            ]
        });

        render(
            <ApoyosDrawer 
                visible={true} 
                onClose={() => {}} 
                promovido={{ id: 1, nombre_completo: 'Juan Perez' }} 
            />
        );

        expect(screen.getByText('Kardex de Apoyos: Juan Perez')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/promovidos/1/apoyos');
        });
    });
});
