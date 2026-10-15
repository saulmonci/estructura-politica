import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, usePage } from '@inertiajs/react';
import { Card, Button, Select, Tag } from 'antd';
import { EnvironmentOutlined, UnorderedListOutlined, UserOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import DemarcacionFormModal from './DemarcacionFormModal';
import SeccionesDrawer from '@/Components/SeccionesDrawer';
import DemarcacionCard from './DemarcacionCard';

export default function DemarcacionesIndex() {
    const { presidentes = [], currentPresidenteId = null, isGlobalAdmin = false } = usePage().props;
    const modalRef = React.useRef();
    const actionRef = React.useRef();
    const seccionesDrawerRef = React.useRef();
    const [selectedPresidenteId, setSelectedPresidenteId] = useState(currentPresidenteId);

    const handleOpenSecciones = (record) => {
        seccionesDrawerRef.current?.open(record, selectedPresidenteId);
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
    ];

    const endpoint = `/demarcaciones${selectedPresidenteId ? `?presidente_id=${selectedPresidenteId}` : ''}`;

    return (
        <MainLayout>
            <Head title="Administrar Demarcaciones" />

            <Card variant="borderless" className="mobile-full-width-card shadow-sm">
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
                        <TableCrud.ExportButton actionRef={actionRef} endpoint="/demarcaciones" />
                        <TableCrud.CreateButton
                            modalRef={modalRef}
                            resourceName="demarcación"
                            label="Agregar Demarcación"
                            className="w-full bg-[#0f172a] hover:bg-slate-800 sm:w-auto"
                        />
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
                                { label: '🌐 Meta Base General (Por Defecto)', value: '' },
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
                    modalRef={modalRef}
                    resourceName="demarcación"
                    columns={columns}
                    endpoint={endpoint}
                    rowKey="id"
                    search={true}
                    onDelete={false}
                    extraActions={(record) => [
                        <Button
                            key="secciones"
                            type="text"
                            icon={<UnorderedListOutlined className="text-green-600" />}
                            onClick={() => handleOpenSecciones(record)}
                            title="Secciones"
                        />,
                    ]}
                    mobileCardRender={(record, actionsNode, handlers) => (
                        <DemarcacionCard
                            record={record}
                            actionsNode={actionsNode}
                            handlers={handlers}
                            onOpenSecciones={handleOpenSecciones}
                        />
                    )}
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

            <SeccionesDrawer ref={seccionesDrawerRef} />
        </MainLayout>
    );
}
