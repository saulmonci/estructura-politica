import React, { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppUpload from '../AppUpload';

vi.mock('browser-image-compression', () => ({
    default: vi.fn().mockImplementation((file) => Promise.resolve(file))
}));

global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

describe('AppUpload', () => {
    it('renders with initial title and icon', () => {
        render(<AppUpload title="Subir Foto" icon={<span>Icono</span>} />);
        expect(screen.getByText('Subir Foto')).toBeInTheDocument();
        expect(screen.getByText('Icono')).toBeInTheDocument();
    });

    it('can set and get file via imperative handle', async () => {
        let uploadRef;
        const TestComponent = () => {
            uploadRef = useRef(null);
            return <AppUpload ref={uploadRef} title="Test Upload" />;
        };

        render(<TestComponent />);
        
        const mockFile = new File([''], 'test.png', { type: 'image/png' });
        
        waitFor(() => uploadRef.current.setFile(mockFile));
        
        await waitFor(() => {
            expect(uploadRef.current.getFile()).toBe(mockFile);
        });
    });
});
