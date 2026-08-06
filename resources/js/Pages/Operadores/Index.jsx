import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image, Switch } from 'antd';
import { PlusOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, TeamOutlined, UsergroupAddOutlined, MailOutlined, GiftOutlined, DownloadOutlined, ReloadOutlined, SwapOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';
import axios from 'axios';

export default function OperadoresIndex({ availableRds }) {
    const { auth } = usePage().props;
    const modalRef = React.useRef();
    const [isApoyosOpen, setIsApoyosOpen] = useState(false);
    const [selectedOperador, setSelectedOperador] = useState(null);
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

        window.location.href = `/operadores/export?${queryParams.toString()}`;
    };

    const handleCreate = () => {
        modalRef.current?.open();
    };

    const handleOpenApoyos = (record) => {
        setSelectedOperador(record);
        setIsApoyosOpen(true);
    };

    const handleImpersonate = (record) => {
        modal.confirm({
            title: '¿Impersonar operador?',
            content: `¿Deseas ingresar al sistema navegando en representación de ${record.name || record.nombre}?`,
            okText: 'Sí, impersonar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(`/impersonate/${record.id}`);
            }
        });
    };

    const handleEdit = (id) => {
        modalRef.current?.open(id, `/operadores/${id}`);
    };

    const handleDelete = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar este operador?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/operadores/${id}`, {
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
            title: '¿Estás seguro de restaurar este operador?',
            content: 'El operador volverá a estar activo.',
            okText: 'Sí, restaurar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(`/operadores/${id}/restore`, {}, {
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
                <span className="text-purple-600 font-medium">OP-{String(id).padStart(4, '0')}</span>
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
                        className="object-cover rounded-md border border-purple-200"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="bg-purple-100 text-purple-600 rounded-md"
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
                        {record.demarcacion && <span className="text-xs text-purple-500">Demarcación: {record.demarcacion.nombre}</span>}
                        {record.seccion_electoral && <span className="text-xs text-blue-500 font-bold">Sección: {record.seccion_electoral}</span>}
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
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Demarcación',
            }
        },
        {
            title: 'ASIGNADO A (RD)',
            dataIndex: 'parent_id',
            key: 'parent_id',
            dependencies: ['demarcacion_id'],
            hideInTable: !['presidente', 'admin', 'superadmin'].includes(auth?.user?.role),
            hideInSearch: !['presidente', 'admin', 'superadmin'].includes(auth?.user?.role),
            valueType: 'select',
            request: async (params) => {
                let rds = availableRds || [];
                if (params && params.demarcacion_id) {
                    rds = rds.filter(rd => rd.demarcacion_id == params.demarcacion_id);
                }
                return rds.map(rd => ({ 
                    label: rd.apodo ? `${rd.name} (${rd.apodo})` : rd.name, 
                    value: rd.id 
                }));
            },
            render: (_, record) => {
                if (record.leader) {
                    return <span className="font-medium text-blue-700">{record.leader.name} {record.leader.apodo ? `(${record.leader.apodo})` : ''}</span>;
                }
                return <span className="text-gray-400 text-xs italic">Sin asignar</span>;
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por RD',
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
                            icon={<EditOutlined className="text-purple-600" />} 
                            onClick={() => handleEdit(record.id)}
                            title="Editar"
                        />
                        {auth?.can_impersonate && record.id !== auth.user?.id && (
                            <Button 
                                type="text" 
                                icon={<SwapOutlined className="text-amber-600" />} 
                                onClick={() => handleImpersonate(record)}
                                title="Impersonar usuario"
                            />
                        )}
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => handleDelete(record.id)}
                            title="Eliminar"
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
                                className="bg-purple-100 text-purple-600 rounded-md"
                            />
                        )}
                        <div>
                            <div className="font-semibold text-base text-gray-800">{record.name}</div>
                            <div className="text-xs text-gray-500">{record.apodo ? `"${record.apodo}"` : 'Operador Político'}</div>
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
                        <span className="font-medium text-gray-800 truncate flex-1">OP-{String(record.id).padStart(4, '0')}</span>
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
                    {['presidente', 'admin', 'superadmin'].includes(auth?.user?.role) && (
                        <div className="flex items-center gap-2">
                            <TeamOutlined className="text-gray-400 shrink-0" /> 
                            <span className="w-18 text-gray-400 shrink-0">RD:</span> 
                            <span className="truncate flex-1 font-medium text-blue-700">
                                {record.leader ? `${record.leader.name} ${record.leader.apodo ? `(${record.leader.apodo})` : ''}` : 'Sin asignar'}
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="pt-3 border-t border-gray-100 flex justify-between">
                    {record.deleted_at ? (
                        <Button type="text" className="text-green-600 w-full flex justify-center items-center" icon={<ReloadOutlined />} onClick={() => handleRestore(record.id)}>Restaurar</Button>
                    ) : (
                        <>
                            <Button type="text" icon={<GiftOutlined />} className="text-green-600 w-1/3 flex justify-center items-center" onClick={() => handleOpenApoyos(record)}>Kardex</Button>
                            <div className="w-px bg-gray-200 my-1"></div>
                            <Button type="text" icon={<EditOutlined />} className="text-purple-600 w-1/3 flex justify-center items-center" onClick={() => handleEdit(record.id)}>Editar</Button>
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
            <Head title="Operadores Políticos" />

            <Card bordered={false} className="shadow-sm mobile-full-width-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0">Operadores Políticos</h2>
                        <p className="text-gray-500 text-sm mt-1">Lista de operadores políticos asignados a tu red.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                        {['presidente', 'admin', 'superuser'].includes(auth?.user?.role) && (
                            <div className="flex items-center gap-2 mr-0 sm:mr-4 text-sm text-gray-600">
                                <span>Ver eliminados</span>
                                <Switch size="small" checked={showTrashed} onChange={setShowTrashed} />
                            </div>
                        )}
                        {['presidente', 'rd'].includes(auth?.user?.role) && (
                            <Button 
                                type="default" 
                                icon={<DownloadOutlined />} 
                                onClick={handleExport}
                                className="w-full sm:w-auto border-gray-300"
                            >
                                Descargar Excel
                            </Button>
                        )}
                        <Button type="primary" icon={<PlusOutlined />} className="bg-purple-700 hover:bg-purple-600 w-full sm:w-auto" onClick={handleCreate}>
                            Agregar Operador
                        </Button>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/operadores"
                    rowKey="id"
                    search={true} 
                    mobileCardRender={renderMobileCard}
                    params={{ trashed: showTrashed ? '1' : '0' }}
                    onParamsChange={setCurrentParams}
                />

                <div className="mt-6 bg-blue-50 p-4 rounded-lg flex flex-col lg:flex-row items-center justify-between border border-blue-100 gap-4">
                    <p className="text-gray-600 text-sm m-0 flex-1">
                        <span className="text-blue-500 mr-2">ℹ️</span>
                        Como {auth?.user?.role === 'presidente' ? 'Presidente' : 'RD'}, puedes ver y administrar a los operadores políticos de tu red. Cada operador registrará promotores.
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
                entityType="Operador"
                availableRds={availableRds || []}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />

            <ApoyosDrawer 
                visible={isApoyosOpen}
                onClose={() => setIsApoyosOpen(false)}
                entity={selectedOperador}
                apiBasePath={selectedOperador ? `/operadores/${selectedOperador.id}` : null}
            />
        </MainLayout>
    );
}
