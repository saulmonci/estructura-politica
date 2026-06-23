import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Space, Badge, Modal } from 'antd';
import { 
    PlusOutlined, 
    EnvironmentOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    DownloadOutlined, 
    GlobalOutlined,
    CompassOutlined
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import DemarcacionFormModal from './DemarcacionFormModal';

export default function DemarcacionesIndex() {
    const { auth } = usePage().props;
    const modalRef = React.useRef();
    const actionRef = React.useRef();

    const handleCreate = () => {
        modalRef.current?.open();
    };

    const handleEdit = (id) => {
        modalRef.current?.open(id, `/demarcaciones/${id}`);
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: '¿Estás seguro de eliminar esta demarcación?',
            content: 'Esta acción no se puede deshacer y puede dejar sin demarcación a los usuarios y promovidos asignados a ella.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/demarcaciones/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        if (actionRef.current) {
                            actionRef.current.reload();
                        }
                    }
                });
            }
        });
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
            render: (meta) => (
                <span className="font-bold text-gray-700">{meta}</span>
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
                        icon={<EditOutlined className="text-blue-600" />} 
                        onClick={() => handleEdit(record.id)}
                    />
                    <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDelete(record.id)}
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
                </div>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <CompassOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-24 text-gray-400 shrink-0">Meta Votantes:</span> 
                        <span className="font-semibold text-gray-800">{record.meta}</span>
                    </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100 flex justify-between">
                    <Button type="text" icon={<EditOutlined />} className="text-blue-600 w-1/2 flex justify-center items-center" onClick={() => handleEdit(record.id)}>Editar</Button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <Button type="text" danger icon={<DeleteOutlined />} className="w-1/2 flex justify-center items-center" onClick={() => handleDelete(record.id)}>Eliminar</Button>
                </div>
            </Card>
        );
    };

    return (
        <MainLayout>
            <Head title="Administrar Demarcaciones" />

            <Card bordered={false} className="shadow-sm mobile-full-width-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0 flex items-center gap-2">
                            <EnvironmentOutlined /> Administrar Demarcaciones
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Configura las zonas electorales, sus metas y límites geográficos en el mapa.</p>
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

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/demarcaciones"
                    rowKey="id"
                    search={true} 
                    mobileCardRender={renderMobileCard}
                />
            </Card>

            <DemarcacionFormModal 
                ref={modalRef}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />
        </MainLayout>
    );
}
