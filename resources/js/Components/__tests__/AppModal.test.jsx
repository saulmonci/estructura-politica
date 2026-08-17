import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AppModal from '../AppModal';

describe('AppModal', () => {
    it('opens and closes via imperative handle', async () => {
        let modalRef;
        const TestComponent = () => {
            modalRef = useRef(null);
            return (
                <AppModal ref={modalRef} title={(data) => `Test Modal ${data || ''}`}>
                    {(data) => <div data-testid="modal-content">Content {data}</div>}
                </AppModal>
            );
        };

        render(<TestComponent />);
        
        // Inicialmente cerrado
        expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
        
        // Abrir modal
        modalRef.current.open('123');
        await waitFor(() => {
            expect(screen.getByTestId('modal-content')).toBeInTheDocument();
            expect(screen.getByText('Content 123')).toBeInTheDocument();
            expect(screen.getByText('Test Modal 123')).toBeInTheDocument();
        });
        
        // Cerrar modal
        modalRef.current.close();
    });
});
