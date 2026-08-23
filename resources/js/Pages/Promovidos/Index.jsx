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
    TeamOutlined,
    UsergroupAddOutlined,
    IdcardOutlined,
    MailOutlined,
    DownloadOutlined,
    SafetyCertificateOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PromovidoFormModal from '@/Components/PromovidoFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';
import { GiftOutlined } from '@ant-design/icons';

export default function PromovidosIndex({ availablePromotores }) {
    const { auth } = usePage().props;
    const modalRef = React.useRef();
    const [isApoyosOpen, setIsApoyosOpen] = useState(false);
    const [selectedPromovido, setSelectedPromovido] = useState(null);
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

        window.location.href = `/promovidos/export?${queryParams.toString()}`;
    };

    const handleCreate = () => {
        modalRef.current?.open();
    };

    const handleEdit = (id) => {
        modalRef.current?.open(id, `/promovidos/${id}`);
    };

    const handleOpenApoyos = (record) => {
        setSelectedPromovido(record);
        setIsApoyosOpen(true);
    };

    const handleDelete = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar este promovido?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/promovidos/${id}`, {
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
            title: '¿Estás seguro de restaurar este promovido?',
            content: 'El promovido volverá a estar activo.',
            okText: 'Sí, restaurar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(
                    `/promovidos/${id}/restore`,
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
            render: (id) => <span className="font-medium text-gray-600">#{String(id).padStart(5, '0')}</span>,
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
                        className="rounded-md object-cover"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="rounded-md bg-gray-100 text-gray-600"
                    />
                ),
        },
        {
            title: 'NOMBRE',
            dataIndex: 'nombre',
            key: 'nombre',
            sorter: true,
            render: (nombre, record) => (
                <div className="flex flex-col">
                    <span className="font-semibold">
                        {nombre} {record.apellidos}
                    </span>
                </div>
            ),
        },
        {
            title: 'APELLIDOS',
            dataIndex: 'apellidos',
            key: 'apellidos',
            hideInTable: true,
        },
        {
            title: 'IDENTIFICACIÓN',
            key: 'identificacion',
            render: (_, record) => (
                <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                    <span className="flex items-center">
                        <IdcardOutlined className="mr-2" /> Clave: {record.clave_elector || 'N/A'}
                    </span>
                    {record.curp && (
                        <span className="flex items-center font-mono">
                            <SafetyCertificateOutlined className="mr-2 text-green-600" /> CURP: {record.curp}
                        </span>
                    )}
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

        // ------------------ FILTROS TERRITORIALES EN CASCADA ------------------
        {
            title: 'Estado',
            dataIndex: 'state_id',
            key: 'state_id',
            valueType: 'select',
            hideInTable: true,
            hideInSearch: auth?.user?.scope_level !== 'estatal' && auth?.user?.role !== 'superuser',
            request: async () => {
                const response = await axios.get('/catalogos/estados');
                return response.data.map((e) => ({ label: e.nombre, value: e.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Estado',
                disabled: auth?.user?.scope_level === 'estatal' && auth?.user?.role !== 'superuser',
            },
        },
        {
            title: 'Municipio',
            dataIndex: 'municipality_id',
            key: 'municipality_id',
            valueType: 'select',
            hideInTable: true,
            hideInSearch: auth?.user?.scope_level === 'demarcacion',
            dependencies: ['state_id'],
            request: async (params) => {
                const isMunicipal = auth?.user?.scope_level === 'municipal' && auth?.user?.role !== 'superuser';
                if (isMunicipal) {
                    return [
                        {
                            label: auth?.user?.municipality?.nombre || 'Mi Municipio',
                            value: auth?.user?.municipality_id,
                        },
                    ];
                }
                const activeStateId =
                    auth?.user?.scope_level === 'estatal' && auth?.user?.role !== 'superuser'
                        ? auth?.user?.state_id
                        : params.state_id;

                if (!activeStateId) return [];
                const response = await axios.get(`/catalogos/municipios?state_id=${activeStateId}`);
                return response.data.map((m) => ({ label: m.nombre, value: m.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Municipio',
                disabled: auth?.user?.scope_level === 'municipal' && auth?.user?.role !== 'superuser',
            },
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
        // ------------------ FIN FILTROS TERRITORIALES ------------------

        {
            title: 'DIRECCIÓN / UBICACIÓN',
            key: 'direccion',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-800">
                        {record.calle ? `${record.calle} ${record.numero || ''}`.trim() : 'Sin calle'}
                    </span>
                    <span className="flex items-center text-xs text-gray-500">
                        <EnvironmentOutlined className="mr-1" /> {record.colonia || 'Sin colonia'}{' '}
                        {record.codigo_postal ? `(CP: ${record.codigo_postal})` : ''}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5 text-xs">
                        {record.state && <span className="text-gray-500">Estado: {record.state.nombre}</span>}
                        {record.municipality && (
                            <span className="text-gray-500">Municipio: {record.municipality.nombre}</span>
                        )}
                        {record.demarcacion && (
                            <span className="text-orange-500">Demarcación: {record.demarcacion.nombre}</span>
                        )}
                        {record.seccion_electoral && (
                            <span className="font-bold text-blue-500">Sección: {record.seccion_electoral}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'FECHA REGISTRO',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: true,
            valueType: 'dateRange',
            render: (_, record) => (
                <span className="flex items-center text-xs text-gray-600">
                    <CalendarOutlined className="mr-2" /> {new Date(record.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            title: 'ACCIONES',
            key: 'acciones',
            width: 150,
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
                            title="Editar"
                            onClick={() => handleEdit(record.id)}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title="Eliminar"
                            onClick={() => handleDelete(record.id)}
                        />
                    </Space>
                );
            },
        },
        {
            title: 'PROMOTOR ASIGNADO',
            dataIndex: 'promotor_id',
            key: 'promotor_id',
            valueType: 'select',
            valueEnum: (availablePromotores || []).reduce((acc, p) => {
                acc[p.id] = { text: p.apodo ? `${p.name} (${p.apodo})` : p.name };
                return acc;
            }, {}),
            render: (_, record) => {
                const p = (availablePromotores || []).find((p) => p.id === record.promotor_id);
                return p ? (
                    <span className="text-xs font-medium text-gray-700">
                        {p.name} {p.apodo ? `("${p.apodo}")` : ''}
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">No asignado</span>
                );
            },
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
                        <span className="flex-1 truncate font-mono text-gray-800 uppercase">
                            {record.curp || 'N/A'}
                        </span>
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
            <Head title="Promovidos" />

            <Card bordered={false} className="mobile-full-width-card shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="m-0 text-xl font-bold">Promovidos (Simpatizantes)</h2>
                        <p className="mt-1 text-sm text-gray-500">Lista de personas registradas por los promotores.</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                        {['presidente', 'admin', 'superuser'].includes(auth?.user?.role) && (
                            <div className="mr-0 flex items-center gap-2 text-sm text-gray-600 sm:mr-4">
                                <span>Ver eliminados</span>
                                <Switch size="small" checked={showTrashed} onChange={setShowTrashed} />
                            </div>
                        )}
                        {['presidente', 'rd'].includes(auth?.user?.role) && (
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
                            className="w-full bg-gray-800 hover:bg-gray-700 sm:w-auto"
                            onClick={handleCreate}
                        >
                            Agregar Promovido
                        </Button>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/promovidos"
                    rowKey="id"
                    search={true}
                    mobileCardRender={renderMobileCard}
                    params={{ trashed: showTrashed ? '1' : '0' }}
                    onParamsChange={setCurrentParams}
                />

                <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 lg:flex-row">
                    <p className="m-0 flex-1 text-sm text-gray-600">
                        <span className="mr-2 text-blue-500">ℹ️</span>
                        Esta es la base principal de la estructura electoral. Los promovidos son registrados
                        directamente por los promotores en el campo.
                    </p>
                </div>
            </Card>

            <PromovidoFormModal
                ref={modalRef}
                availablePromotores={availablePromotores || []}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />

            <ApoyosDrawer visible={isApoyosOpen} onClose={() => setIsApoyosOpen(false)} promovido={selectedPromovido} />
        </MainLayout>
    );
}
