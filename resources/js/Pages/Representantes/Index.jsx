import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Badge, Image } from 'antd';
import { UserOutlined, PhoneOutlined, EnvironmentOutlined, CalendarOutlined, GiftOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';
import RepresentanteCard from './RepresentanteCard';
import axios from 'axios';

export default function RepresentantesIndex({ availablePresidentes }) {
    const { auth } = usePage().props;
    const modalRef = React.useRef();
    const apoyosDrawerRef = React.useRef();
    const actionRef = React.useRef();

    const handleOpenApoyos = (record) => {
        apoyosDrawerRef.current?.open(record);
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            search: false,
            render: (id) => <span className="font-medium text-blue-600">RD-{String(id).padStart(4, '0')}</span>,
        },
        {
            title: 'FOTO',
            dataIndex: 'foto_url',
            key: 'foto_url',
            width: 70,
            align: 'center',
            search: false,
            render: (_, record) =>
                record?.foto_url && record.foto_url !== '-' ? (
                    <Image
                        src={record.foto_url}
                        width={44}
                        height={44}
                        className="rounded-md border border-blue-200 object-cover"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="rounded-md bg-blue-100 text-blue-600"
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
            ),
        },
        {
            title: 'TELÉFONO',
            dataIndex: 'telefono',
            key: 'telefono',
            render: (telefono) => (
                <span className="flex items-center text-gray-600">
                    <PhoneOutlined className="mr-2" /> {telefono || 'N/A'}
                </span>
            ),
        },
        {
            title: 'COLONIA / DEMARCACIÓN / SECCIÓN',
            key: 'colonia',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="flex items-center text-gray-600">
                        <EnvironmentOutlined className="mr-2" /> {record.colonia || 'Sin colonia'}
                        {record.codigo_postal ? ` (CP: ${record.codigo_postal})` : ''}
                    </span>
                    <div className="mt-0.5 flex flex-wrap gap-2">
                        {record.demarcacion_asignada && (
                            <span className="rounded border border-green-200 bg-green-50 px-1 text-xs font-bold text-green-600">
                                A cargo: {record.demarcacion_asignada.nombre}
                            </span>
                        )}
                        {record.demarcacion && (
                            <span className="text-xs text-blue-500">Info: {record.demarcacion.nombre}</span>
                        )}
                        {record.seccion_electoral && (
                            <span className="text-xs font-bold text-purple-500">
                                Sección: {record.seccion_electoral}
                            </span>
                        )}
                    </div>
                </div>
            ),
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
                return response.data.map((d) => ({ label: d.nombre, value: d.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Demarcación',
            },
        },
        {
            title: 'FECHA REGISTRO',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: true,
            valueType: 'dateRange',
            render: (_, record) => (
                <span className="flex items-center text-gray-600">
                    <CalendarOutlined className="mr-2" /> {new Date(record.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            title: 'OPERADORES',
            dataIndex: 'operadores_count',
            key: 'operadores_count',
            search: false,
            sorter: true,
            align: 'center',
            render: (count) => <Badge count={count || 0} showZero color="#108ee9" />,
        },
        {
            title: 'ESTADO',
            dataIndex: 'estado',
            key: 'estado',
            valueType: 'select',
            valueEnum: {
                1: { text: 'Activo', status: 'Success' },
                0: { text: 'Inactivo', status: 'Error' },
            },
            render: (_, record) => {
                const isActive =
                    record.estado === undefined ||
                    record.estado === 1 ||
                    record.estado === '1' ||
                    record.estado === true ||
                    record.estado === 'true';
                return <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Activo' : 'Inactivo'} />;
            },
        },
    ];

    return (
        <MainLayout>
            <Head title="Representantes de Demarcación" />

            <Card variant="borderless" className="mobile-full-width-card shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="m-0 text-xl font-bold">Representantes de Demarcación</h2>
                        <p className="mt-1 text-sm text-gray-500">Lista de todos los RD asignados en el sistema.</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                        <TableCrud.TrashedSwitch actionRef={actionRef} />
                        <TableCrud.ExportButton
                            actionRef={actionRef}
                            endpoint="/representantes"
                            allowedRoles={['presidente', 'admin', 'superuser']}
                        />
                        <TableCrud.CreateButton
                            modalRef={modalRef}
                            resourceName="representante"
                            className="w-full bg-[#0f172a] hover:bg-slate-800 sm:w-auto"
                        />
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/representantes"
                    modalRef={modalRef}
                    resourceName="representante"
                    canImpersonate
                    rowKey="id"
                    search={true}
                    extraActions={(record) => [
                        <Button
                            key="apoyos"
                            type="text"
                            icon={<GiftOutlined className="text-green-600" />}
                            title="Kardex de Apoyos"
                            onClick={() => handleOpenApoyos(record)}
                        />,
                    ]}
                    mobileCardRender={(record, actionsNode, handlers) => (
                        <RepresentanteCard
                            record={record}
                            actionsNode={actionsNode}
                            handlers={handlers}
                            onOpenApoyos={handleOpenApoyos}
                        />
                    )}
                />
            </Card>

            <PersonaFormModal
                ref={modalRef}
                entityType="Representante"
                availablePresidentes={availablePresidentes || []}
                onSuccess={() => {
                    if (actionRef.current) {
                        actionRef.current.reload();
                    }
                }}
            />

            <ApoyosDrawer ref={apoyosDrawerRef} apiBasePath="/representantes" />
        </MainLayout>
    );
}
