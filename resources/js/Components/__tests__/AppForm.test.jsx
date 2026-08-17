import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppForm from '../AppForm';
import { Form } from 'antd';
import axios from 'axios';
import { router } from '@inertiajs/react';

vi.mock('axios');
vi.mock('@inertiajs/react', () => ({
    router: {
        post: vi.fn(),
    }
}));

describe('AppForm', () => {
    it('fetches data on mount if fetchUrl is provided', async () => {
        axios.get.mockResolvedValueOnce({ data: { nombre: 'Test' } });
        
        const TestForm = () => {
            const [form] = Form.useForm();
            return <AppForm form={form} fetchUrl="/api/test" endpoint="/api/test"><div>Test Content</div></AppForm>;
        };

        render(<TestForm />);
        expect(axios.get).toHaveBeenCalledWith('/api/test');
    });

    it('submits data via router by default', async () => {
        const TestForm = () => {
            const [form] = Form.useForm();
            return (
                <AppForm form={form} endpoint="/submit-url">
                    <button type="submit" data-testid="submit-btn">Submit</button>
                </AppForm>
            );
        };

        render(<TestForm />);
        
        fireEvent.click(screen.getByTestId('submit-btn'));

        await waitFor(() => {
            expect(router.post).toHaveBeenCalled();
            expect(router.post.mock.calls[0][0]).toBe('/submit-url');
        });
    });
});
