import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UsergroupAddOutlined, IdcardOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PromovidoFormModal from '@/Components/PromovidoFormModal';

export default function PromovidosIndex({ availablePromotores }) {
    const { auth } = usePage().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const actionRef = React.useRef();

    const handleCreate = () => {
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id) => {
        setEditingId(id);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: '¿Estás seguro de eliminar este promovido?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/promovidos/${id}`, {
                    preserveScroll: true,
                });
            }
        });
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            search: false,
            render: (id) => (
                <span className="text-gray-600 font-medium">#{String(id).padStart(5, '0')}</span>
            ),
        },
        {
            title: 'NOMBRE COMPLETO',
            dataIndex: 'nombre_completo',
            key: 'nombre_completo',
            sorter: true,
            render: (name) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} className="bg-gray-100 text-gray-600" />
                    <span className="font-semibold">{name}</span>
                </Space>
            )
        },
        {
            title: 'CLAVE ELECTOR',
            dataIndex: 'clave_elector',
            key: 'clave_elector',
            render: (clave) => (
                <span className="text-gray-600 flex items-center text-xs">
                    <IdcardOutlined className="mr-2" /> {clave || 'N/A'}
                </span>
            )
        },
        {
            title: 'TELÉFONO',
            dataIndex: 'telefono',
            key: 'telefono',
            render: (telefono) => (
                <span className="text-gray-600 flex items-center">
                    <PhoneOutlined className="mr-2" /> {telefono || 'N/A'}
                </span>
            )
        },
        {
            title: 'COLONIA / SECCIÓN',
            key: 'colonia',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-gray-600 flex items-center">
                        <EnvironmentOutlined className="mr-2" /> {record.colonia || 'Sin colonia'}
                    </span>
                    {record.seccion_electoral && <span className="text-xs text-blue-500 font-bold">Sección: {record.seccion_electoral}</span>}
                </div>
            )
        },
        {
            title: 'FECHA REGISTRO',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: true,
            valueType: 'dateRange',
            render: (_, record) => (
                <span className="text-gray-600 flex items-center text-xs">
                    <CalendarOutlined className="mr-2" /> {new Date(record.created_at).toLocaleDateString()}
                </span>
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
        },
        {
            title: 'PROMOTOR',
            dataIndex: 'promotor_id',
            key: 'promotor_id',
            hideInTable: true,
            valueType: 'select',
            valueEnum: (availablePromotores || []).reduce((acc, p) => {
                acc[p.id] = { text: p.apodo ? `${p.name} (${p.apodo})` : p.name };
                return acc;
            }, {})
        }
    ];

    const renderMobileCard = (record) => {
        return (
            <Card styles={{ body: { padding: '16px' } }} className="mb-4 shadow-sm rounded-lg border border-gray-200 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar size={48} icon={<UserOutlined />} className="bg-gray-100 text-gray-600" />
                        <div>
                            <div className="font-semibold text-base text-gray-800">{record.nombre_completo}</div>
                            <div className="text-xs text-gray-500">Promovido (Simpatizante)</div>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <UserOutlined className="text-gray-400" /> 
                        <span className="w-16 text-gray-400">ID:</span> 
                        <span className="font-medium text-gray-800">#{String(record.id).padStart(5, '0')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <IdcardOutlined className="text-gray-400" /> 
                        <span className="w-16 text-gray-400">Clave:</span> 
                        <span>{record.clave_elector || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <PhoneOutlined className="text-gray-400" /> 
                        <span className="w-16 text-gray-400">Tel:</span> 
                        <span>{record.telefono || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400" /> 
                        <span className="w-16 text-gray-400">Zona:</span> 
                        <span className="truncate">{record.colonia || 'Sin colonia'}{record.seccion_electoral ? ` (Sec: ${record.seccion_electoral})` : ''}</span>
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
            <Head title="Promovidos" />

            <Card bordered={false} className="shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0">Promovidos (Simpatizantes)</h2>
                        <p className="text-gray-500 text-sm mt-1">Lista de personas registradas por los promotores.</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-gray-800 hover:bg-gray-700 w-full sm:w-auto" onClick={handleCreate}>
                        Agregar Promovido
                    </Button>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/promovidos"
                    rowKey="id"
                    search={true} 
                    mobileCardRender={renderMobileCard}
                />

                <div className="mt-6 bg-blue-50 p-4 rounded-lg flex flex-col lg:flex-row items-center justify-between border border-blue-100 gap-4">
                    <p className="text-gray-600 text-sm m-0 flex-1">
                        <span className="text-blue-500 mr-2">ℹ️</span>
                        Esta es la base principal de la estructura electoral. Los promovidos son registrados directamente por los promotores en el campo.
                    </p>
                </div>
            </Card>

            <PromovidoFormModal 
                open={isModalOpen} 
                onOpenChange={setIsModalOpen}
                editId={editingId}
                fetchUrl={editingId ? `/promovidos/${editingId}` : null}
                availablePromotores={availablePromotores || []}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />
        </MainLayout>
    );
}
