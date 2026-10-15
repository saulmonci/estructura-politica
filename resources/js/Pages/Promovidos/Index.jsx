import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Badge, Image } from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
    IdcardOutlined,
    SafetyCertificateOutlined,
    GiftOutlined,
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PromovidoFormModal from '@/Components/PromovidoFormModal';
import ApoyosDrawer from '@/Components/ApoyosDrawer';
import PromovidoCard from './PromovidoCard';
import axios from 'axios';

export default function PromovidosIndex({ availablePromotores }) {
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
            render: (id) => <span className="font-medium text-gray-600">#{String(id).padStart(5, '0')}</span>,
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
                        className="rounded-md object-cover"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        className="rounded-md bg-gray-100 text-gray-600"
                    />
                ),
        },
        {
            title: 'NOMBRE',
            dataIndex: 'nombre',
            key: 'nombre',
            sorter: true,
            render: (nombre, record) => (
                <div className="flex flex-col">
                    <span className="font-semibold">
                        {nombre} {record.apellidos}
                    </span>
                </div>
            ),
        },
        {
            title: 'APELLIDOS',
            dataIndex: 'apellidos',
            key: 'apellidos',
            hideInTable: true,
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

        // ------------------ FILTROS TERRITORIALES EN CASCADA ------------------
        {
            title: 'Estado',
            dataIndex: 'state_id',
            key: 'state_id',
            valueType: 'select',
            hideInTable: true,
            hideInSearch: auth?.user?.scope_level !== 'estatal' && auth?.user?.role !== 'superuser',
            request: async () => {
                const response = await axios.get('/catalogos/estados');
                return response.data.map((e) => ({ label: e.nombre, value: e.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Estado',
                disabled: auth?.user?.scope_level === 'estatal' && auth?.user?.role !== 'superuser',
            },
        },
        {
            title: 'Municipio',
            dataIndex: 'municipality_id',
            key: 'municipality_id',
            valueType: 'select',
            hideInTable: true,
            hideInSearch: auth?.user?.scope_level === 'demarcacion',
            dependencies: ['state_id'],
            request: async (params) => {
                const isMunicipal = auth?.user?.scope_level === 'municipal' && auth?.user?.role !== 'superuser';
                if (isMunicipal) {
                    return [
                        {
                            label: auth?.user?.municipality?.nombre || 'Mi Municipio',
                            value: auth?.user?.municipality_id,
                        },
                    ];
                }
                const activeStateId =
                    auth?.user?.scope_level === 'estatal' && auth?.user?.role !== 'superuser'
                        ? auth?.user?.state_id
                        : params.state_id;

                if (!activeStateId) return [];
                const response = await axios.get(`/catalogos/municipios?state_id=${activeStateId}`);
                return response.data.map((m) => ({ label: m.nombre, value: m.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Municipio',
                disabled: auth?.user?.scope_level === 'municipal' && auth?.user?.role !== 'superuser',
            },
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
        // ------------------ FIN FILTROS TERRITORIALES ------------------

        {
            title: 'DIRECCIÓN / UBICACIÓN',
            key: 'direccion',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-800">
                        {record.calle ? `${record.calle} ${record.numero || ''}`.trim() : 'Sin calle'}
                    </span>
                    <span className="flex items-center text-xs text-gray-500">
                        <EnvironmentOutlined className="mr-1" /> {record.colonia || 'Sin colonia'}{' '}
                        {record.codigo_postal ? `(CP: ${record.codigo_postal})` : ''}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5 text-xs">
                        {record.state && <span className="text-gray-500">Estado: {record.state.nombre}</span>}
                        {record.municipality && (
                            <span className="text-gray-500">Municipio: {record.municipality.nombre}</span>
                        )}
                        {record.demarcacion && (
                            <span className="text-orange-500">Demarcación: {record.demarcacion.nombre}</span>
                        )}
                        {record.seccion_electoral && (
                            <span className="font-bold text-blue-500">Sección: {record.seccion_electoral}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'FECHA REGISTRO',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: true,
            valueType: 'dateRange',
            render: (_, record) => (
                <span className="flex items-center text-xs text-gray-600">
                    <CalendarOutlined className="mr-2" /> {new Date(record.created_at).toLocaleDateString()}
                </span>
            ),
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
                const p = (availablePromotores || []).find((p) => p.id === record.promotor_id);
                return p ? (
                    <span className="text-xs font-medium text-gray-700">
                        {p.name} {p.apodo ? `("${p.apodo}")` : ''}
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">No asignado</span>
                );
            },
        },
    ];

    return (
        <MainLayout>
            <Head title="Promovidos" />

            <Card variant="borderless" className="mobile-full-width-card shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="m-0 text-xl font-bold">Promovidos (Simpatizantes)</h2>
                        <p className="mt-1 text-sm text-gray-500">Lista de personas registradas por los promotores.</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                        <TableCrud.TrashedSwitch actionRef={actionRef} />
                        <TableCrud.ExportButton
                            actionRef={actionRef}
                            endpoint="/promovidos"
                            allowedRoles={['presidente', 'rd', 'admin', 'superuser']}
                        />
                        <TableCrud.CreateButton
                            modalRef={modalRef}
                            resourceName="promovido"
                            className="w-full bg-gray-800 hover:bg-gray-700 sm:w-auto"
                        />
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/promovidos"
                    modalRef={modalRef}
                    resourceName="promovido"
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
                        <PromovidoCard
                            record={record}
                            actionsNode={actionsNode}
                            handlers={handlers}
                            onOpenApoyos={handleOpenApoyos}
                            availablePromotores={availablePromotores}
                        />
                    )}
                />

                <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 lg:flex-row">
                    <p className="m-0 flex-1 text-sm text-gray-600">
                        <span className="mr-2 text-blue-500">ℹ️</span>
                        Esta es la base principal de la estructura electoral. Los promovidos son registrados
                        directamente por los promotores en el campo.
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

            <ApoyosDrawer ref={apoyosDrawerRef} apiBasePath="/promovidos" />
        </MainLayout>
    );
}
