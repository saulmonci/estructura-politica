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
    UserOutlined
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
            render: (id) => (
                <span className="text-blue-600 font-bold">DEM-{id}</span>
            ),
        },
        {
            title: 'NOMBRE DE LA DEMARCACIÓN',
            dataIndex: 'nombre',
            key: 'nombre',
            sorter: true,
            render: (nombre) => (
                <span className="font-semibold text-gray-800">{nombre}</span>
            )
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
                        <Tag color="blue" className="text-xs font-normal">Personalizada</Tag>
                    ) : (
                        <Tag color="default" className="text-xs font-normal text-gray-400">Base</Tag>
                    )}
                </div>
            )
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
            )
        }
    ];

    const renderMobileCard = (record) => {
        return (
            <Card styles={{ body: { padding: '16px' } }} className="mb-4 shadow-sm rounded-lg border border-gray-200 w-full">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <div className="font-bold text-base text-gray-800">{record.nombre}</div>
                        <div className="text-xs text-blue-600 font-bold mt-0.5">Demarcación: {record.id}</div>
                    </div>
                    {record.is_custom_meta ? (
                        <Tag color="blue" className="text-xs">Personalizada</Tag>
                    ) : (
                        <Tag color="default" className="text-xs text-gray-400">Base</Tag>
                    )}
                </div>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <CompassOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-24 text-gray-400 shrink-0">Meta Votantes:</span> 
                        <span className="font-semibold text-gray-800">{record.meta}</span>
                    </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                    <Button type="primary" icon={<UnorderedListOutlined />} className="bg-[#0f172a] hover:bg-slate-800 w-full flex justify-center items-center" onClick={() => handleOpenSecciones(record)}>Ver Secciones</Button>
                    <Button type="default" icon={<EditOutlined />} className="text-blue-600 border-blue-200 hover:border-blue-400 w-full flex justify-center items-center" onClick={() => handleEdit(record.id)}>Editar</Button>
                </div>
            </Card>
        );
    };

    const endpoint = `/demarcaciones${selectedPresidenteId ? `?presidente_id=${selectedPresidenteId}` : ''}`;

    return (
        <MainLayout>
            {contextHolder}
            <Head title="Administrar Demarcaciones" />

            <Card bordered={false} className="shadow-sm mobile-full-width-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0 flex items-center gap-2">
                            <EnvironmentOutlined /> Administrar Demarcaciones
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Configura las zonas electorales, sus metas por candidato y secciones electorales.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button 
                            type="default" 
                            icon={<DownloadOutlined />} 
                            onClick={() => window.location.href = '/demarcaciones/export'}
                            className="w-full sm:w-auto border-gray-300"
                        >
                            Descargar Excel
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-[#0f172a] hover:bg-slate-800 w-full sm:w-auto" onClick={handleCreate}>
                            Agregar Demarcación
                        </Button>
                    </div>
                </div>

                {isGlobalAdmin && presidentes.length > 0 && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
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
                                ...presidentes.map(p => ({
                                    label: `👤 ${p.name || p.nombre} (${p.municipality?.nombre || 'Municipio'})`,
                                    value: p.id
                                }))
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
