import React, { useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import { Card, Tag, Button, Modal, Descriptions, Table, Space, Segmented, message, Tooltip, Alert } from 'antd';
import {
    EyeOutlined,
    HistoryOutlined,
    CalendarOutlined,
    ArrowRightOutlined,
    BugOutlined,
    CopyOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    AppstoreOutlined,
    FileTextOutlined,
    GlobalOutlined,
    CodeOutlined,
} from '@ant-design/icons';
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

// Friendly translations for Model and Module names
const MODULE_NAMES = {
    User: 'Usuario / Estructura',
    Promovido: 'Promovidos (Simpatizantes)',
    Apoyo: 'Kardex de Apoyos',
    Demarcacion: 'Demarcación',
    SeccionElectoral: 'Sección Electoral',
    'Error del Sistema': 'Error del Sistema',
    'Sincronización Móvil': 'Sincronización Móvil',
    'Sincronización Móvil (Global)': 'Sincronización Móvil (Global)',
    'Catálogos Móvil': 'Catálogos Móvil',
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
        return <span className="font-mono text-xs text-blue-500">(Datos geográficos/Polígono)</span>;
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
    const [category, setCategory] = useState('all');
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const actionRef = React.useRef();

    const handleViewDetail = (record) => {
        setSelectedLog(record);
        setCopied(false);
        setIsModalOpen(true);
    };

    const handleCopyTrace = (traceText) => {
        if (!traceText) return;
        navigator.clipboard
            .writeText(traceText)
            .then(() => {
                setCopied(true);
                message.success('Stack trace copiado al portapapeles');
                setTimeout(() => setCopied(false), 2500);
            })
            .catch(() => {
                message.error('No se pudo copiar al portapapeles');
            });
    };

    const columns = [
        {
            title: 'FECHA / HORA',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: true,
            valueType: 'dateRange',
            render: (_, record) => (
                <div className="flex items-center text-xs text-gray-700">
                    <CalendarOutlined className="mr-2 text-gray-400" />
                    <span>{new Date(record.created_at).toLocaleString('es-MX')}</span>
                </div>
            ),
        },
        {
            title: 'USUARIO',
            dataIndex: 'user_identifier',
            key: 'user_identifier',
            render: (text) => (
                <span className="text-xs font-semibold text-gray-800">{text || 'Sistema / Anónimo'}</span>
            ),
        },
        {
            title: 'ACCIÓN / TIPO',
            dataIndex: 'action',
            key: 'action',
            valueType: 'select',
            valueEnum: {
                created: { text: 'Creación', status: 'Success' },
                updated: { text: 'Actualización', status: 'Processing' },
                deleted: { text: 'Eliminación', status: 'Error' },
                error: { text: 'Error / Excepción', status: 'Error' },
            },
            render: (_, record) => {
                const action = record.action;
                let color = 'blue';
                let label = 'Actualización';
                let icon = null;

                if (action === 'created') {
                    color = 'green';
                    label = 'Creación';
                } else if (action === 'deleted') {
                    color = 'red';
                    label = 'Eliminación';
                } else if (action === 'impersonate_start') {
                    color = 'purple';
                    label = 'Inició Suplantación';
                } else if (action === 'impersonate_stop') {
                    color = 'orange';
                    label = 'Detuvo Suplantación';
                } else if (action === 'error') {
                    color = 'volcano';
                    label = 'Error del Sistema';
                    icon = <BugOutlined className="mr-1" />;
                } else if (action !== 'updated') {
                    label = action;
                }

                return (
                    <Tag color={color} className="inline-flex items-center text-[10px] font-bold uppercase">
                        {icon}
                        {label}
                    </Tag>
                );
            },
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
                'Error del Sistema': { text: 'Error del Sistema' },
                'Sincronización Móvil': { text: 'Sincronización Móvil' },
            },
            render: (text, record) => {
                const isError = record.action === 'error';
                return (
                    <span className={`text-xs ${isError ? 'font-semibold text-rose-700' : 'text-gray-600'}`}>
                        {MODULE_NAMES[text] || text}
                    </span>
                );
            },
        },
        {
            title: 'REGISTRO AFECTADO / MENSAJE',
            dataIndex: 'model_representation',
            key: 'model_representation',
            render: (text, record) => {
                if (record.action === 'error') {
                    const file = record.changed_data?.file;
                    const line = record.changed_data?.line;
                    const shortFile = file ? file.split('/').slice(-2).join('/') : null;

                    return (
                        <div className="flex max-w-sm flex-col">
                            <span className="truncate text-xs font-medium text-rose-700" title={text}>
                                {text}
                            </span>
                            {shortFile && (
                                <span
                                    className="truncate font-mono text-[10px] text-gray-400"
                                    title={`${file}:${line}`}
                                >
                                    {shortFile}:{line}
                                </span>
                            )}
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-800">{text}</span>
                        {record.model_id && (
                            <span className="font-mono text-[10px] text-gray-400">ID: {record.model_id}</span>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'DIRECCIÓN IP',
            dataIndex: 'ip_address',
            key: 'ip_address',
            render: (text, record) => {
                const method = record.original_data?.method;
                return (
                    <div className="flex flex-col">
                        <span className="font-mono text-xs text-gray-600">{text || 'N/A'}</span>
                        {method && <span className="text-[10px] font-semibold text-gray-400">{method}</span>}
                    </div>
                );
            },
        },
        {
            title: 'DETALLE',
            key: 'acciones',
            width: 100,
            align: 'center',
            search: false,
            render: (_, record) => (
                <Button
                    type={record.action === 'error' ? 'default' : 'text'}
                    danger={record.action === 'error'}
                    icon={record.action === 'error' ? <BugOutlined /> : <EyeOutlined className="text-blue-600" />}
                    title={record.action === 'error' ? 'Inspeccionar Error' : 'Ver detalle de cambios'}
                    onClick={() => handleViewDetail(record)}
                    size="small"
                >
                    {record.action === 'error' ? 'Inspeccionar' : ''}
                </Button>
            ),
        },
    ];

    // Build data representation for creations/deletions details table
    const renderSimpleDataList = (data) => {
        if (!data || Object.keys(data).length === 0) {
            return <div className="p-4 text-center text-gray-400 italic">No hay datos registrados.</div>;
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
                render: (text) => <span className="font-semibold text-gray-700">{text}</span>,
            },
            {
                title: 'Valor',
                dataIndex: 'value',
                key: 'value',
                render: (val, record) => formatValue(record.key, val),
            },
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
            return <div className="p-4 text-center text-gray-400 italic">No se detectaron diferencias.</div>;
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
                render: (text) => <span className="font-semibold text-gray-700">{text}</span>,
            },
            {
                title: 'Valor Anterior',
                dataIndex: 'oldValue',
                key: 'oldValue',
                width: '35%',
                className: 'bg-red-50/50',
                render: (val, record) => (
                    <div className="text-red-700 line-through">{formatValue(record.key, val)}</div>
                ),
            },
            {
                title: '',
                key: 'separator',
                width: '5%',
                align: 'center',
                render: () => <ArrowRightOutlined className="text-gray-400" />,
            },
            {
                title: 'Valor Nuevo',
                dataIndex: 'newValue',
                key: 'newValue',
                width: '30%',
                className: 'bg-green-50/50',
                render: (val, record) => (
                    <div className="font-medium text-green-700">{formatValue(record.key, val)}</div>
                ),
            },
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

    // Dedicated Error Inspector rendering
    const renderErrorInspector = (log) => {
        const changed = log.changed_data || {};
        const original = log.original_data || {};
        const trace = changed.trace || [];
        const traceString = Array.isArray(trace) ? trace.join('\n') : String(trace || '');
        const payload = original.payload || {};
        const context = changed.context || {};

        return (
            <div className="space-y-5 pt-2">
                {/* Alert summary */}
                <Alert
                    message={
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold text-rose-900">
                                {changed.exception_class || log.model_type || 'Excepción del Sistema'}
                            </span>
                            {original.status_code && (
                                <Tag color="error" className="font-mono font-bold">
                                    HTTP {original.status_code}
                                </Tag>
                            )}
                        </div>
                    }
                    description={
                        <div className="mt-1 text-xs leading-relaxed font-medium text-rose-800">
                            {changed.message || log.model_representation}
                        </div>
                    }
                    type="error"
                    showIcon
                    icon={<BugOutlined className="text-lg text-rose-600" />}
                    className="border-rose-200 bg-rose-50"
                />

                {/* Metadata technical descriptions */}
                <Descriptions bordered size="small" column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Usuario Ejecutor" span={2}>
                        <span className="font-semibold text-gray-800">
                            {log.user_identifier || 'Sistema / Anónimo'}
                        </span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Módulo / Origen">
                        <Tag color="geekblue" className="font-semibold">
                            {MODULE_NAMES[log.model_friendly_name] || log.model_friendly_name}
                        </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Petición HTTP">
                        <Space>
                            {original.method && (
                                <Tag
                                    color={
                                        original.method === 'POST'
                                            ? 'blue'
                                            : original.method === 'GET'
                                              ? 'green'
                                              : 'orange'
                                    }
                                    className="font-mono font-bold"
                                >
                                    {original.method}
                                </Tag>
                            )}
                            <span className="font-mono text-xs break-all text-gray-700">
                                {original.url || original.path || 'N/A'}
                            </span>
                        </Space>
                    </Descriptions.Item>

                    {changed.file && (
                        <Descriptions.Item label="Archivo y Línea" span={2}>
                            <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-xs break-all text-gray-800">
                                {changed.file} : <strong className="text-rose-600">{changed.line}</strong>
                            </span>
                        </Descriptions.Item>
                    )}

                    <Descriptions.Item label="Fecha y Hora">
                        {new Date(log.created_at).toLocaleString('es-MX')}
                    </Descriptions.Item>

                    <Descriptions.Item label="Dirección IP">
                        <span className="font-mono text-xs">{log.ip_address || 'N/A'}</span>
                    </Descriptions.Item>

                    <Descriptions.Item label="Navegador (User Agent)" span={2}>
                        <span className="text-xs break-all text-gray-500">{log.user_agent || 'N/A'}</span>
                    </Descriptions.Item>
                </Descriptions>

                {/* Payload / Context section */}
                {(Object.keys(payload).length > 0 || Object.keys(context).length > 0) && (
                    <div className="space-y-3">
                        <h4 className="flex items-center gap-1.5 border-b pb-1 text-xs font-bold tracking-wider text-gray-700 uppercase">
                            <FileTextOutlined className="text-blue-500" />
                            Contexto y Parámetros de Entrada
                        </h4>

                        {Object.keys(payload).length > 0 && (
                            <div>
                                <span className="text-[11px] font-semibold text-gray-500">
                                    Parámetros Enviados (Payload):
                                </span>
                                <div className="mt-1 max-h-48 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2.5">
                                    <pre className="m-0 font-mono text-xs whitespace-pre-wrap text-gray-800">
                                        {JSON.stringify(payload, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {Object.keys(context).length > 0 && (
                            <div>
                                <span className="text-[11px] font-semibold text-gray-500">
                                    Contexto Adicional del Proceso:
                                </span>
                                <div className="mt-1 max-h-48 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2.5">
                                    <pre className="m-0 font-mono text-xs whitespace-pre-wrap text-gray-800">
                                        {JSON.stringify(context, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Stack Trace section */}
                {traceString && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-1">
                            <h4 className="m-0 flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-700 uppercase">
                                <CodeOutlined className="text-rose-500" />
                                Pila de Ejecución (Stack Trace)
                            </h4>
                            <Button
                                size="small"
                                icon={copied ? <CheckCircleOutlined className="text-emerald-500" /> : <CopyOutlined />}
                                onClick={() => handleCopyTrace(traceString)}
                                className="text-xs"
                            >
                                {copied ? 'Copiado' : 'Copiar Stack Trace'}
                            </Button>
                        </div>

                        <div className="relative">
                            <pre className="max-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-200 shadow-inner">
                                {traceString}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const mobileCardRender = (record) => {
        const isError = record.action === 'error';
        let actionColor = 'blue';
        let actionLabel = 'Actualización';

        if (record.action === 'created') {
            actionColor = 'green';
            actionLabel = 'Creación';
        } else if (record.action === 'deleted') {
            actionColor = 'red';
            actionLabel = 'Eliminación';
        } else if (record.action === 'impersonate_start') {
            actionColor = 'purple';
            actionLabel = 'Inició Suplantación';
        } else if (record.action === 'impersonate_stop') {
            actionColor = 'orange';
            actionLabel = 'Detuvo Suplantación';
        } else if (record.action === 'error') {
            actionColor = 'volcano';
            actionLabel = 'Error';
        } else if (record.action !== 'updated') {
            actionLabel = record.action;
        }

        return (
            <Card
                size="small"
                bordered
                className={`w-full shadow-sm transition-colors ${isError ? 'border-rose-200 bg-rose-50/20' : ''}`}
            >
                <div className="mb-2 flex items-start justify-between">
                    <Tag color={actionColor} className="m-0 text-[10px] font-bold uppercase">
                        {isError && <BugOutlined className="mr-1" />}
                        {actionLabel}
                    </Tag>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <CalendarOutlined />
                        {new Date(record.created_at).toLocaleString('es-MX')}
                    </span>
                </div>

                <div className="mt-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                            Usuario
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                            {record.user_identifier || 'Sistema / Anónimo'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">Módulo</span>
                        <span className={`text-xs ${isError ? 'font-semibold text-rose-700' : 'text-gray-600'}`}>
                            {MODULE_NAMES[record.model_friendly_name] || record.model_friendly_name}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                            {isError ? 'Mensaje' : 'Registro'}
                        </span>
                        <div className="max-w-[65%] truncate text-right">
                            <span className={`text-xs font-medium ${isError ? 'text-rose-700' : 'text-gray-800'}`}>
                                {record.model_representation}
                            </span>
                            {record.model_id && (
                                <span className="ml-1 font-mono text-[10px] text-gray-400">ID: {record.model_id}</span>
                            )}
                        </div>
                    </div>
                    {record.ip_address && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">IP</span>
                            <span className="font-mono text-xs text-gray-500">{record.ip_address}</span>
                        </div>
                    )}
                </div>

                <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
                    <Button
                        type="link"
                        danger={isError}
                        size="small"
                        icon={isError ? <BugOutlined /> : <EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                        className="p-0 text-xs font-medium"
                    >
                        {isError ? 'Inspeccionar Error' : 'Ver detalle'}
                    </Button>
                </div>
            </Card>
        );
    };

    return (
        <MainLayout>
            <Head title="Bitácora de Logs y Errores" />

            <Card bordered={false} className="shadow-sm">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-center">
                    <div>
                        <h2 className="m-0 flex items-center gap-2 text-xl font-bold">
                            <HistoryOutlined className="text-gray-800" />
                            Bitácora del Sistema
                        </h2>
                        <p className="mt-1 mb-0 text-sm text-gray-500">
                            Auditoría completa de movimientos de base de datos y registro de errores y excepciones.
                        </p>
                    </div>

                    {/* Fast category filter */}
                    <div className="flex w-full justify-start md:w-auto md:justify-end">
                        <Segmented
                            value={category}
                            onChange={(val) => {
                                setCategory(val);
                                actionRef.current?.reload();
                            }}
                            options={[
                                {
                                    label: (
                                        <div className="flex items-center gap-1.5 px-1 py-0.5">
                                            <AppstoreOutlined />
                                            <span>Todos</span>
                                        </div>
                                    ),
                                    value: 'all',
                                },
                                {
                                    label: (
                                        <div className="flex items-center gap-1.5 px-1 py-0.5">
                                            <HistoryOutlined />
                                            <span>Movimientos (CRUD)</span>
                                        </div>
                                    ),
                                    value: 'activities',
                                },
                                {
                                    label: (
                                        <div className="flex items-center gap-1.5 px-1 py-0.5 font-medium text-rose-600">
                                            <BugOutlined />
                                            <span>Errores del Sistema</span>
                                        </div>
                                    ),
                                    value: 'errors',
                                },
                            ]}
                            className="rounded-lg bg-gray-100 p-1"
                        />
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/logs"
                    params={{ category }}
                    rowKey="id"
                    search={true}
                    mobileCardRender={mobileCardRender}
                />
            </Card>

            <Modal
                title={
                    <Space>
                        {selectedLog?.action === 'error' ? (
                            <BugOutlined className="text-rose-600" />
                        ) : (
                            <HistoryOutlined />
                        )}
                        <span className={selectedLog?.action === 'error' ? 'font-bold text-rose-900' : ''}>
                            {selectedLog?.action === 'error'
                                ? `Inspección de Error #${selectedLog?.id}`
                                : `Detalles del Movimiento #${selectedLog?.id}`}
                        </span>
                    </Space>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
                        Cerrar
                    </Button>,
                ]}
                width={850}
                destroyOnClose
            >
                {selectedLog &&
                    (selectedLog.action === 'error' ? (
                        renderErrorInspector(selectedLog)
                    ) : (
                        <div className="space-y-6 pt-3">
                            <Descriptions bordered size="small" column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                                <Descriptions.Item label="Usuario Ejecutor" span={2}>
                                    <span className="font-semibold text-gray-800">
                                        {selectedLog.user_identifier || 'Sistema / Anónimo'}
                                    </span>
                                </Descriptions.Item>
                                <Descriptions.Item label="Acción">
                                    <Tag
                                        color={
                                            selectedLog.action === 'created'
                                                ? 'green'
                                                : selectedLog.action === 'deleted'
                                                  ? 'red'
                                                  : selectedLog.action === 'impersonate_start'
                                                    ? 'purple'
                                                    : selectedLog.action === 'impersonate_stop'
                                                      ? 'orange'
                                                      : 'blue'
                                        }
                                        className="text-[10px] font-bold uppercase"
                                    >
                                        {selectedLog.action === 'created'
                                            ? 'Creación'
                                            : selectedLog.action === 'deleted'
                                              ? 'Eliminación'
                                              : selectedLog.action === 'impersonate_start'
                                                ? 'Inició Suplantación'
                                                : selectedLog.action === 'impersonate_stop'
                                                  ? 'Detuvo Suplantación'
                                                  : selectedLog.action === 'updated'
                                                    ? 'Actualización'
                                                    : selectedLog.action}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Módulo">
                                    {MODULE_NAMES[selectedLog.model_friendly_name] || selectedLog.model_friendly_name}
                                </Descriptions.Item>
                                <Descriptions.Item label="Registro Relacionado">
                                    <span className="font-semibold text-gray-800">
                                        {selectedLog.model_representation}
                                    </span>
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
                                <h3 className="mb-2 border-b pb-1 text-sm font-bold text-gray-800">
                                    Detalle de Atributos y Cambios
                                </h3>

                                {selectedLog.action === 'created' && (
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">
                                            Valores iniciales asignados al crear el registro:
                                        </p>
                                        {renderSimpleDataList(selectedLog.changed_data)}
                                    </div>
                                )}

                                {selectedLog.action === 'deleted' && (
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">
                                            Valores originales que tenía el registro al ser eliminado:
                                        </p>
                                        {renderSimpleDataList(selectedLog.original_data)}
                                    </div>
                                )}

                                {selectedLog.action === 'updated' && (
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">
                                            Campos específicos que cambiaron en la base de datos:
                                        </p>
                                        {renderDiffTable(selectedLog.original_data, selectedLog.changed_data)}
                                    </div>
                                )}

                                {(selectedLog.action === 'impersonate_start' ||
                                    selectedLog.action === 'impersonate_stop') && (
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">
                                            Detalles de la sesión de suplantación:
                                        </p>
                                        {renderSimpleDataList(selectedLog.changed_data || {})}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
            </Modal>
        </MainLayout>
    );
}
