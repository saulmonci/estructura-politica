import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image, Switch } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, MailOutlined, GiftOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';
import axios from 'axios';

export default function RepresentantesIndex({ representantes }) {
    const { auth } = usePage().props;
    const modalRef = React.useRef();
    const [isApoyosOpen, setIsApoyosOpen] = useState(false);
    const [selectedRepresentante, setSelectedRepresentante] = useState(null);
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
                    value.forEach(v => queryParams.append(`${key}[]`, v));
                } else {
                    queryParams.append(key, value);
                }
            }
        });

        // Agregar estado de eliminados
        if (showTrashed) {
            queryParams.append('trashed', '1');
        }

        window.location.href = `/representantes/export?${queryParams.toString()}`;
    };

    const handleCreate = () => {
        modalRef.current?.open();
    };

    const handleOpenApoyos = (record) => {
        setSelectedRepresentante(record);
        setIsApoyosOpen(true);
    };

    const handleEdit = (id) => {
        modalRef.current?.open(id, `/representantes/${id}`);
    };

    const handleDelete = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar este representante?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/representantes/${id}`, {
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

    const handleRestore = (id) => {
        modal.confirm({
            title: '¿Estás seguro de restaurar este representante?',
            content: 'El representante volverá a estar activo.',
            okText: 'Sí, restaurar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(`/representantes/${id}/restore`, {}, {
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
                fotoUrl ? (
                    <Image
                        src={fotoUrl}
                        width={44}
                        height={44}
                        className="object-cover rounded-md border border-blue-200"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="bg-blue-100 text-blue-600 rounded-md"
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
                        {record.demarcacion && <span className="text-xs text-blue-500">Demarcación: {record.demarcacion.nombre}</span>}
                        {record.seccion_electoral && <span className="text-xs text-purple-500 font-bold">Sección: {record.seccion_electoral}</span>}
                    </div>
                </div>
            )
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
                return response.data.map(d => ({ label: d.nombre, value: d.id }));
            },
            fieldProps: {
                placeholder: 'Filtrar por Demarcación',
            }
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
            title: 'OPERADORES',
            dataIndex: 'operadores_count',
            key: 'operadores_count',
            search: false,
            sorter: true,
            align: 'center',
            render: (count) => (
                <Badge count={count || 0} showZero color="#108ee9" />
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
                            onClick={() => handleEdit(record.id)}
                        />
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => handleDelete(record.id)}
                        />
                    </Space>
                );
            }
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
                                className="bg-blue-100 text-blue-600 rounded-md"
                            />
                        )}
                        <div>
                            <div className="font-semibold text-base text-gray-800">{record.name}</div>
                            <div className="text-xs text-gray-500">{record.apodo ? `"${record.apodo}"` : 'Representante (RD)'}</div>
                        </div>
                    </div>
                    {record.deleted_at ? (
                        <Badge status="error" text="Eliminado" className="bg-red-50 px-2 py-1 rounded text-xs border border-red-200" />
                    ) : (
                        <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Activo' : 'Inactivo'} className="bg-gray-50 px-2 py-1 rounded text-xs border border-gray-200" />
                    )}
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
                        <span className="w-18 text-gray-400 shrink-0">Ubicación:</span> 
                        <span className="truncate flex-1">
                            {record.colonia || 'Sin colonia'}
                            {record.codigo_postal ? ` (CP: ${record.codigo_postal})` : ''}
                            {record.demarcacion ? ` (Dem: ${record.demarcacion.nombre})` : ''}
                            {record.seccion_electoral ? ` (Sec: ${record.seccion_electoral})` : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <UserOutlined className="text-gray-400 shrink-0" /> 
                        <span className="w-18 text-gray-400 shrink-0">Operadores:</span> 
                        <span className="truncate flex-1">
                            <Badge count={record.operadores_count || 0} showZero color="#108ee9" />
                        </span>
                    </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100 flex justify-between">
                    {record.deleted_at ? (
                        <Button type="text" className="text-green-600 w-full flex justify-center items-center" icon={<ReloadOutlined />} onClick={() => handleRestore(record.id)}>Restaurar</Button>
                    ) : (
                        <>
                            <Button type="text" icon={<GiftOutlined />} className="text-green-600 w-1/3 flex justify-center items-center" onClick={() => handleOpenApoyos(record)}>Kardex</Button>
                            <div className="w-px bg-gray-200 my-1"></div>
                            <Button type="text" icon={<EditOutlined />} className="text-blue-600 w-1/3 flex justify-center items-center" onClick={() => handleEdit(record.id)}>Editar</Button>
                            <div className="w-px bg-gray-200 my-1"></div>
                            <Button type="text" danger icon={<DeleteOutlined />} className="w-1/3 flex justify-center items-center" onClick={() => handleDelete(record.id)}>Eliminar</Button>
                        </>
                    )}
                </div>
            </Card>
        );
    };

    return (
        <MainLayout>
            {contextHolder}
            <Head title="Representantes de Demarcación" />

            <Card bordered={false} className="shadow-sm mobile-full-width-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0">Representantes de Demarcación</h2>
                        <p className="text-gray-500 text-sm mt-1">Lista de todos los RD asignados en el sistema.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                        {auth?.user?.role === 'presidente' && (
                            <div className="flex items-center gap-2 mr-0 sm:mr-4 text-sm text-gray-600">
                                <span>Ver eliminados</span>
                                <Switch size="small" checked={showTrashed} onChange={setShowTrashed} />
                            </div>
                        )}
                        {auth?.user?.role === 'presidente' && (
                            <Button 
                                type="default" 
                                icon={<DownloadOutlined />} 
                                onClick={handleExport}
                                className="w-full sm:w-auto border-gray-300"
                            >
                                Descargar Excel
                            </Button>
                        )}
                        <Button type="primary" icon={<PlusOutlined />} className="bg-[#0f172a] hover:bg-slate-800 w-full sm:w-auto" onClick={handleCreate}>
                            Agregar Representante
                        </Button>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/representantes" // Cambiado a modo asíncrono puro
                    rowKey="id"
                    search={true} 
                    mobileCardRender={renderMobileCard}
                    params={{ trashed: showTrashed ? '1' : '0' }}
                    onParamsChange={setCurrentParams}
                />
            </Card>

            <PersonaFormModal 
                ref={modalRef}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />

            <ApoyosDrawer 
                visible={isApoyosOpen}
                onClose={() => setIsApoyosOpen(false)}
                entity={selectedRepresentante}
                apiBasePath={selectedRepresentante ? `/representantes/${selectedRepresentante.id}` : null}
            />
        </MainLayout>
    );
}
