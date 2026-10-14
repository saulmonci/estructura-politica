import React, { useState, useRef } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image, Tag, message, Switch } from 'antd';
import {
    PlusOutlined,
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    EditOutlined,
    DeleteOutlined,
    MailOutlined,
    ReloadOutlined,
    TeamOutlined,
    CrownOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PresidenteFormModal from './PresidenteFormModal';
import axios from 'axios';

export default function PresidentesIndex() {
    const { auth } = usePage().props;
    const actionRef = useRef();
    const modalRef = useRef();
    const [modal, contextHolder] = Modal.useModal();
    const [showTrashed, setShowTrashed] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    const handleStatusToggle = async (record, checked) => {
        setTogglingId(record.id);
        try {
            await axios.post(`/presidentes/${record.id}/toggle-status`, {
                estado: checked ? 1 : 0,
            });
            message.success(`Estatus del presidente actualizado a ${checked ? 'Activo' : 'Inactivo'}`);
            actionRef.current?.reload();
        } catch (err) {
            console.error('Error al actualizar el estatus:', err);
            message.error('No se pudo actualizar el estatus del presidente');
        } finally {
            setTogglingId(null);
        }
    };

    const handleImpersonate = (record) => {
        modal.confirm({
            title: '¿Impersonar presidente?',
            content: `¿Deseas ingresar al sistema navegando en representación de ${record.nombre || record.name}?`,
            okText: 'Sí, impersonar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(`/impersonate/${record.id}`);
            },
        });
    };

    const handleCreate = () => {
        modalRef.current?.open();
    };

    const handleEdit = (record) => {
        modalRef.current?.open(record);
    };

    const handleDelete = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar este presidente?',
            content: 'Esta acción desactivará al presidente en la plataforma.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/presidentes/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        actionRef.current?.reload();
                    },
                });
            },
        });
    };

    const handleRestore = (id) => {
        modal.confirm({
            title: '¿Estás seguro de restaurar este presidente?',
            content: 'El presidente volverá a estar activo.',
            okText: 'Sí, restaurar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(
                    `/presidentes/${id}/restore`,
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            actionRef.current?.reload();
                        },
                    }
                );
            },
        });
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            search: false,
            render: (id) => <span className="font-medium text-blue-600">PRES-{String(id).padStart(4, '0')}</span>,
        },
        {
            title: 'FOTO',
            dataIndex: 'foto_url',
            key: 'foto_url',
            width: 70,
            align: 'center',
            search: false,
            render: (_, record) =>
                record?.foto_url && record.foto_url !== '-' ? (
                    <Image
                        src={record.foto_url}
                        width={44}
                        height={44}
                        className="rounded-md border border-blue-200 object-cover"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="bg-blue-100 font-bold text-blue-600"
                    />
                ),
        },
        {
            title: 'NOMBRE DEL PRESIDENTE',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                        {record.nombre || record.name} {record.apellidos || ''}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MailOutlined className="text-gray-400" /> {record.email}
                    </span>
                </div>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'state_id',
            key: 'state_id',
            valueType: 'select',
            hideInTable: true,
            request: async () => {
                const response = await axios.get('/catalogos/estados');
                return response.data.map((e) => ({ label: e.name || e.nombre, value: e.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Estado',
            },
        },
        {
            title: 'Municipio',
            dataIndex: 'municipality_id',
            key: 'municipality_id',
            valueType: 'select',
            hideInTable: true,
            dependencies: ['state_id'],
            request: async (params) => {
                const stateId = params?.state_id;
                const url = stateId ? `/catalogos/municipios?state_id=${stateId}` : '/catalogos/municipios';
                const response = await axios.get(url);
                return response.data.map((m) => ({ label: m.name || m.nombre, value: m.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Municipio',
            },
        },
        {
            title: 'ESTADO / MUNICIPIO',
            key: 'ubicacion',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col text-xs">
                    <span className="font-medium text-gray-700">
                        <EnvironmentOutlined className="mr-1 text-blue-500" />
                        {record.municipality?.nombre || record.municipality?.name || 'N/A'}
                    </span>
                    <span className="pl-4 text-gray-400">{record.state?.nombre || record.state?.name || 'N/A'}</span>
                </div>
            ),
        },
        {
            title: 'TELÉFONO',
            dataIndex: 'telefono',
            key: 'telefono',
            width: 130,
            render: (tel) => (
                <span className="text-xs text-gray-600">
                    <PhoneOutlined className="mr-1 text-gray-400" />
                    {tel || 'N/A'}
                </span>
            ),
        },
        {
            title: 'ESTRUCTURA A CARGO',
            key: 'estructura',
            search: false,
            render: (_, record) => (
                <div className="flex items-center gap-2">
                    <Tag color="blue">{record.rds_count || 0} RD</Tag>
                    <Tag color="purple">{record.operadores_count || 0} Op</Tag>
                    <Tag color="cyan">{record.promotores_count || 0} Prom</Tag>
                </div>
            ),
        },
        {
            title: 'ESTATUS',
            dataIndex: 'estado',
            key: 'estado',
            width: 130,
            valueType: 'select',
            valueEnum: {
                true: { text: 'Activo', status: 'Success' },
                false: { text: 'Inactivo', status: 'Error' },
            },
            render: (_, record) =>
                record.deleted_at ? (
                    <Badge status="default" text="Eliminado" />
                ) : (
                    <Switch
                        checked={Boolean(record.estado)}
                        loading={togglingId === record.id}
                        checkedChildren="Activo"
                        unCheckedChildren="Inactivo"
                        onChange={(checked) => handleStatusToggle(record, checked)}
                    />
                ),
        },
    ];

    const renderMobileCard = (record) => {
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
                                onChange={(checked) => handleStatusToggle(record, checked)}
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
                            onClick={() => handleRestore(record.id)}
                            className="border-green-200 text-xs text-green-600"
                        >
                            Restaurar
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="default"
                                icon={<EditOutlined className="text-blue-600" />}
                                onClick={() => handleEdit(record)}
                                size="small"
                                className="border-gray-300 text-xs"
                            >
                                Editar
                            </Button>
                            {auth?.can_impersonate && record.id !== auth.user?.id && (
                                <Button
                                    type="default"
                                    icon={<SwapOutlined className="text-amber-600" />}
                                    onClick={() => handleImpersonate(record)}
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
                                onClick={() => handleDelete(record.id)}
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
    };

    return (
        <MainLayout>
            <Head title="Gestión de Presidentes Municipales" />
            {contextHolder}

            <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                            <CrownOutlined className="text-amber-500" />
                            Presidentes Municipales / Coordinadores
                        </h1>
                        <p className="text-sm text-gray-500">
                            Módulo exclusivo de administración global de Presidentes para el rol Superuser.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs">
                            <span className="text-gray-600">Ver Eliminados:</span>
                            <input
                                type="checkbox"
                                checked={showTrashed}
                                onChange={(e) => {
                                    setShowTrashed(e.target.checked);
                                    actionRef.current?.reload();
                                }}
                                className="cursor-pointer rounded text-blue-600 focus:ring-blue-500"
                            />
                        </div>

                        <TableCrud.ExportButton
                            actionRef={actionRef}
                            endpoint="/presidentes"
                            label="Exportar"
                            className="border-gray-300 bg-white text-gray-700 hover:text-blue-600"
                        />

                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCreate}
                            className="bg-amber-500 font-medium hover:bg-amber-600"
                        >
                            Nuevo Presidente
                        </Button>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/presidentes"
                    rowKey="id"
                    search={true}
                    onEdit={handleEdit}
                    onDelete={(record) => handleDelete(record.id)}
                    onRestore={(record) => handleRestore(record.id)}
                    onImpersonate={handleImpersonate}
                    editTitle="Editar Presidente"
                    deleteTitle="Eliminar Presidente"
                    restoreTitle="Restaurar Presidente"
                    mobileCardRender={renderMobileCard}
                    params={{ trashed: showTrashed ? '1' : '0' }}
                />
            </div>

            {/* Modal de Registro / Edición de Presidente */}
            <PresidenteFormModal
                ref={modalRef}
                onSuccess={() => {
                    actionRef.current?.reload();
                }}
            />
        </MainLayout>
    );
}
