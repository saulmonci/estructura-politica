import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Space, Badge, Modal, Select, Tag } from 'antd';
import {
    PlusOutlined,
    EnvironmentOutlined,
    EditOutlined,
    DownloadOutlined,
    GlobalOutlined,
    CompassOutlined,
    UnorderedListOutlined,
    UserOutlined,
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import DemarcacionFormModal from './DemarcacionFormModal';
import SeccionesDrawer from '@/Components/SeccionesDrawer';

export default function DemarcacionesIndex() {
    const { auth, presidentes = [], currentPresidenteId = null, isGlobalAdmin = false } = usePage().props;
    const modalRef = React.useRef();
    const actionRef = React.useRef();
    const [modal, contextHolder] = Modal.useModal();
    const [selectedDemarcacion, setSelectedDemarcacion] = useState(null);
    const [isSeccionesOpen, setIsSeccionesOpen] = useState(false);
    const [selectedPresidenteId, setSelectedPresidenteId] = useState(currentPresidenteId);

    const handleCreate = () => {
        modalRef.current?.open(null, null, selectedPresidenteId);
    };

    const handleEdit = (id) => {
        modalRef.current?.open(id, `/demarcaciones/${id}`, selectedPresidenteId);
    };

    const handleOpenSecciones = (record) => {
        setSelectedDemarcacion(record);
        setIsSeccionesOpen(true);
    };

    const handlePresidenteChange = (val) => {
        setSelectedPresidenteId(val);
        if (actionRef.current) {
            setTimeout(() => {
                actionRef.current.reload();
            }, 50);
        }
    };

    const columns = [
        {
            title: 'NÚMERO',
            dataIndex: 'id',
            key: 'id',
            width: 100,
            sorter: true,
            render: (id) => <span className="font-bold text-blue-600">DEM-{id}</span>,
        },
        {
            title: 'NOMBRE DE LA DEMARCACIÓN',
            dataIndex: 'nombre',
            key: 'nombre',
            sorter: true,
            render: (nombre) => <span className="font-semibold text-gray-800">{nombre}</span>,
        },
        {
            title: 'META VOTANTES',
            dataIndex: 'meta',
            key: 'meta',
            sorter: true,
            render: (meta, record) => (
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{meta}</span>
                    {record.is_custom_meta ? (
                        <Tag color="blue" className="text-xs font-normal">
                            Personalizada
                        </Tag>
                    ) : (
                        <Tag color="default" className="text-xs font-normal text-gray-400">
                            Base
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: 'ACCIONES',
            key: 'acciones',
            width: 120,
            align: 'center',
            search: false,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<UnorderedListOutlined className="text-green-600" />}
                        onClick={() => handleOpenSecciones(record)}
                        title="Secciones"
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined className="text-blue-600" />}
                        onClick={() => handleEdit(record.id)}
                        title="Editar Demarcación"
                    />
                </Space>
            ),
        },
    ];

    const renderMobileCard = (record) => {
        return (
            <Card
                styles={{ body: { padding: '16px' } }}
                className="mb-4 w-full rounded-lg border border-gray-200 shadow-sm"
            >
                <div className="mb-3 flex items-start justify-between">
                    <div>
                        <div className="text-base font-bold text-gray-800">{record.nombre}</div>
                        <div className="mt-0.5 text-xs font-bold text-blue-600">Demarcación: {record.id}</div>
                    </div>
                    {record.is_custom_meta ? (
                        <Tag color="blue" className="text-xs">
                            Personalizada
                        </Tag>
                    ) : (
                        <Tag color="default" className="text-xs text-gray-400">
                            Base
                        </Tag>
                    )}
                </div>

                <div className="mb-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <CompassOutlined className="shrink-0 text-gray-400" />
                        <span className="w-24 shrink-0 text-gray-400">Meta Votantes:</span>
                        <span className="font-semibold text-gray-800">{record.meta}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                    <Button
                        type="primary"
                        icon={<UnorderedListOutlined />}
                        className="flex w-full items-center justify-center bg-[#0f172a] hover:bg-slate-800"
                        onClick={() => handleOpenSecciones(record)}
                    >
                        Ver Secciones
                    </Button>
                    <Button
                        type="default"
                        icon={<EditOutlined />}
                        className="flex w-full items-center justify-center border-blue-200 text-blue-600 hover:border-blue-400"
                        onClick={() => handleEdit(record.id)}
                    >
                        Editar
                    </Button>
                </div>
            </Card>
        );
    };

    const endpoint = `/demarcaciones${selectedPresidenteId ? `?presidente_id=${selectedPresidenteId}` : ''}`;

    return (
        <MainLayout>
            {contextHolder}
            <Head title="Administrar Demarcaciones" />

            <Card bordered={false} className="mobile-full-width-card shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="m-0 flex items-center gap-2 text-xl font-bold">
                            <EnvironmentOutlined /> Administrar Demarcaciones
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Configura las zonas electorales, sus metas por candidato y secciones electorales.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Button
                            type="default"
                            icon={<DownloadOutlined />}
                            onClick={() => (window.location.href = '/demarcaciones/export')}
                            className="w-full border-gray-300 sm:w-auto"
                        >
                            Descargar Excel
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            className="w-full bg-[#0f172a] hover:bg-slate-800 sm:w-auto"
                            onClick={handleCreate}
                        >
                            Agregar Demarcación
                        </Button>
                    </div>
                </div>

                {isGlobalAdmin && presidentes.length > 0 && (
                    <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <UserOutlined className="text-blue-600" />
                            <span>Viendo metas para el candidato:</span>
                        </div>
                        <Select
                            className="w-full sm:w-80"
                            placeholder="Selecciona un Presidente / Candidato"
                            allowClear
                            value={selectedPresidenteId}
                            onChange={handlePresidenteChange}
                            options={[
                                { label: '🌐 Meta Base General (Por Defecto)', value: null },
                                ...presidentes.map((p) => ({
                                    label: `👤 ${p.name || p.nombre} (${p.municipality?.nombre || 'Municipio'})`,
                                    value: p.id,
                                })),
                            ]}
                        />
                    </div>
                )}

                <TableCrud
                    key={selectedPresidenteId || 'global'}
                    actionRef={actionRef}
                    columns={columns}
                    endpoint={endpoint}
                    rowKey="id"
                    search={true}
                    mobileCardRender={renderMobileCard}
                />
            </Card>

            <DemarcacionFormModal
                ref={modalRef}
                presidenteId={selectedPresidenteId}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />

            <SeccionesDrawer
                visible={isSeccionesOpen}
                onClose={() => setIsSeccionesOpen(false)}
                demarcacion={selectedDemarcacion}
                presidenteId={selectedPresidenteId}
            />
        </MainLayout>
    );
}
