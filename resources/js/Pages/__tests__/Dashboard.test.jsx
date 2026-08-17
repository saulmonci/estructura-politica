import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../Dashboard';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'presidente' } } } }),
    Head: () => <div data-testid="head" />,
    Link: ({ children, href }) => <a href={href}>{children}</a>,
    router: { get: vi.fn() }
}));

vi.mock('@/Layouts/MainLayout', () => ({
    default: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

// Mock recharts to avoid complex SVG rendering issues in JSDOM
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    Tooltip: () => <div />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Legend: () => <div data-testid="legend" />
}));

const mockProps = {
    stats: {
        rds: 10,
        operadores: 50,
        promotores: 200,
        promovidos: 1000
    },
    growthData: [
        { name: 'Ene', operadores: 10, promotores: 50, promovidos: 200 },
        { name: 'Feb', operadores: 15, promotores: 80, promovidos: 350 }
    ],
    distribution: [],
    rds: [],
    reporteDemarcaciones: [
        { demarcacion: 'Demarcacion 1', rds: 5, operadores: 20, promotores: 100, promovidos: 500, total: 625 }
    ]
};

describe('Dashboard Page', () => {
    it('renders the dashboard with stats', () => {
        render(<Dashboard {...mockProps} />);
        
        expect(screen.getByText('Panel General')).toBeInTheDocument();
        expect(screen.getByText(/Representantes de Demarcación/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Operadores/i).length).toBeGreaterThan(0);
        
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders the reportes tab for presidente', () => {
        render(<Dashboard {...mockProps} />);
        expect(screen.getByText('Reportes Estadísticos')).toBeInTheDocument();
        
        // El contenido puede no estar renderizado si el tab no está activo por defecto en antd,
        // pero antd los renderiza a veces escondidos o podemos dar click.
        // Solo verificamos que la pestaña exista.
    });
});
