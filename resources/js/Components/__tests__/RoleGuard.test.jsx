import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RoleGuard from '../RoleGuard';

// Mock inertia
vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
}));

import { usePage } from '@inertiajs/react';

describe('RoleGuard', () => {
    it('renders children if allowedRoles matches user role', () => {
        usePage.mockReturnValue({ props: { auth: { user: { role: 'admin' } } } });
        render(<RoleGuard allowedRoles={['admin', 'manager']}><div>Protected Content</div></RoleGuard>);
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders fallback if role does not match', () => {
        usePage.mockReturnValue({ props: { auth: { user: { role: 'user' } } } });
        render(<RoleGuard allowedRoles={['admin']} fallback={<div>Access Denied</div>}><div>Protected Content</div></RoleGuard>);
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders children if no restrictions applied', () => {
        usePage.mockReturnValue({ props: { auth: { user: { role: 'user' } } } });
        render(<RoleGuard><div>Public Content</div></RoleGuard>);
        expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
});
