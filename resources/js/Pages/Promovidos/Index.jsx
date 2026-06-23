import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UsergroupAddOutlined, IdcardOutlined, MailOutlined, DownloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
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
                    }
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
            title: 'FOTO',
            dataIndex: 'foto_url',
            key: 'foto_url',
            width: 70,
            align: 'center',
            search: false,
            render: (fotoUrl) => (
                fotoUrl ? (
                    <Image
                        src={fotoUrl}
                        width={44}
                        height={44}
                        className="object-cover rounded-md"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar shape="square" size={44} icon={<UserOutlined />} className="bg-gray-100 text-gray-600 rounded-md" />
                )
            ),
        },
        {
            title: 'NOMBRE',
            dataIndex: 'nombre',
            key: 'nombre',
            sorter: true,
            render: (nombre, record) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{nombre} {record.apellidos}</span>
                </div>
            )
        },
        {
            title: 'APELLIDOS',
            dataIndex: 'apellidos',
            key: 'apellidos',
            hideInTable: true, // Solo se usa en el buscador
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
            title: 'DIRECCIÓN / UBICACIÓN',
            key: 'direccion',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-gray-800 font-medium text-xs">
                        {record.calle ? `${record.calle} ${record.numero || ''}`.trim() : 'Sin calle'}
                    </span>
                    <span className="text-gray-500 text-xs flex items-center">
                        <EnvironmentOutlined className="mr-1" /> {record.colonia || 'Sin colonia'} {record.codigo_postal ? `(CP: ${record.codigo_postal})` : ''}
                    </span>
                    <div className="flex gap-2 mt-0.5">
                        {record.demarcacion && <span className="text-xs text-orange-500">Demarcación: {record.demarcacion.nombre}</span>}
                        {record.seccion_electoral && <span className="text-xs text-blue-500 font-bold">Sección: {record.seccion_electoral}</span>}
                    </div>
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
            width: 150,
            align: 'center',
            search: false,
            render: (_, record) => (
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
            )
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
                const p = (availablePromotores || []).find(p => p.id === record.promotor_id);
                return p ? (
                    <span className="text-gray-700 font-medium text-xs">
                        {p.name} {p.apodo ? `("${p.apodo}")` : ''}
                    </span>
                ) : <span className="text-gray-400 text-xs">No asignado</span>;
            }
        }
    ];

    const renderMobileCard = (record) => {
        return (
            <Card styles={{ body: { padding: '16px' } }} className="mb-4 shadow-sm rounded-lg border border-gray-200 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        {record.foto_url ? (
                            <Image
                                src={record.foto_url}
                                width={48}
                                height={48}
                                className="object-cover rounded-md"
                                style={{ borderRadius: '6px' }}
                            />
                        ) : (
                            <Avatar
                                shape="square"
                                size={48}
                                icon={<UserOutlined />}
                                className="bg-gray-100 text-gray-600 rounded-md"
                            />
                        )}
                        <div>
                            <div className="font-semibold text-base text-gray-800">{record.nombre} {record.apellidos}</div>
                            <div className="text-xs text-gray-500">Promovido (Simpatizante)</div>
                        </div>
                    </div>
                </div>
                
                <div className="max-h-56 overflow-y-auto pr-2 space-y-2.5 mb-4 text-sm text-gray-600 scrollable-card-content">
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
                        <UserOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">ID:</span> 
                        <span className="font-semibold text-gray-800 truncate flex-1">#{String(record.id).padStart(5, '0')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <IdcardOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Clave Elector:</span> 
                        <span className="truncate flex-1 text-gray-800">{record.clave_elector || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <SafetyCertificateOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">CURP:</span> 
                        <span className="truncate flex-1 font-mono uppercase text-gray-800">{record.curp || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <PhoneOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Teléfono:</span> 
                        <span className="truncate flex-1 text-gray-800">{record.telefono || 'N/A'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <EnvironmentOutlined className="text-gray-400 shrink-0 mt-0.5" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Calle:</span> 
                        <span className="truncate flex-1 text-gray-800" title={record.calle}>{record.calle || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Número:</span> 
                        <span className="truncate flex-1 text-gray-800">{record.numero || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Colonia:</span> 
                        <span className="truncate flex-1 text-gray-800" title={record.colonia}>{record.colonia || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">C. Postal:</span> 
                        <span className="truncate flex-1 text-gray-800">{record.codigo_postal || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Demarcación:</span> 
                        <span className="truncate flex-1 text-gray-800">{record.demarcacion?.nombre || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <EnvironmentOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Sección:</span> 
                        <span className="truncate flex-1 text-gray-800">{record.seccion_electoral || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TeamOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Promotor:</span> 
                        <span className="truncate flex-1 text-gray-800 font-medium">
                            {(() => {
                                const p = (availablePromotores || []).find(p => p.id === record.promotor_id);
                                return p ? (p.apodo ? `${p.name} (${p.apodo})` : p.name) : 'No asignado';
                            })()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Registro:</span> 
                        <span className="truncate flex-1 text-xs text-gray-800">
                            {new Date(record.created_at).toLocaleString('es-MX')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-20 text-gray-400 shrink-0 font-medium">Modificado:</span> 
                        <span className="truncate flex-1 text-xs text-gray-800">
                            {new Date(record.updated_at).toLocaleString('es-MX')}
                        </span>
                    </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100 flex justify-between flex-wrap">
                    <Button type="text" icon={<GiftOutlined />} className="text-green-600 w-1/3 flex justify-center items-center" onClick={() => handleOpenApoyos(record)}>Kardex</Button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <Button type="text" icon={<EditOutlined />} className="text-blue-600 w-1/3 flex justify-center items-center" onClick={() => handleEdit(record.id)}>Editar</Button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <Button type="text" danger icon={<DeleteOutlined />} className="w-1/3 flex justify-center items-center" onClick={() => handleDelete(record.id)}>Eliminar</Button>
                </div>
            </Card>
        );
    };

    return (
        <MainLayout>
            {contextHolder}
            <Head title="Promovidos" />

            <Card bordered={false} className="shadow-sm mobile-full-width-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0">Promovidos (Simpatizantes)</h2>
                        <p className="text-gray-500 text-sm mt-1">Lista de personas registradas por los promotores.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {['presidente', 'rd'].includes(auth?.user?.role) && (
                            <Button 
                                type="default" 
                                icon={<DownloadOutlined />} 
                                onClick={() => window.location.href = '/promovidos/export'}
                                className="w-full sm:w-auto border-gray-300"
                            >
                                Descargar Excel
                            </Button>
                        )}
                        <Button type="primary" icon={<PlusOutlined />} className="bg-gray-800 hover:bg-gray-700 w-full sm:w-auto" onClick={handleCreate}>
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
                />

                <div className="mt-6 bg-blue-50 p-4 rounded-lg flex flex-col lg:flex-row items-center justify-between border border-blue-100 gap-4">
                    <p className="text-gray-600 text-sm m-0 flex-1">
                        <span className="text-blue-500 mr-2">ℹ️</span>
                        Esta es la base principal de la estructura electoral. Los promovidos son registrados directamente por los promotores en el campo.
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

            <ApoyosDrawer 
                visible={isApoyosOpen}
                onClose={() => setIsApoyosOpen(false)}
                promovido={selectedPromovido}
            />
        </MainLayout>
    );
}
