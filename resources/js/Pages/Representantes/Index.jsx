import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image, Switch } from 'antd';
import {
    PlusOutlined,
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    EditOutlined,
    DeleteOutlined,
    MailOutlined,
    GiftOutlined,
    DownloadOutlined,
    ReloadOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';
import axios from 'axios';

export default function RepresentantesIndex({ representantes, availablePresidentes }) {
    const { auth } = usePage().props;
    const modalRef = React.useRef();
    const [isApoyosOpen, setIsApoyosOpen] = useState(false);
    const [selectedRepresentante, setSelectedRepresentante] = useState(null);
    const actionRef = React.useRef();
    const [modal, contextHolder] = Modal.useModal();
    const [showTrashed, setShowTrashed] = useState(false);
    const [currentParams, setCurrentParams] = useState({});

    const handleExport = () => {
        const queryParams = new URLSearchParams();

        // Agregar params actuales
        Object.entries(currentParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'per_page') {
                if (Array.isArray(value)) {
                    value.forEach((v) => queryParams.append(`${key}[]`, v));
                } else {
                    queryParams.append(key, value);
                }
            }
        });

        // Agregar estado de eliminados
        if (showTrashed) {
            queryParams.append('trashed', '1');
        }

        window.location.href = `/representantes/export?${queryParams.toString()}`;
    };

    const handleCreate = () => {
        modalRef.current?.open();
    };

    const handleOpenApoyos = (record) => {
        setSelectedRepresentante(record);
        setIsApoyosOpen(true);
    };

    const handleImpersonate = (record) => {
        modal.confirm({
            title: '¿Impersonar representante?',
            content: `¿Deseas ingresar al sistema navegando en representación de ${record.name || record.nombre}?`,
            okText: 'Sí, impersonar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(`/impersonate/${record.id}`);
            },
        });
    };

    const handleEdit = (id) => {
        modalRef.current?.open(id, `/representantes/${id}`);
    };

    const handleDelete = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar este representante?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/representantes/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        if (actionRef.current) {
                            actionRef.current.reload();
                        }
                    },
                });
            },
        });
    };

    const handleRestore = (id) => {
        modal.confirm({
            title: '¿Estás seguro de restaurar este representante?',
            content: 'El representante volverá a estar activo.',
            okText: 'Sí, restaurar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(
                    `/representantes/${id}/restore`,
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            if (actionRef.current) {
                                actionRef.current.reload();
                            }
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
            render: (id) => <span className="font-medium text-blue-600">RD-{String(id).padStart(4, '0')}</span>,
        },
        {
            title: 'FOTO',
            dataIndex: 'foto_url',
            key: 'foto_url',
            width: 70,
            align: 'center',
            search: false,
            render: (fotoUrl) =>
                fotoUrl ? (
                    <Image
                        src={fotoUrl}
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
                        className="rounded-md bg-blue-100 text-blue-600"
                    />
                ),
        },
        {
            title: 'NOMBRE COMPLETO',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (name, record) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{name}</span>
                    {record.apodo && <span className="text-xs text-gray-500">"{record.apodo}"</span>}
                </div>
            ),
        },
        {
            title: 'TELÉFONO',
            dataIndex: 'telefono',
            key: 'telefono',
            render: (telefono) => (
                <span className="flex items-center text-gray-600">
                    <PhoneOutlined className="mr-2" /> {telefono || 'N/A'}
                </span>
            ),
        },
        {
            title: 'COLONIA / DEMARCACIÓN / SECCIÓN',
            key: 'colonia',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="flex items-center text-gray-600">
                        <EnvironmentOutlined className="mr-2" /> {record.colonia || 'Sin colonia'}
                        {record.codigo_postal ? ` (CP: ${record.codigo_postal})` : ''}
                    </span>
                    <div className="mt-0.5 flex flex-wrap gap-2">
                        {record.demarcacion_asignada && (
                            <span className="rounded border border-green-200 bg-green-50 px-1 text-xs font-bold text-green-600">
                                A cargo: {record.demarcacion_asignada.nombre}
                            </span>
                        )}
                        {record.demarcacion && (
                            <span className="text-xs text-blue-500">Info: {record.demarcacion.nombre}</span>
                        )}
                        {record.seccion_electoral && (
                            <span className="text-xs font-bold text-purple-500">
                                Sección: {record.seccion_electoral}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'DEMARCACIÓN',
            dataIndex: 'demarcacion_id',
            key: 'demarcacion_id',
            valueType: 'select',
            hideInTable: true,
            hideInSearch: auth?.user?.role !== 'presidente',
            request: async () => {
                const response = await axios.get('/catalogos/demarcaciones');
                return response.data.map((d) => ({ label: d.nombre, value: d.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Demarcación',
            },
        },
        {
            title: 'FECHA REGISTRO',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: true,
            valueType: 'dateRange',
            render: (_, record) => (
                <span className="flex items-center text-gray-600">
                    <CalendarOutlined className="mr-2" /> {new Date(record.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            title: 'OPERADORES',
            dataIndex: 'operadores_count',
            key: 'operadores_count',
            search: false,
            sorter: true,
            align: 'center',
            render: (count) => <Badge count={count || 0} showZero color="#108ee9" />,
        },
        {
            title: 'ESTADO',
            dataIndex: 'estado',
            key: 'estado',
            valueType: 'select',
            valueEnum: {
                1: { text: 'Activo', status: 'Success' },
                0: { text: 'Inactivo', status: 'Error' },
            },
            render: (_, record) => {
                const isActive =
                    record.estado === undefined ||
                    record.estado === 1 ||
                    record.estado === '1' ||
                    record.estado === true ||
                    record.estado === 'true';
                return <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Activo' : 'Inactivo'} />;
            },
        },
        {
            title: 'ACCIONES',
            key: 'acciones',
            width: 120,
            align: 'center',
            search: false,
            render: (_, record) => {
                if (record.deleted_at) {
                    return (
                        <Space size="middle">
                            <Button
                                type="text"
                                className="text-green-600"
                                icon={<ReloadOutlined />}
                                onClick={() => handleRestore(record.id)}
                                title="Restaurar"
                            />
                        </Space>
                    );
                }
                return (
                    <Space size="middle">
                        <Button
                            type="text"
                            icon={<GiftOutlined className="text-green-600" />}
                            title="Kardex de Apoyos"
                            onClick={() => handleOpenApoyos(record)}
                        />
                        <Button
                            type="text"
                            icon={<EditOutlined className="text-blue-600" />}
                            onClick={() => handleEdit(record.id)}
                            title="Editar"
                        />
                        {auth?.can_impersonate && record.id !== auth.user?.id && (
                            <Button
                                type="text"
                                icon={<SwapOutlined className="text-amber-600" />}
                                onClick={() => handleImpersonate(record)}
                                title="Impersonar usuario"
                            />
                        )}
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record.id)}
                            title="Eliminar"
                        />
                    </Space>
                );
            },
        },
    ];

    const renderMobileCard = (record) => {
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
                        {record.foto_url ? (
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
                                className="rounded-md bg-blue-100 text-blue-600"
                            />
                        )}
                        <div>
                            <div className="text-base font-semibold text-gray-800">{record.name}</div>
                            <div className="text-xs text-gray-500">
                                {record.apodo ? `"${record.apodo}"` : 'Representante (RD)'}
                            </div>
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
                            RD-{String(record.id).padStart(4, '0')}
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
                            {record.demarcacion_asignada ? ` (Cargo: ${record.demarcacion_asignada.nombre})` : ''}
                            {record.demarcacion ? ` (Info: ${record.demarcacion.nombre})` : ''}
                            {record.seccion_electoral ? ` (Sec: ${record.seccion_electoral})` : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <UserOutlined className="shrink-0 text-gray-400" />
                        <span className="w-18 shrink-0 text-gray-400">Operadores:</span>
                        <span className="flex-1 truncate">
                            <Badge count={record.operadores_count || 0} showZero color="#108ee9" />
                        </span>
                    </div>
                </div>

                <div className="flex justify-between border-t border-gray-100 pt-3">
                    {record.deleted_at ? (
                        <Button
                            type="text"
                            className="flex w-full items-center justify-center text-green-600"
                            icon={<ReloadOutlined />}
                            onClick={() => handleRestore(record.id)}
                        >
                            Restaurar
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="text"
                                icon={<GiftOutlined />}
                                className="flex w-1/3 items-center justify-center text-green-600"
                                onClick={() => handleOpenApoyos(record)}
                            >
                                Kardex
                            </Button>
                            <div className="my-1 w-px bg-gray-200"></div>
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                className="flex w-1/3 items-center justify-center text-blue-600"
                                onClick={() => handleEdit(record.id)}
                            >
                                Editar
                            </Button>
                            <div className="my-1 w-px bg-gray-200"></div>
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                className="flex w-1/3 items-center justify-center"
                                onClick={() => handleDelete(record.id)}
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
            {contextHolder}
            <Head title="Representantes de Demarcación" />

            <Card bordered={false} className="mobile-full-width-card shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="m-0 text-xl font-bold">Representantes de Demarcación</h2>
                        <p className="mt-1 text-sm text-gray-500">Lista de todos los RD asignados en el sistema.</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                        {['presidente', 'admin', 'superuser'].includes(auth?.user?.role) && (
                            <div className="mr-0 flex items-center gap-2 text-sm text-gray-600 sm:mr-4">
                                <span>Ver eliminados</span>
                                <Switch size="small" checked={showTrashed} onChange={setShowTrashed} />
                            </div>
                        )}
                        {['presidente', 'admin', 'superuser'].includes(auth?.user?.role) && (
                            <Button
                                type="default"
                                icon={<DownloadOutlined />}
                                onClick={handleExport}
                                className="w-full border-gray-300 sm:w-auto"
                            >
                                Descargar Excel
                            </Button>
                        )}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            className="w-full bg-[#0f172a] hover:bg-slate-800 sm:w-auto"
                            onClick={handleCreate}
                        >
                            Agregar Representante
                        </Button>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/representantes" // Cambiado a modo asíncrono puro
                    rowKey="id"
                    search={true}
                    mobileCardRender={renderMobileCard}
                    params={{ trashed: showTrashed ? '1' : '0' }}
                    onParamsChange={setCurrentParams}
                />
            </Card>

            <PersonaFormModal
                ref={modalRef}
                entityType="Representante"
                availablePresidentes={availablePresidentes || []}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />

            <ApoyosDrawer
                visible={isApoyosOpen}
                onClose={() => setIsApoyosOpen(false)}
                entity={selectedRepresentante}
                apiBasePath={selectedRepresentante ? `/representantes/${selectedRepresentante.id}` : null}
            />
        </MainLayout>
    );
}
