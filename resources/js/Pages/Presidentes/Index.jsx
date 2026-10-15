import React, { useState, useRef } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import { Button, Avatar, Badge, Image, Tag, message, Switch } from 'antd';
import { UserOutlined, PhoneOutlined, EnvironmentOutlined, MailOutlined, CrownOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import PresidenteFormModal from './PresidenteFormModal';
import PresidenteCard from './PresidenteCard';
import axios from 'axios';

export default function PresidentesIndex() {
    const actionRef = useRef();
    const modalRef = useRef();
    const [togglingId, setTogglingId] = useState(null);

    const handleStatusToggle = async (record, checked) => {
        setTogglingId(record.id);
        try {
            await axios.post(`/presidentes/${record.id}/toggle-status`, {
                estado: checked ? 1 : 0,
            });
            message.success(`Estatus del presidente actualizado a ${checked ? 'Activo' : 'Inactivo'}`);
            actionRef.current?.reload();
        } catch (err) {
            console.error('Error al actualizar el estatus:', err);
            message.error('No se pudo actualizar el estatus del presidente');
        } finally {
            setTogglingId(null);
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            search: false,
            render: (id) => <span className="font-medium text-blue-600">PRES-{String(id).padStart(4, '0')}</span>,
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
                        className="bg-blue-100 font-bold text-blue-600"
                    />
                ),
        },
        {
            title: 'NOMBRE DEL PRESIDENTE',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                        {record.nombre || record.name} {record.apellidos || ''}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MailOutlined className="text-gray-400" /> {record.email}
                    </span>
                </div>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'state_id',
            key: 'state_id',
            valueType: 'select',
            hideInTable: true,
            request: async () => {
                const response = await axios.get('/catalogos/estados');
                return response.data.map((e) => ({ label: e.name || e.nombre, value: e.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Estado',
            },
        },
        {
            title: 'Municipio',
            dataIndex: 'municipality_id',
            key: 'municipality_id',
            valueType: 'select',
            hideInTable: true,
            dependencies: ['state_id'],
            request: async (params) => {
                const stateId = params?.state_id;
                const url = stateId ? `/catalogos/municipios?state_id=${stateId}` : '/catalogos/municipios';
                const response = await axios.get(url);
                return response.data.map((m) => ({ label: m.name || m.nombre, value: m.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Municipio',
            },
        },
        {
            title: 'ESTADO / MUNICIPIO',
            key: 'ubicacion',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col text-xs">
                    <span className="font-medium text-gray-700">
                        <EnvironmentOutlined className="mr-1 text-blue-500" />
                        {record.municipality?.nombre || record.municipality?.name || 'N/A'}
                    </span>
                    <span className="pl-4 text-gray-400">{record.state?.nombre || record.state?.name || 'N/A'}</span>
                </div>
            ),
        },
        {
            title: 'TELÉFONO',
            dataIndex: 'telefono',
            key: 'telefono',
            width: 130,
            render: (tel) => (
                <span className="text-xs text-gray-600">
                    <PhoneOutlined className="mr-1 text-gray-400" />
                    {tel || 'N/A'}
                </span>
            ),
        },
        {
            title: 'ESTRUCTURA A CARGO',
            key: 'estructura',
            search: false,
            render: (_, record) => (
                <div className="flex items-center gap-2">
                    <Tag color="blue">{record.rds_count || 0} RD</Tag>
                    <Tag color="purple">{record.operadores_count || 0} Op</Tag>
                    <Tag color="cyan">{record.promotores_count || 0} Prom</Tag>
                </div>
            ),
        },
        {
            title: 'ESTATUS',
            dataIndex: 'estado',
            key: 'estado',
            width: 130,
            valueType: 'select',
            valueEnum: {
                true: { text: 'Activo', status: 'Success' },
                false: { text: 'Inactivo', status: 'Error' },
            },
            render: (_, record) =>
                record.deleted_at ? (
                    <Badge status="default" text="Eliminado" />
                ) : (
                    <Switch
                        checked={Boolean(record.estado)}
                        loading={togglingId === record.id}
                        checkedChildren="Activo"
                        unCheckedChildren="Inactivo"
                        onChange={(checked) => handleStatusToggle(record, checked)}
                    />
                ),
        },
    ];

    return (
        <MainLayout>
            <Head title="Gestión de Presidentes Municipales" />

            <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                            <CrownOutlined className="text-amber-500" />
                            Presidentes Municipales / Coordinadores
                        </h1>
                        <p className="text-sm text-gray-500">
                            Módulo exclusivo de administración global de Presidentes para el rol Superuser.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <TableCrud.TrashedSwitch actionRef={actionRef} />

                        <TableCrud.ExportButton
                            actionRef={actionRef}
                            endpoint="/presidentes"
                            label="Exportar"
                            className="border-gray-300 bg-white text-gray-700 hover:text-blue-600"
                        />

                        <TableCrud.CreateButton
                            modalRef={modalRef}
                            resourceName="presidente"
                            label="Nuevo Presidente"
                            className="bg-amber-500 font-medium hover:bg-amber-600"
                        />
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/presidentes"
                    modalRef={modalRef}
                    resourceName="presidente"
                    canImpersonate
                    rowKey="id"
                    search={true}
                    editTitle="Editar Presidente"
                    deleteTitle="Eliminar Presidente"
                    restoreTitle="Restaurar Presidente"
                    mobileCardRender={(record, actionsNode, handlers) => (
                        <PresidenteCard
                            record={record}
                            actionsNode={actionsNode}
                            handlers={handlers}
                            onStatusToggle={handleStatusToggle}
                            togglingId={togglingId}
                        />
                    )}
                />
            </div>

            {/* Modal de Registro / Edición de Presidente */}
            <PresidenteFormModal
                ref={modalRef}
                onSuccess={() => {
                    actionRef.current?.reload();
                }}
            />
        </MainLayout>
    );
}
