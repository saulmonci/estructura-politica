import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PromovidoProfile from '../Profile';

vi.mock('@inertiajs/react', () => ({
    Head: () => <div data-testid="head" />
}));

vi.mock('@/Layouts/MainLayout', () => ({
    default: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

describe('Promovido Profile Page', () => {
    it('renders the promovido profile with mock data', () => {
        render(<PromovidoProfile />);
        
        expect(screen.getAllByText('José Antonio Ruiz')[0]).toBeInTheDocument();
        expect(screen.getByText('"Pepe"')).toBeInTheDocument();
        expect(screen.getByText('RUIZJOSE19900101HMCZSN05')).toBeInTheDocument();
        expect(screen.getByText('Mi Posición en la Estructura')).toBeInTheDocument();
    });

    it('renders the promovido profile with provided data', () => {
        const customData = {
            id: 'PM-9999',
            nombre_completo: 'Test User',
            apodo: 'Tester',
            clave_elector: 'TEST1234',
            curp: 'TESTCURP',
            fecha_nacimiento: '01/01/2000',
            seccion_electoral: '9999',
            fecha_registro: '01/01/2024',
            registrado_por: 'Admin',
            colonia: 'Test Col',
            calle: 'Test Calle',
            num_ext: '1',
            telefono: '1234567890',
            estado: 'Activo'
        };

        render(<PromovidoProfile promovido={customData} />);
        
        expect(screen.getAllByText('Test User')[0]).toBeInTheDocument();
        expect(screen.getByText('"Tester"')).toBeInTheDocument();
        expect(screen.getAllByText('PM-9999')[0]).toBeInTheDocument();
    });
});
