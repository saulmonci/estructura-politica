import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SeccionesDrawer from '../SeccionesDrawer';
import axios from 'axios';

vi.mock('axios');

describe('SeccionesDrawer', () => {
    it('does not render content if visible is false', () => {
        render(<SeccionesDrawer visible={false} onClose={() => {}} demarcacion={{ id: 1, nombre: 'Test' }} />);
        expect(screen.queryByText(/Secciones de la/i)).not.toBeInTheDocument();
    });

    it('fetches and displays data when visible', async () => {
        axios.get.mockResolvedValueOnce({
            data: [
                { id: 1, numero: '1234', meta: 100 }
            ]
        });

        render(
            <SeccionesDrawer 
                visible={true} 
                onClose={() => {}} 
                demarcacion={{ id: 1, nombre: 'Centro' }} 
            />
        );

        expect(screen.getByText('Secciones de la Centro')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/demarcaciones/1/secciones');
            expect(screen.getByText('Sección 1234')).toBeInTheDocument();
        });
    });
});
