import React, { forwardRef, useImperativeHandle } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActivityLogsIndex from '../Index';

vi.mock('@inertiajs/react', () => ({
    Head: () => <div data-testid="head" />
}));

vi.mock('@/Layouts/MainLayout', () => ({
    default: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/Components/AppTable', () => ({
    default: ({ endpoint }) => <div data-testid={`app-table-${endpoint}`}>Table Mock</div>
}));

vi.mock('@/Components/AppModal', () => ({
    default: forwardRef(({ children, title }, ref) => {
        useImperativeHandle(ref, () => ({
            open: vi.fn(),
            close: vi.fn()
        }));
        return <div data-testid="app-modal">{typeof title === 'function' ? title() : title} {typeof children === 'function' ? children({ action: 'created' }) : children}</div>;
    })
}));

describe('ActivityLogs Index Page', () => {
    it('renders the logs page with table', () => {
        render(<ActivityLogsIndex />);
        
        expect(screen.getByText('Bitácora del Sistema')).toBeInTheDocument();
        expect(screen.getByTestId('app-table-/logs')).toBeInTheDocument();
        expect(screen.getByText('Todos')).toBeInTheDocument();
    });
});
