import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImpersonateBanner from '../ImpersonateBanner';
import { usePage, router } from '@inertiajs/react';

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
    router: { post: vi.fn() }
}));

describe('ImpersonateBanner', () => {
    it('does not render if not impersonating', () => {
        usePage.mockReturnValue({ props: { auth: { is_impersonating: false } } });
        const { container } = render(<ImpersonateBanner />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders banner with users info when impersonating', () => {
        usePage.mockReturnValue({
            props: {
                auth: {
                    is_impersonating: true,
                    user: { name: 'Test User', role: 'admin' },
                    impersonator: { name: 'Super Admin', role: 'superuser' }
                }
            }
        });

        render(<ImpersonateBanner />);
        expect(screen.getByText(/MODO SUPLANTACIÓN ACTIVO/i)).toBeInTheDocument();
        expect(screen.getByText(/Test User/i)).toBeInTheDocument();
        expect(screen.getByText(/Super Admin/i)).toBeInTheDocument();
    });

    it('calls router.post to leave on button click', () => {
        usePage.mockReturnValue({
            props: {
                auth: { is_impersonating: true, user: { name: 'User' } }
            }
        });

        render(<ImpersonateBanner />);
        fireEvent.click(screen.getByText('Regresar a mi cuenta original'));
        expect(router.post).toHaveBeenCalledWith('/impersonate/leave');
    });
});
