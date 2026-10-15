import React from 'react';
import { Card, Button, Avatar, Badge, Image } from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    EditOutlined,
    DeleteOutlined,
    TeamOutlined,
    GiftOutlined,
    ReloadOutlined,
    IdcardOutlined,
    SafetyCertificateOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { usePage } from '@inertiajs/react';

export default function PromovidoCard({
    record,
    actionsNode,
    handlers,
    onOpenApoyos,
    availablePromotores: propPromotores,
}) {
    const { availablePromotores: pagePromotores } = usePage().props;
    const availablePromotores = propPromotores || pagePromotores || [];

    return (
        <Card
            styles={{ body: { padding: '16px' } }}
            className="mb-4 w-full rounded-lg border border-gray-200 shadow-sm"
        >
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    {record.foto_url && record.foto_url !== '-' ? (
                        <Image
                            src={record.foto_url}
                            width={48}
                            height={48}
                            className="rounded-md object-cover"
                            style={{ borderRadius: '6px' }}
                        />
                    ) : (
                        <Avatar
                            shape="square"
                            size={48}
                            icon={<UserOutlined />}
                            className="rounded-md bg-gray-100 text-gray-600"
                        />
                    )}
                    <div>
                        <div className="text-base font-semibold text-gray-800">
                            {record.nombre} {record.apellidos}
                        </div>
                        <div className="text-xs text-gray-500">Promovido (Simpatizante)</div>
                    </div>
                </div>
                {record.deleted_at && (
                    <Badge
                        status="error"
                        text="Eliminado"
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs"
                    />
                )}
            </div>

            <div className="scrollable-card-content mb-4 max-h-56 space-y-2.5 overflow-y-auto pr-2 text-sm text-gray-600">
                <style>{`
                    .scrollable-card-content::-webkit-scrollbar {
                        width: 4px;
                    }
                    .scrollable-card-content::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 4px;
                    }
                    .scrollable-card-content::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                    }
                `}</style>
                <div className="flex items-center gap-2">
                    <UserOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">ID:</span>
                    <span className="flex-1 truncate font-semibold text-gray-800">
                        #{String(record.id).padStart(5, '0')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <IdcardOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Clave Elector:</span>
                    <span className="flex-1 truncate text-gray-800">{record.clave_elector || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <SafetyCertificateOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">CURP:</span>
                    <span className="flex-1 truncate font-mono text-gray-800 uppercase">{record.curp || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <PhoneOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Teléfono:</span>
                    <span className="flex-1 truncate text-gray-800">{record.telefono || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-2">
                    <EnvironmentOutlined className="mt-0.5 shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Calle:</span>
                    <span className="flex-1 truncate text-gray-800" title={record.calle}>
                        {record.calle || 'N/A'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <EnvironmentOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Número:</span>
                    <span className="flex-1 truncate text-gray-800">{record.numero || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <EnvironmentOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Colonia:</span>
                    <span className="flex-1 truncate text-gray-800" title={record.colonia}>
                        {record.colonia || 'N/A'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <EnvironmentOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">C. Postal:</span>
                    <span className="flex-1 truncate text-gray-800">{record.codigo_postal || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <EnvironmentOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Demarcación:</span>
                    <span className="flex-1 truncate text-gray-800">{record.demarcacion?.nombre || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <EnvironmentOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Sección:</span>
                    <span className="flex-1 truncate text-gray-800">{record.seccion_electoral || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <TeamOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Promotor:</span>
                    <span className="flex-1 truncate font-medium text-gray-800">
                        {(() => {
                            const p = (availablePromotores || []).find((p) => p.id === record.promotor_id);
                            return p ? (p.apodo ? `${p.name} (${p.apodo})` : p.name) : 'No asignado';
                        })()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Registro:</span>
                    <span className="flex-1 truncate text-xs text-gray-800">
                        {new Date(record.created_at).toLocaleString('es-MX')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarOutlined className="shrink-0 text-gray-400" />
                    <span className="w-20 shrink-0 font-medium text-gray-400">Modificado:</span>
                    <span className="flex-1 truncate text-xs text-gray-800">
                        {new Date(record.updated_at).toLocaleString('es-MX')}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap justify-between border-t border-gray-100 pt-3">
                {record.deleted_at ? (
                    <Button
                        type="text"
                        className="flex w-full items-center justify-center text-green-600"
                        icon={<ReloadOutlined />}
                        onClick={handlers?.restore}
                    >
                        Restaurar
                    </Button>
                ) : (
                    <>
                        <Button
                            type="text"
                            icon={<GiftOutlined />}
                            className="flex w-1/3 items-center justify-center text-green-600"
                            onClick={() => onOpenApoyos?.(record)}
                        >
                            Kardex
                        </Button>
                        <div className="my-1 w-px bg-gray-200"></div>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            className="flex w-1/3 items-center justify-center text-blue-600"
                            onClick={handlers?.edit}
                        >
                            Editar
                        </Button>
                        <div className="my-1 w-px bg-gray-200"></div>
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            className="flex w-1/3 items-center justify-center"
                            onClick={handlers?.delete}
                        >
                            Eliminar
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
}
