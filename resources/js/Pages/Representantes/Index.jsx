import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, MailOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';

export default function RepresentantesIndex({ representantes }) {
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
            title: '¿Estás seguro de eliminar este representante?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/representantes/${id}`, {
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
                <span className="text-blue-600 font-medium">RD-{String(id).padStart(4, '0')}</span>
            ),
        },
        {
            title: 'FOTO',
            dataIndex: 'foto_url',
            key: 'foto_url',
            width: 70,
            align: 'center',
            search: false,
            render: (fotoUrl) => (
                <Avatar
                    size={44}
                    src={fotoUrl || undefined}
                    icon={!fotoUrl ? <UserOutlined /> : undefined}
                    className={fotoUrl ? 'border-2 border-blue-200' : 'bg-blue-100 text-blue-600'}
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
                    {record.demarcacion && <span className="text-xs text-blue-500">{record.demarcacion}</span>}
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
                const isActive = record.estado === undefined || record.estado === 1 || record.estado === '1' || record.estado === true || record.estado === 'true';
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
        const isActive = record.estado === undefined || record.estado === 1 || record.estado === '1' || record.estado === true || record.estado === 'true';
        
        return (
            <Card styles={{ body: { padding: '16px' } }} className="mb-4 shadow-sm rounded-lg border border-gray-200 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar size={48} src={record.foto_url} icon={<UserOutlined />} className="bg-blue-100 text-blue-600" />
                        <div>
                            <div className="font-semibold text-base text-gray-800">{record.name}</div>
                            <div className="text-xs text-gray-500">{record.apodo ? `"${record.apodo}"` : 'Representante (RD)'}</div>
                        </div>
                    </div>
                    <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Activo' : 'Inactivo'} className="bg-gray-50 px-2 py-1 rounded text-xs border border-gray-200" />
                </div>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <UserOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-14 text-gray-400 shrink-0">ID:</span> 
                        <span className="font-medium text-gray-800 truncate flex-1">RD-{String(record.id).padStart(4, '0')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <PhoneOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-14 text-gray-400 shrink-0">Tel:</span> 
                        <span className="truncate flex-1">{record.telefono || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MailOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-14 text-gray-400 shrink-0">Email:</span> 
                        <span className="truncate flex-1 text-xs sm:text-sm" title={record.email}>{record.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-14 text-gray-400 shrink-0">Zona:</span> 
                        <span className="truncate flex-1">{record.colonia || 'Sin colonia'}</span>
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
            <Head title="Representantes de Demarcación" />

            <Card bordered={false} className="shadow-sm mobile-full-width-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0">Representantes de Demarcación</h2>
                        <p className="text-gray-500 text-sm mt-1">Lista de todos los RD asignados en el sistema.</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-[#0f172a] hover:bg-slate-800 w-full sm:w-auto" onClick={handleCreate}>
                        Agregar Representante
                    </Button>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/representantes" // Cambiado a modo asíncrono puro
                    rowKey="id"
                    search={true} 
                    mobileCardRender={renderMobileCard}
                />
            </Card>

            <PersonaFormModal 
                open={isModalOpen} 
                onOpenChange={setIsModalOpen}
                editId={editingId}
                fetchUrl={editingId ? `/representantes/${editingId}` : null}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />
        </MainLayout>
    );
}
