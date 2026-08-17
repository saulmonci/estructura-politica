import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IneScanner from '../IneScanner';

// Mock dependencias
vi.mock('axios');
vi.mock('browser-image-compression', () => ({
    default: vi.fn().mockImplementation((file) => Promise.resolve(file))
}));

describe('IneScanner', () => {
    it('renders the scanner alerts and buttons', () => {
        render(<IneScanner />);
        expect(screen.getByText('Autollenado Inteligente')).toBeInTheDocument();
        expect(screen.getByText('Tomar Foto')).toBeInTheDocument();
        expect(screen.getByText('Elegir de Galería')).toBeInTheDocument();
    });
});
