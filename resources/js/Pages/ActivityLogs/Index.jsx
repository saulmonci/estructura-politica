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
    CodeOutlined
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
        navigator.clipboard.writeText(traceText).then(() => {
            setCopied(true);
            message.success('Stack trace copiado al portapapeles');
            setTimeout(() => setCopied(false), 2500);
        }).catch(() => {
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
            )
        },
        {
            title: 'USUARIO',
            dataIndex: 'user_identifier',
            key: 'user_identifier',
            render: (text) => (
                <span className="font-semibold text-gray-800 text-xs">
                    {text || 'Sistema / Anónimo'}
                </span>
            )
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
                    <Tag color={color} className="uppercase font-bold text-[10px] inline-flex items-center">
                        {icon}
                        {label}
                    </Tag>
                );
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
            }
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
                        <div className="flex flex-col max-w-sm">
                            <span className="font-medium text-rose-700 text-xs truncate" title={text}>
                                {text}
                            </span>
                            {shortFile && (
                                <span className="text-[10px] text-gray-400 font-mono truncate" title={`${file}:${line}`}>
                                    {shortFile}:{line}
                                </span>
                            )}
                        </div>
                    );
                }

                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-800 text-xs">{text}</span>
                        {record.model_id && (
                            <span className="text-[10px] text-gray-400 font-mono">ID: {record.model_id}</span>
                        )}
                    </div>
                );
            }
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
                        {method && (
                            <span className="text-[10px] font-semibold text-gray-400">{method}</span>
                        )}
                    </div>
                );
            }
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
                            <span className="font-bold text-sm text-rose-900">
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
                        <div className="mt-1 text-xs text-rose-800 font-medium leading-relaxed">
                            {changed.message || log.model_representation}
                        </div>
                    }
                    type="error"
                    showIcon
                    icon={<BugOutlined className="text-rose-600 text-lg" />}
                    className="border-rose-200 bg-rose-50"
                />

                {/* Metadata technical descriptions */}
                <Descriptions bordered size="small" column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Usuario Ejecutor" span={2}>
                        <span className="font-semibold text-gray-800">{log.user_identifier || 'Sistema / Anónimo'}</span>
                    </Descriptions.Item>
                    
                    <Descriptions.Item label="Módulo / Origen">
                        <Tag color="geekblue" className="font-semibold">{MODULE_NAMES[log.model_friendly_name] || log.model_friendly_name}</Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Petición HTTP">
                        <Space>
                            {original.method && (
                                <Tag color={original.method === 'POST' ? 'blue' : original.method === 'GET' ? 'green' : 'orange'} className="font-bold font-mono">
                                    {original.method}
                                </Tag>
                            )}
                            <span className="font-mono text-xs text-gray-700 break-all">
                                {original.url || original.path || 'N/A'}
                            </span>
                        </Space>
                    </Descriptions.Item>

                    {changed.file && (
                        <Descriptions.Item label="Archivo y Línea" span={2}>
                            <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200 break-all">
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
                        <span className="text-xs text-gray-500 break-all">{log.user_agent || 'N/A'}</span>
                    </Descriptions.Item>
                </Descriptions>

                {/* Payload / Context section */}
                {(Object.keys(payload).length > 0 || Object.keys(context).length > 0) && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                            <FileTextOutlined className="text-blue-500" />
                            Contexto y Parámetros de Entrada
                        </h4>

                        {Object.keys(payload).length > 0 && (
                            <div>
                                <span className="text-[11px] font-semibold text-gray-500">Parámetros Enviados (Payload):</span>
                                <div className="mt-1 bg-gray-50 p-2.5 rounded border border-gray-200 max-h-48 overflow-y-auto">
                                    <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap m-0">
                                        {JSON.stringify(payload, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {Object.keys(context).length > 0 && (
                            <div>
                                <span className="text-[11px] font-semibold text-gray-500">Contexto Adicional del Proceso:</span>
                                <div className="mt-1 bg-gray-50 p-2.5 rounded border border-gray-200 max-h-48 overflow-y-auto">
                                    <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap m-0">
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
                        <div className="flex justify-between items-center border-b pb-1">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 m-0">
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
                            <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed shadow-inner border border-slate-800">
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
                className={`shadow-sm w-full transition-colors ${isError ? 'border-rose-200 bg-rose-50/20' : ''}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <Tag color={actionColor} className="uppercase font-bold text-[10px] m-0">
                        {isError && <BugOutlined className="mr-1" />}
                        {actionLabel}
                    </Tag>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <CalendarOutlined />
                        {new Date(record.created_at).toLocaleString('es-MX')}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Usuario</span>
                        <span className="font-semibold text-gray-800 text-xs">{record.user_identifier || 'Sistema / Anónimo'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Módulo</span>
                        <span className={`text-xs ${isError ? 'font-semibold text-rose-700' : 'text-gray-600'}`}>
                            {MODULE_NAMES[record.model_friendly_name] || record.model_friendly_name}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                            {isError ? 'Mensaje' : 'Registro'}
                        </span>
                        <div className="text-right max-w-[65%] truncate">
                            <span className={`font-medium text-xs ${isError ? 'text-rose-700' : 'text-gray-800'}`}>
                                {record.model_representation}
                            </span>
                            {record.model_id && (
                                <span className="text-[10px] text-gray-400 font-mono ml-1">ID: {record.model_id}</span>
                            )}
                        </div>
                    </div>
                    {record.ip_address && (
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">IP</span>
                            <span className="font-mono text-xs text-gray-500">{record.ip_address}</span>
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                    <Button
                        type="link"
                        danger={isError}
                        size="small"
                        icon={isError ? <BugOutlined /> : <EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                        className="text-xs p-0 font-medium"
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold m-0 flex items-center gap-2">
                            <HistoryOutlined className="text-gray-800" />
                            Bitácora del Sistema
                        </h2>
                        <p className="text-gray-500 text-sm mt-1 mb-0">
                            Auditoría completa de movimientos de base de datos y registro de errores y excepciones.
                        </p>
                    </div>

                    {/* Fast category filter */}
                    <div className="w-full md:w-auto flex justify-start md:justify-end">
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
                                        <div className="flex items-center gap-1.5 px-1 py-0.5 text-rose-600 font-medium">
                                            <BugOutlined />
                                            <span>Errores del Sistema</span>
                                        </div>
                                    ),
                                    value: 'errors',
                                },
                            ]}
                            className="bg-gray-100 p-1 rounded-lg"
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
                        <span className={selectedLog?.action === 'error' ? 'text-rose-900 font-bold' : ''}>
                            {selectedLog?.action === 'error' 
                                ? `Inspección de Error #${selectedLog?.id}` 
                                : `Detalles del Movimiento #${selectedLog?.id}`
                            }
                        </span>
                    </Space>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
                        Cerrar
                    </Button>
                ]}
                width={850}
                destroyOnClose
            >
                {selectedLog && (
                    selectedLog.action === 'error' ? (
                        renderErrorInspector(selectedLog)
                    ) : (
                        <div className="space-y-6 pt-3">
                            <Descriptions bordered size="small" column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                                <Descriptions.Item label="Usuario Ejecutor" span={2}>
                                    <span className="font-semibold text-gray-800">{selectedLog.user_identifier || 'Sistema / Anónimo'}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label="Acción">
                                    <Tag 
                                        color={
                                            selectedLog.action === 'created' ? 'green' : 
                                            selectedLog.action === 'deleted' ? 'red' : 
                                            selectedLog.action === 'impersonate_start' ? 'purple' : 
                                            selectedLog.action === 'impersonate_stop' ? 'orange' : 'blue'
                                        } 
                                        className="uppercase font-bold text-[10px]"
                                    >
                                        {selectedLog.action === 'created' ? 'Creación' :
                                         selectedLog.action === 'deleted' ? 'Eliminación' : 
                                         selectedLog.action === 'impersonate_start' ? 'Inició Suplantación' : 
                                         selectedLog.action === 'impersonate_stop' ? 'Detuvo Suplantación' : 
                                         selectedLog.action === 'updated' ? 'Actualización' : selectedLog.action}
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

                                {(selectedLog.action === 'impersonate_start' || selectedLog.action === 'impersonate_stop') && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Detalles de la sesión de suplantación:</p>
                                        {renderSimpleDataList(selectedLog.changed_data || {})}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                )}
            </Modal>
        </MainLayout>
    );
}
