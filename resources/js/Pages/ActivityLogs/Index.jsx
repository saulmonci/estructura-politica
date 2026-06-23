import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import { Card, Tag, Button, Modal, Descriptions, Table, Space } from 'antd';
import { EyeOutlined, HistoryOutlined, CalendarOutlined, ArrowRightOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';

// Friendly labels for model attributes in Spanish
const FIELD_LABELS = {
    id: 'ID',
    nombre: 'Nombre',
    apellidos: 'Apellidos',
    name: 'Nombre Completo',
    email: 'Correo Electrónico',
    role: 'Rol del Usuario',
    sexo: 'Género',
    calle: 'Calle',
    numero_exterior: 'Número Exterior',
    numero_interior: 'Número Interior',
    colonia: 'Colonia',
    codigo_postal: 'Código Postal',
    demarcacion_id: 'ID Demarcación',
    seccion_electoral: 'Sección Electoral',
    clave_electoral: 'Clave Electoral',
    clave_elector: 'Clave Elector',
    telefono: 'Teléfono',
    curp: 'CURP',
    apodo: 'Apodo',
    foto: 'Ruta de Foto',
    estado: 'Estatus (Activo/Inactivo)',
    notas: 'Notas',
    parent_id: 'Líder Asignado (ID)',
    promotor_id: 'Promotor Asignado (ID)',
    user_id: 'Usuario Relacionado (ID)',
    promovido_id: 'Promovido Relacionado (ID)',
    tipo_apoyo: 'Tipo de Apoyo',
    descripcion: 'Descripción del Apoyo',
    cantidad_monetaria: 'Monto del Apoyo',
    fecha: 'Fecha de Apoyo',
    evidencia: 'Ruta de Evidencia',
    meta: 'Meta de Votantes',
    numero: 'Número / Identificador',
    geom: 'Datos Geográficos (Polígono)',
};

// Friendly translations for Model class names
const MODULE_NAMES = {
    User: 'Usuario / Estructura',
    Promovido: 'Promovidos (Simpatizantes)',
    Apoyo: 'Kardex de Apoyos',
    Demarcacion: 'Demarcación',
    SeccionElectoral: 'Sección Electoral',
};

// Formatter helper for values
const formatValue = (key, val) => {
    if (val === null || val === undefined || val === '') {
        return <span className="text-gray-400 italic">Ninguno</span>;
    }
    if (key === 'estado') {
        return val ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>;
    }
    if (key === 'geom') {
        return <span className="text-blue-500 font-mono text-xs">(Datos geográficos/Polígono)</span>;
    }
    if (typeof val === 'boolean') {
        return val ? 'Sí' : 'No';
    }
    if (typeof val === 'object') {
        return JSON.stringify(val);
    }
    return String(val);
};

export default function ActivityLogsIndex() {
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const actionRef = React.useRef();

    const handleViewDetail = (record) => {
        setSelectedLog(record);
        setIsModalOpen(true);
    };

    const columns = [
        {
            title: 'FECHA / HORA',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: true,
            valueType: 'dateRange', // Habilita el buscador de rango de fechas
            render: (_, record) => (
                <div className="flex items-center text-xs text-gray-700">
                    <CalendarOutlined className="mr-2 text-gray-400" />
                    <span>{new Date(record.created_at).toLocaleString('es-MX')}</span>
                </div>
            )
        },
        {
            title: 'USUARIO',
            dataIndex: 'user_identifier',
            key: 'user_identifier',
            render: (text) => (
                <span className="font-semibold text-gray-800 text-xs">
                    {text || 'Sistema'}
                </span>
            )
        },
        {
            title: 'ACCIÓN',
            dataIndex: 'action',
            key: 'action',
            valueType: 'select',
            valueEnum: {
                created: { text: 'Creación', status: 'Success' },
                updated: { text: 'Actualización', status: 'Processing' },
                deleted: { text: 'Eliminación', status: 'Error' },
            },
            render: (_, record) => {
                const action = record.action;
                let color = 'blue';
                let label = 'Actualización';
                if (action === 'created') {
                    color = 'green';
                    label = 'Creación';
                } else if (action === 'deleted') {
                    color = 'red';
                    label = 'Eliminación';
                }
                return <Tag color={color} className="uppercase font-bold text-[10px]">{label}</Tag>;
            }
        },
        {
            title: 'MÓDULO',
            dataIndex: 'model_friendly_name',
            key: 'model_friendly_name',
            valueType: 'select',
            valueEnum: {
                User: { text: 'Usuario / Estructura' },
                Promovido: { text: 'Promovidos' },
                Apoyo: { text: 'Apoyos' },
                Demarcacion: { text: 'Demarcación' },
                SeccionElectoral: { text: 'Sección' },
            },
            render: (text) => (
                <span className="text-gray-600 text-xs">
                    {MODULE_NAMES[text] || text}
                </span>
            )
        },
        {
            title: 'REGISTRO AFECTADO',
            dataIndex: 'model_representation',
            key: 'model_representation',
            render: (text, record) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800 text-xs">{text}</span>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {record.model_id}</span>
                </div>
            )
        },
        {
            title: 'DIRECCIÓN IP',
            dataIndex: 'ip_address',
            key: 'ip_address',
            render: (text) => <span className="font-mono text-xs text-gray-500">{text || 'N/A'}</span>
        },
        {
            title: 'DETALLE',
            key: 'acciones',
            width: 100,
            align: 'center',
            search: false,
            render: (_, record) => (
                <Button 
                    type="text" 
                    icon={<EyeOutlined className="text-blue-600" />} 
                    title="Ver detalle de cambios"
                    onClick={() => handleViewDetail(record)}
                />
            )
        }
    ];

    // Build data representation for creations/deletions details table
    const renderSimpleDataList = (data) => {
        if (!data || Object.keys(data).length === 0) {
            return <div className="text-gray-400 italic text-center p-4">No hay datos registrados.</div>;
        }

        const tableDataSource = Object.keys(data).map((key) => ({
            key,
            field: FIELD_LABELS[key] || key,
            value: data[key],
        }));

        const detailColumns = [
            {
                title: 'Campo',
                dataIndex: 'field',
                key: 'field',
                width: '40%',
                render: (text) => <span className="font-semibold text-gray-700">{text}</span>
            },
            {
                title: 'Valor',
                dataIndex: 'value',
                key: 'value',
                render: (val, record) => formatValue(record.key, val)
            }
        ];

        return (
            <Table 
                dataSource={tableDataSource} 
                columns={detailColumns} 
                pagination={false} 
                size="small" 
                bordered 
                className="mt-2"
                rowKey="key"
            />
        );
    };

    // Build comparison table for updates
    const renderDiffTable = (original, changed) => {
        const keys = Array.from(new Set([...Object.keys(original || {}), ...Object.keys(changed || {})]));
        
        if (keys.length === 0) {
            return <div className="text-gray-400 italic text-center p-4">No se detectaron diferencias.</div>;
        }

        const tableDataSource = keys.map((key) => ({
            key,
            field: FIELD_LABELS[key] || key,
            oldValue: original?.[key],
            newValue: changed?.[key],
        }));

        const diffColumns = [
            {
                title: 'Campo',
                dataIndex: 'field',
                key: 'field',
                width: '30%',
                render: (text) => <span className="font-semibold text-gray-700">{text}</span>
            },
            {
                title: 'Valor Anterior',
                dataIndex: 'oldValue',
                key: 'oldValue',
                width: '35%',
                className: 'bg-red-50/50',
                render: (val, record) => (
                    <div className="text-red-700 line-through">
                        {formatValue(record.key, val)}
                    </div>
                )
            },
            {
                title: '',
                key: 'separator',
                width: '5%',
                align: 'center',
                render: () => <ArrowRightOutlined className="text-gray-400" />
            },
            {
                title: 'Valor Nuevo',
                dataIndex: 'newValue',
                key: 'newValue',
                width: '30%',
                className: 'bg-green-50/50',
                render: (val, record) => (
                    <div className="text-green-700 font-medium">
                        {formatValue(record.key, val)}
                    </div>
                )
            }
        ];

        return (
            <Table 
                dataSource={tableDataSource} 
                columns={diffColumns} 
                pagination={false} 
                size="small" 
                bordered 
                className="mt-2"
                rowKey="key"
            />
        );
    };

    return (
        <MainLayout>
            <Head title="Bitácora de Logs" />

            <Card bordered={false} className="shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold m-0 flex items-center gap-2">
                            <HistoryOutlined className="text-gray-800" />
                            Bitácora de Movimientos
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Auditoría de todos los cambios de base de datos en el sistema.
                        </p>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/logs"
                    rowKey="id"
                    search={true}
                />
            </Card>

            <Modal
                title={
                    <Space>
                        <HistoryOutlined />
                        <span>Detalles del Movimiento #{selectedLog?.id}</span>
                    </Space>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
                        Cerrar
                    </Button>
                ]}
                width={800}
                destroyOnClose
            >
                {selectedLog && (
                    <div className="space-y-6 pt-3">
                        <Descriptions bordered size="small" column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                            <Descriptions.Item label="Usuario Ejecutor" span={2}>
                                <span className="font-semibold text-gray-800">{selectedLog.user_identifier || 'Sistema'}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Acción">
                                <Tag 
                                    color={
                                        selectedLog.action === 'created' ? 'green' : 
                                        selectedLog.action === 'deleted' ? 'red' : 'blue'
                                    } 
                                    className="uppercase font-bold text-[10px]"
                                >
                                    {selectedLog.action === 'created' ? 'Creación' :
                                     selectedLog.action === 'deleted' ? 'Eliminación' : 'Actualización'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Módulo">
                                {MODULE_NAMES[selectedLog.model_friendly_name] || selectedLog.model_friendly_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Registro Relacionado">
                                <span className="font-semibold text-gray-800">{selectedLog.model_representation}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="ID de Fila">
                                <span className="font-mono text-xs">{selectedLog.model_id}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha y Hora">
                                {new Date(selectedLog.created_at).toLocaleString('es-MX')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Dirección IP">
                                <span className="font-mono text-xs">{selectedLog.ip_address || 'N/A'}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Navegador (User Agent)" span={2}>
                                <span className="text-xs text-gray-500">{selectedLog.user_agent || 'N/A'}</span>
                            </Descriptions.Item>
                        </Descriptions>

                        <div>
                            <h3 className="text-sm font-bold text-gray-800 mb-2 border-b pb-1">
                                Detalle de Atributos y Cambios
                            </h3>
                            
                            {selectedLog.action === 'created' && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Valores iniciales asignados al crear el registro:</p>
                                    {renderSimpleDataList(selectedLog.changed_data)}
                                </div>
                            )}

                            {selectedLog.action === 'deleted' && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Valores originales que tenía el registro al ser eliminado:</p>
                                    {renderSimpleDataList(selectedLog.original_data)}
                                </div>
                            )}

                            {selectedLog.action === 'updated' && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Campos específicos que cambiaron en la base de datos:</p>
                                    {renderDiffTable(selectedLog.original_data, selectedLog.changed_data)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </MainLayout>
    );
}
