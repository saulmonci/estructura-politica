import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UsergroupAddOutlined, MailOutlined, GiftOutlined, DownloadOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';

export default function PromotoresIndex({ availableOperadores, availableRds }) {
    const { auth } = usePage().props;
    const modalRef = React.useRef();
    const [isApoyosOpen, setIsApoyosOpen] = useState(false);
    const [selectedPromotor, setSelectedPromotor] = useState(null);
    const actionRef = React.useRef();

    const handleOpenApoyos = (record) => {
        setSelectedPromotor(record);
        setIsApoyosOpen(true);
    };

    const handleCreate = () => {
        modalRef.current?.open();
    };

    const handleEdit = (id) => {
        modalRef.current?.open(id, `/promotores/${id}`);
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
                        className="object-cover rounded-md border border-orange-200"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="bg-orange-100 text-orange-600 rounded-md"
                    />
                )
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
            title: 'COLONIA / DEMARCACIÓN / SECCIÓN',
            key: 'colonia',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-gray-600 flex items-center">
                        <EnvironmentOutlined className="mr-2" /> {record.colonia || 'Sin colonia'}{record.codigo_postal ? ` (CP: ${record.codigo_postal})` : ''}
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

    const renderMobileCard = (record) => {
        const isActive = record.estado === undefined || record.estado === 1 || record.estado === '1' || record.estado === true || record.estado === 'true';
        
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
                                className="bg-orange-100 text-orange-600 rounded-md"
                            />
                        )}
                        <div>
                            <div className="font-semibold text-base text-gray-800">{record.name}</div>
                            <div className="text-xs text-gray-500">{record.apodo ? `"${record.apodo}"` : 'Promotor'}</div>
                        </div>
                    </div>
                    <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Activo' : 'Inactivo'} className="bg-gray-50 px-2 py-1 rounded text-xs border border-gray-200" />
                </div>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <UserOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-14 text-gray-400 shrink-0">ID:</span> 
                        <span className="font-medium text-gray-800 truncate flex-1">PR-{String(record.id).padStart(4, '0')}</span>
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
                        <span className="w-18 text-gray-400 shrink-0">Ubicación:</span> 
                        <span className="truncate flex-1">
                            {record.colonia || 'Sin colonia'}
                            {record.codigo_postal ? ` (CP: ${record.codigo_postal})` : ''}
                            {record.demarcacion ? ` (Dem: ${record.demarcacion.nombre})` : ''}
                            {record.seccion_electoral ? ` (Sec: ${record.seccion_electoral})` : ''}
                        </span>
                    </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100 flex justify-between flex-wrap">
                    <Button type="text" icon={<GiftOutlined />} className="text-green-600 w-1/3 flex justify-center items-center" onClick={() => handleOpenApoyos(record)}>Kardex</Button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <Button type="text" icon={<EditOutlined />} className="text-orange-600 w-1/3 flex justify-center items-center" onClick={() => handleEdit(record.id)}>Editar</Button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <Button type="text" danger icon={<DeleteOutlined />} className="w-1/3 flex justify-center items-center" onClick={() => handleDelete(record.id)}>Eliminar</Button>
                </div>
            </Card>
        );
    };

    return (
        <MainLayout>
            <Head title="Promotores" />

            <Card bordered={false} className="shadow-sm mobile-full-width-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0">Promotores</h2>
                        <p className="text-gray-500 text-sm mt-1">Lista de promotores asignados a los operadores.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {['presidente', 'rd'].includes(auth?.user?.role) && (
                            <Button 
                                type="default" 
                                icon={<DownloadOutlined />} 
                                onClick={() => window.location.href = '/promotores/export'}
                                className="w-full sm:w-auto border-gray-300"
                            >
                                Descargar Excel
                            </Button>
                        )}
                        <Button type="primary" icon={<PlusOutlined />} className="bg-orange-600 hover:bg-orange-500 w-full sm:w-auto" onClick={handleCreate}>
                            Agregar Promotor
                        </Button>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/promotores"
                    rowKey="id"
                    search={true} 
                    mobileCardRender={renderMobileCard}
                />

                <div className="mt-6 bg-blue-50 p-4 rounded-lg flex flex-col lg:flex-row items-center justify-between border border-blue-100 gap-4">
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
                ref={modalRef}
                entityType="Promotor"
                availableRds={availableOperadores || []} // Reusamos el prop availableRds para pasar los operadores por ahora
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />

            <ApoyosDrawer 
                visible={isApoyosOpen}
                onClose={() => setIsApoyosOpen(false)}
                entity={selectedPromotor}
                apiBasePath={selectedPromotor ? `/promotores/${selectedPromotor.id}` : null}
            />
        </MainLayout>
    );
}
