import React from 'react';
import { Card, Button, Avatar, Badge, Image } from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    EditOutlined,
    DeleteOutlined,
    TeamOutlined,
    MailOutlined,
    GiftOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { usePage } from '@inertiajs/react';

export default function PromotorCard({ record, actionsNode, handlers, onOpenApoyos }) {
    const { auth } = usePage().props;

    const isActive =
        record.estado === undefined ||
        record.estado === 1 ||
        record.estado === '1' ||
        record.estado === true ||
        record.estado === 'true';

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
                            className="rounded-md bg-orange-100 text-orange-600"
                        />
                    )}
                    <div>
                        <div className="text-base font-semibold text-gray-800">{record.name}</div>
                        <div className="text-xs text-gray-500">{record.apodo ? `"${record.apodo}"` : 'Promotor'}</div>
                    </div>
                </div>
                {record.deleted_at ? (
                    <Badge
                        status="error"
                        text="Eliminado"
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs"
                    />
                ) : (
                    <Badge
                        status={isActive ? 'success' : 'error'}
                        text={isActive ? 'Activo' : 'Inactivo'}
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
                    />
                )}
            </div>

            <div className="mb-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <UserOutlined className="shrink-0 text-gray-400" />
                    <span className="w-14 shrink-0 text-gray-400">ID:</span>
                    <span className="flex-1 truncate font-medium text-gray-800">
                        PR-{String(record.id).padStart(4, '0')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <PhoneOutlined className="shrink-0 text-gray-400" />
                    <span className="w-14 shrink-0 text-gray-400">Tel:</span>
                    <span className="flex-1 truncate">{record.telefono || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MailOutlined className="shrink-0 text-gray-400" />
                    <span className="w-14 shrink-0 text-gray-400">Email:</span>
                    <span className="flex-1 truncate text-xs sm:text-sm" title={record.email}>
                        {record.email || 'N/A'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <EnvironmentOutlined className="shrink-0 text-gray-400" />
                    <span className="w-18 shrink-0 text-gray-400">Ubicación:</span>
                    <span className="flex-1 truncate">
                        {record.colonia || 'Sin colonia'}
                        {record.codigo_postal ? ` (CP: ${record.codigo_postal})` : ''}
                        {record.demarcacion ? ` (Dem: ${record.demarcacion.nombre})` : ''}
                        {record.seccion_electoral ? ` (Sec: ${record.seccion_electoral})` : ''}
                    </span>
                </div>
                {['presidente', 'admin', 'superadmin', 'rd'].includes(auth?.user?.role) && (
                    <div className="flex items-center gap-2">
                        <TeamOutlined className="shrink-0 text-gray-400" />
                        <span className="w-20 shrink-0 text-gray-400">Operador:</span>
                        <span className="flex-1 truncate font-medium text-orange-700">
                            {record.leader
                                ? `${record.leader.name} ${record.leader.apodo ? `(${record.leader.apodo})` : ''}`
                                : 'Sin asignar'}
                        </span>
                    </div>
                )}
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
                            className="flex w-1/3 items-center justify-center text-orange-600"
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
