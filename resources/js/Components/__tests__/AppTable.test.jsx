import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppTable from '../AppTable';

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn() }
}));

vi.mock('@ant-design/pro-components', () => ({
    ProTable: ({ dataSource }) => (
        <table data-testid="mock-table">
            <tbody>
                {dataSource?.map((row, i) => (
                    <tr key={i}><td>{row.name}</td></tr>
                ))}
            </tbody>
        </table>
    )
}));

// Mock ResizeObserver and matchMedia for Grid
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('AppTable', () => {
    const columns = [
        { title: 'ID', dataIndex: 'id' },
        { title: 'Name', dataIndex: 'name' }
    ];

    it('renders with simple array data', () => {
        const data = [
            { id: 1, name: 'John Doe' },
            { id: 2, name: 'Jane Doe' }
        ];

        render(<AppTable columns={columns} data={data} />);
        
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('renders with paginated inertia data', () => {
        const paginatedData = {
            current_page: 1,
            data: [{ id: 1, name: 'Paginated User' }],
            per_page: 10,
            total: 1
        };

        render(<AppTable columns={columns} data={paginatedData} />);
        
        expect(screen.getByText('Paginated User')).toBeInTheDocument();
    });
});
