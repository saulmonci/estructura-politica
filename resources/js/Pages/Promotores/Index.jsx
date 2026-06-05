import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';

export default function PromotoresIndex({ availableOperadores, availableRds }) {
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
            title: '¿Estás seguro de eliminar este promotor?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/promotores/${id}`, {
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
                <span className="text-orange-600 font-medium">PR-{String(id).padStart(4, '0')}</span>
            ),
        },
        {
            title: 'NOMBRE COMPLETO',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (name, record) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} className="bg-orange-100 text-orange-600" />
                    <div className="flex flex-col">
                        <span className="font-semibold">{name}</span>
                        {record.apodo && <span className="text-xs text-gray-500">"{record.apodo}"</span>}
                    </div>
                </Space>
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
            title: 'COLONIA / DEMARCACIÓN',
            key: 'colonia',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-gray-600 flex items-center">
                        <EnvironmentOutlined className="mr-2" /> {record.colonia || 'Sin colonia'}
                    </span>
                    {record.demarcacion && <span className="text-xs text-orange-500">{record.demarcacion}</span>}
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
                <span className="text-gray-600 flex items-center">
                    <CalendarOutlined className="mr-2" /> {new Date(record.created_at).toLocaleDateString()}
                </span>
            )
        },
        {
            title: 'ESTADO',
            dataIndex: 'estado',
            key: 'estado',
            valueType: 'select',
            valueEnum: {
                '1': { text: 'Activo', status: 'Success' },
                '0': { text: 'Inactivo', status: 'Error' },
            },
            render: (_, record) => {
                const isActive = record.estado === undefined || record.estado === 1 || record.estado === '1';
                return <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Activo' : 'Inactivo'} />;
            }
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
                        icon={<EditOutlined className="text-orange-600" />} 
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
            title: 'RD',
            dataIndex: 'rd_id',
            key: 'rd_id',
            hideInTable: true,
            hideInSearch: auth?.user?.role !== 'presidente',
            valueType: 'select',
            valueEnum: (availableRds || []).reduce((acc, rd) => {
                acc[rd.id] = { text: rd.name };
                return acc;
            }, {})
        }
    ];

    return (
        <MainLayout>
            <Head title="Promotores" />

            <Card bordered={false} className="shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0">Promotores</h2>
                        <p className="text-gray-500 text-sm mt-1">Lista de promotores asignados a los operadores.</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-orange-600 hover:bg-orange-500" onClick={handleCreate}>
                        Agregar Promotor
                    </Button>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/promotores"
                    rowKey="id"
                    search={true} 
                />

                <div className="mt-6 bg-blue-50 p-4 rounded-lg flex items-center justify-between border border-blue-100">
                    <p className="text-gray-600 text-sm m-0 flex-1">
                        <span className="text-blue-500 mr-2">ℹ️</span>
                        Como {auth?.user?.role}, puedes ver y administrar a los promotores en tu red. Cada promotor registrará promovidos.
                    </p>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                            <div className="bg-blue-900 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">👤</div>
                            <span className="text-xs mt-1 text-gray-600">RD</span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex flex-col items-center">
                            <div className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold"><TeamOutlined /></div>
                            <span className="text-xs mt-1 text-gray-600">Operadores</span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex flex-col items-center">
                            <div className="bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold"><UsergroupAddOutlined /></div>
                            <span className="text-xs mt-1 text-gray-600">Promotores</span>
                        </div>
                    </div>
                </div>
            </Card>

            <PersonaFormModal 
                open={isModalOpen} 
                onOpenChange={setIsModalOpen}
                editId={editingId}
                fetchUrl={editingId ? `/promotores/${editingId}` : null}
                entityType="Promotor"
                availableRds={availableOperadores || []} // Reusamos el prop availableRds para pasar los operadores por ahora
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />
        </MainLayout>
    );
}
