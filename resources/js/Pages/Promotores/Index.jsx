import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Badge, Image } from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    TeamOutlined,
    UsergroupAddOutlined,
    GiftOutlined,
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PersonaFormModal from '@/Components/PersonaFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';
import PromotorCard from './PromotorCard';
import axios from 'axios';

export default function PromotoresIndex({ availableOperadores, availableRds }) {
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
            render: (id) => <span className="font-medium text-orange-600">PR-{String(id).padStart(4, '0')}</span>,
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
                        className="rounded-md border border-orange-200 object-cover"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="rounded-md bg-orange-100 text-orange-600"
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
                    <div className="mt-0.5 flex gap-2">
                        {record.demarcacion && (
                            <span className="text-xs text-orange-500">Demarcación: {record.demarcacion.nombre}</span>
                        )}
                        {record.seccion_electoral && (
                            <span className="text-xs font-bold text-blue-500">Sección: {record.seccion_electoral}</span>
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
        {
            title: 'ASIGNADO A (OPERADOR)',
            dataIndex: 'parent_id',
            key: 'parent_id',
            dependencies: ['demarcacion_id'],
            hideInTable: !['presidente', 'admin', 'superadmin', 'rd'].includes(auth?.user?.role),
            hideInSearch: !['presidente', 'admin', 'superadmin', 'rd'].includes(auth?.user?.role),
            valueType: 'select',
            request: async (params) => {
                let ops = availableOperadores || [];
                if (params && params.demarcacion_id) {
                    ops = ops.filter((op) => op.demarcacion_id == params.demarcacion_id);
                }
                return ops.map((op) => ({
                    label: op.apodo ? `${op.name} (${op.apodo})` : op.name,
                    value: op.id,
                }));
            },
            render: (_, record) => {
                if (record.leader) {
                    return (
                        <span className="font-medium text-orange-700">
                            {record.leader.name} {record.leader.apodo ? `(${record.leader.apodo})` : ''}
                        </span>
                    );
                }
                return <span className="text-xs text-gray-400 italic">Sin asignar</span>;
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Operador',
            },
        },
    ];

    return (
        <MainLayout>
            <Head title="Promotores" />

            <Card variant="borderless" className="mobile-full-width-card shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="m-0 text-xl font-bold">Promotores</h2>
                        <p className="mt-1 text-sm text-gray-500">Lista de promotores asignados a los operadores.</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                        <TableCrud.TrashedSwitch actionRef={actionRef} />
                        <TableCrud.ExportButton
                            actionRef={actionRef}
                            endpoint="/promotores"
                            allowedRoles={['presidente', 'rd', 'admin', 'superuser']}
                        />
                        <TableCrud.CreateButton
                            modalRef={modalRef}
                            resourceName="promotor"
                            className="w-full bg-orange-600 hover:bg-orange-500 sm:w-auto"
                        />
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/promotores"
                    modalRef={modalRef}
                    resourceName="promotor"
                    canImpersonate
                    rowKey="id"
                    search={true}
                    editIconClass="text-orange-600 hover:text-orange-700"
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
                        <PromotorCard
                            record={record}
                            actionsNode={actionsNode}
                            handlers={handlers}
                            onOpenApoyos={handleOpenApoyos}
                        />
                    )}
                />

                <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 lg:flex-row">
                    <p className="m-0 flex-1 text-sm text-gray-600">
                        <span className="mr-2 text-blue-500">ℹ️</span>
                        Como {auth?.user?.role}, puedes ver y administrar a los promotores en tu red. Cada promotor
                        registrará promovidos.
                    </p>

                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                                👤
                            </div>
                            <span className="mt-1 text-xs text-gray-600">RD</span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex flex-col items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 font-bold text-white">
                                <TeamOutlined />
                            </div>
                            <span className="mt-1 text-xs text-gray-600">Operadores</span>
                        </div>
                        <span className="text-gray-300">→</span>
                        <div className="flex flex-col items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                                <UsergroupAddOutlined />
                            </div>
                            <span className="mt-1 text-xs text-gray-600">Promotores</span>
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

            <ApoyosDrawer ref={apoyosDrawerRef} apiBasePath="/promotores" />
        </MainLayout>
    );
}
