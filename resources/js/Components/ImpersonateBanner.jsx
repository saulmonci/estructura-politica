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
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md relative z-50 text-sm border-b border-amber-600">
            <div className="flex items-center gap-2 font-medium">
                <WarningOutlined className="text-lg text-slate-950 animate-pulse" />
                <span>
                    <strong>MODO SUPLANTACIÓN ACTIVO:</strong> Estás navegando como{' '}
                    <span className="underline font-bold">
                        {currentUser?.name || currentUser?.nombre} ({currentUser?.role?.toUpperCase()})
                    </span>
                    {impersonator && (
                        <span className="ml-1.5 opacity-90 text-xs font-semibold">
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
                className="bg-slate-900 hover:bg-slate-800 border-none font-semibold flex items-center gap-1 text-xs"
            >
                Regresar a mi cuenta original
            </Button>
        </div>
    );
}
