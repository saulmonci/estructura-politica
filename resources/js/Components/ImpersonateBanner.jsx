import React from 'react';
import { usePage, router } from '@inertiajs/react';
import { Button } from 'antd';
import { SwapOutlined, WarningOutlined } from '@ant-design/icons';

export default function ImpersonateBanner() {
    const { auth } = usePage().props;

    if (!auth?.is_impersonating) {
        return null;
    }

    const currentUser = auth.user;
    const impersonator = auth.impersonator;

    const handleLeave = () => {
        router.post('/impersonate/leave');
    };

    return (
        <div className="relative z-50 flex flex-wrap items-center justify-between gap-2 border-b border-amber-600 bg-amber-500 px-4 py-2.5 text-sm text-slate-950 shadow-md">
            <div className="flex items-center gap-2 font-medium">
                <WarningOutlined className="animate-pulse text-lg text-slate-950" />
                <span>
                    <strong>MODO SUPLANTACIÓN ACTIVO:</strong> Estás navegando como{' '}
                    <span className="font-bold underline">
                        {currentUser?.name || currentUser?.nombre} ({currentUser?.role?.toUpperCase()})
                    </span>
                    {impersonator && (
                        <span className="ml-1.5 text-xs font-semibold opacity-90">
                            (Sesión original: {impersonator.name} - {impersonator.role})
                        </span>
                    )}
                </span>
            </div>
            <Button
                type="primary"
                danger
                size="small"
                icon={<SwapOutlined />}
                onClick={handleLeave}
                className="flex items-center gap-1 border-none bg-slate-900 text-xs font-semibold hover:bg-slate-800"
            >
                Regresar a mi cuenta original
            </Button>
        </div>
    );
}
