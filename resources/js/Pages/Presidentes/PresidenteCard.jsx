import React from 'react';
import { Card, Button, Avatar, Badge, Image, Switch, Tag } from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    EditOutlined,
    DeleteOutlined,
    MailOutlined,
    TeamOutlined,
    ReloadOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import { usePage } from '@inertiajs/react';

export default function PresidenteCard({ record, actionsNode, handlers, onStatusToggle, togglingId }) {
    const { auth } = usePage().props;

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
                            className="rounded-md border border-blue-200 object-cover"
                            style={{ borderRadius: '6px' }}
                        />
                    ) : (
                        <Avatar
                            shape="square"
                            size={48}
                            icon={<UserOutlined />}
                            className="rounded-md bg-amber-100 font-bold text-amber-600"
                        />
                    )}
                    <div>
                        <div className="text-base font-semibold text-gray-800">
                            {record.nombre || record.name} {record.apellidos || ''}
                        </div>
                        <div className="text-xs font-medium text-blue-600">
                            PRES-{String(record.id).padStart(4, '0')}
                        </div>
                    </div>
                </div>
                <div>
                    {record.deleted_at ? (
                        <Badge
                            status="default"
                            text="Eliminado"
                            className="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs"
                        />
                    ) : (
                        <Switch
                            checked={Boolean(record.estado)}
                            loading={togglingId === record.id}
                            checkedChildren="Activo"
                            unCheckedChildren="Inactivo"
                            onChange={(checked) => onStatusToggle?.(record, checked)}
                        />
                    )}
                </div>
            </div>

            <div className="mb-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <MailOutlined className="shrink-0 text-gray-400" />
                    <span className="w-16 shrink-0 text-gray-400">Email:</span>
                    <span className="flex-1 truncate text-gray-800" title={record.email}>
                        {record.email || 'N/A'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <PhoneOutlined className="shrink-0 text-gray-400" />
                    <span className="w-16 shrink-0 text-gray-400">Teléfono:</span>
                    <span className="flex-1 truncate text-gray-800">{record.telefono || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-2">
                    <EnvironmentOutlined className="mt-0.5 shrink-0 text-blue-500" />
                    <span className="w-16 shrink-0 text-gray-400">Ubicación:</span>
                    <span className="flex-1 truncate text-gray-800">
                        {record.municipality?.nombre || record.municipality?.name || 'N/A'},{' '}
                        {record.state?.nombre || record.state?.name || 'N/A'}
                    </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <TeamOutlined className="shrink-0 text-gray-400" />
                    <span className="w-16 shrink-0 text-gray-400">Estructura:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Tag color="blue" className="mr-0">
                            {record.rds_count || 0} RD
                        </Tag>
                        <Tag color="purple" className="mr-0">
                            {record.operadores_count || 0} Op
                        </Tag>
                        <Tag color="cyan" className="mr-0">
                            {record.promotores_count || 0} Prom
                        </Tag>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                {record.deleted_at ? (
                    <Button
                        type="default"
                        icon={<ReloadOutlined className="text-green-600" />}
                        onClick={handlers?.restore}
                        className="border-green-200 text-xs text-green-600"
                    >
                        Restaurar
                    </Button>
                ) : (
                    <>
                        <Button
                            type="default"
                            icon={<EditOutlined className="text-blue-600" />}
                            onClick={handlers?.edit}
                            size="small"
                            className="border-gray-300 text-xs"
                        >
                            Editar
                        </Button>
                        {auth?.can_impersonate && record.id !== auth.user?.id && (
                            <Button
                                type="default"
                                icon={<SwapOutlined className="text-amber-600" />}
                                onClick={handlers?.impersonate}
                                size="small"
                                className="border-amber-300 bg-amber-50 text-xs text-amber-700"
                            >
                                Impersonar
                            </Button>
                        )}
                        <Button
                            type="default"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handlers?.delete}
                            size="small"
                            className="text-xs"
                        >
                            Eliminar
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
}
