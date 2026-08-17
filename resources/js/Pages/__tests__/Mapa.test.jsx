import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MapaPage from '../Mapa';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'superuser' } } } }),
    Head: () => <div data-testid="head" />,
    router: { get: vi.fn() }
}));

vi.mock('@/Layouts/MainLayout', () => ({
    default: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('leaflet', () => ({
    default: {
        map: vi.fn(() => ({
            fitBounds: vi.fn(),
            setView: vi.fn(),
            remove: vi.fn(),
            hasLayer: vi.fn()
        })),
        tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
        geoJSON: vi.fn(() => ({ addTo: vi.fn(), getLayers: vi.fn(() => []), getBounds: vi.fn(() => ({ isValid: () => false })) })),
        layerGroup: vi.fn(() => ({ addTo: vi.fn() })),
        marker: vi.fn(() => ({ addTo: vi.fn() })),
        divIcon: vi.fn(),
        control: { layers: vi.fn(() => ({ addTo: vi.fn() })) }
    }
}));

const mockProps = {
    demarcaciones: [
        { id: 1, nombre: 'Dem 1', porcentaje: 50, meta: 100, promovidos: 50, color: '#10B981' }
    ],
    secciones: [],
    globalStats: { porcentaje: 75, total_promovidos: 750, total_meta: 1000 },
    currentMunicipality: { nombre: 'Test Municipio' },
    availableMunicipalities: [],
    canSwitchMunicipality: false
};

describe('Mapa Page', () => {
    it('renders the map page correctly', () => {
        render(<MapaPage {...mockProps} />);
        
        expect(screen.getByText(/Mapa Territorial \(Test Municipio\)/i)).toBeInTheDocument();
        expect(screen.getByText('75')).toBeInTheDocument(); // avance (integer part of 75.0)
        expect(screen.getByText('750')).toBeInTheDocument(); // total promovidos
        expect(screen.getByText('1000')).toBeInTheDocument(); // meta
    });
});
