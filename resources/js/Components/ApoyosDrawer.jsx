import React, { useState, useEffect } from 'react';
import { Drawer, Button, Form, Input, DatePicker, Select, InputNumber, Upload, message, Table, Popconfirm, Tag, Space, Card } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PaperClipOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;

const ApoyosDrawer = ({ visible, onClose, promovido, entity, apiBasePath }) => {
    // Soporte legacy: si se pasan promovido y no apiBasePath, construimos la ruta
    const resolvedEntity = entity || promovido;
    const resolvedBasePath = apiBasePath || (promovido ? `/promovidos/${promovido.id}` : null);
    const resolvedTitle = resolvedEntity?.nombre_completo || resolvedEntity?.name || '';
    const [apoyos, setApoyos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState(null);
    const [currentEvidenciaUrl, setCurrentEvidenciaUrl] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (visible && resolvedBasePath) {
            fetchApoyos();
        } else {
            setApoyos([]);
            setIsFormVisible(false);
            form.resetFields();
            setEditingId(null);
        }
    }, [visible, resolvedBasePath]);

    const isImageUrl = (url) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);

    const fetchApoyos = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${resolvedBasePath}/apoyos`);
            setApoyos(response.data);
        } catch (error) {
            message.error('Error al cargar los apoyos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const formData = new FormData();
            formData.append('fecha', values.fecha.format('YYYY-MM-DD'));
            formData.append('tipo_apoyo', values.tipo_apoyo);
            formData.append('estado', values.estado);
            if (values.descripcion) formData.append('descripcion', values.descripcion);
            if (values.cantidad_monetaria) formData.append('cantidad_monetaria', values.cantidad_monetaria);
            
            if (values.evidencia && values.evidencia.fileList.length > 0) {
                formData.append('evidencia_file', values.evidencia.fileList[0].originFileObj);
            }

            if (editingId) {
                // Para update con FormData puede ser engañoso en Laravel, simulamos put con _method
                formData.append('_method', 'PUT');
                await axios.post(`/apoyos/${editingId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                message.success('Apoyo actualizado correctamente');
            } else {
                await axios.post(`${resolvedBasePath}/apoyos`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                message.success('Apoyo registrado correctamente');
            }

            setIsFormVisible(false);
            form.resetFields();
            setEditingId(null);
            fetchApoyos();
        } catch (error) {
            console.error(error);
            message.error('Error al guardar el apoyo');
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/apoyos/${id}`);
            message.success('Apoyo eliminado');
            fetchApoyos();
        } catch (error) {
            message.error('Error al eliminar');
        }
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setCurrentEvidenciaUrl(record.evidencia_url || null);
        form.setFieldsValue({
            fecha: dayjs(record.fecha),
            tipo_apoyo: record.tipo_apoyo,
            descripcion: record.descripcion,
            estado: record.estado,
            cantidad_monetaria: record.cantidad_monetaria,
            // No pre-llenamos el campo file — se muestra la URL debajo
        });
        setIsFormVisible(true);
    };

    const handleCancelForm = () => {
        setIsFormVisible(false);
        setEditingId(null);
        setCurrentEvidenciaUrl(null);
        form.resetFields();
    };

    const columns = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100 },
        { title: 'Tipo de Apoyo', dataIndex: 'tipo_apoyo', key: 'tipo_apoyo' },
        { title: 'Cantidad ($)', dataIndex: 'cantidad_monetaria', key: 'cantidad_monetaria', width: 110,
            render: (val) => val ? `$${Number(val).toLocaleString()}` : '-'
        },
        { 
            title: 'Estado', 
            dataIndex: 'estado', 
            key: 'estado',
            width: 100,
            render: (estado) => {
                let color = estado === 'Entregado' ? 'green' : (estado === 'Pendiente' ? 'orange' : 'red');
                return <Tag color={color}>{estado}</Tag>;
            }
        },
        { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion',
            render: (v) => v || <span className="text-gray-400">-</span>
        },
        {
            title: 'Evidencia',
            dataIndex: 'evidencia_url',
            key: 'evidencia',
            width: 90,
            align: 'center',
            render: (url) => {
                if (!url) return <span className="text-gray-300">-</span>;
                if (isImageUrl(url)) {
                    return (
                        <a href={url} target="_blank" rel="noopener noreferrer" title="Ver imagen">
                            <img src={url} alt="evidencia" className="w-10 h-10 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                        </a>
                    );
                }
                return (
                    <a href={url} target="_blank" rel="noopener noreferrer" title="Ver archivo">
                        <Button size="small" icon={<PaperClipOutlined />} type="link">Ver</Button>
                    </a>
                );
            }
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
                    <Popconfirm title="¿Eliminar apoyo?" onConfirm={() => handleDelete(record.id)}>
                        <Button danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Drawer
            title={`Kardex de Apoyos: ${resolvedTitle}`}
            width={isMobile ? '100%' : 720}
            onClose={onClose}
            open={visible}
            bodyStyle={{ paddingBottom: 80 }}
        >
            {!isFormVisible ? (
                <>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => {
                            setIsFormVisible(true);
                            setEditingId(null);
                            form.resetFields();
                        }}
                        style={{ marginBottom: 16 }}
                        block={isMobile}
                    >
                        Registrar Nuevo Apoyo
                    </Button>
                    {isMobile ? (
                        <div className="flex flex-col gap-3">
                            {loading ? (
                                <div className="text-center py-6 text-gray-500">Cargando apoyos...</div>
                            ) : apoyos.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 bg-gray-50 border rounded-lg">No hay apoyos registrados.</div>
                            ) : (
                                apoyos.map(record => {
                                    let tagColor = record.estado === 'Entregado' ? 'green' : (record.estado === 'Pendiente' ? 'orange' : 'red');
                                    return (
                                        <Card key={record.id} size="small" className="shadow-sm border border-gray-100 rounded-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-bold text-gray-800 text-sm">{record.tipo_apoyo}</span>
                                                    <div className="text-xs text-gray-400 mt-0.5">Fecha: {record.fecha}</div>
                                                </div>
                                                <Tag color={tagColor} className="m-0">{record.estado}</Tag>
                                            </div>
                                            <div className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                                                <span className="font-semibold block text-gray-500 mb-0.5">Descripción:</span>
                                                {record.descripcion || 'Sin descripción'}
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {record.cantidad_monetaria ? `$${Number(record.cantidad_monetaria).toLocaleString()}` : '$0'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {record.evidencia_url && (
                                                        isImageUrl(record.evidencia_url) ? (
                                                            <a href={record.evidencia_url} target="_blank" rel="noopener noreferrer">
                                                                <img src={record.evidencia_url} alt="evidencia" className="w-8 h-8 object-cover rounded border" />
                                                            </a>
                                                        ) : (
                                                            <a href={record.evidencia_url} target="_blank" rel="noopener noreferrer">
                                                                <Button size="small" icon={<PaperClipOutlined />} type="link">Doc</Button>
                                                            </a>
                                                        )
                                                    )}
                                                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
                                                    <Popconfirm title="¿Eliminar apoyo?" onConfirm={() => handleDelete(record.id)}>
                                                        <Button danger icon={<DeleteOutlined />} size="small" />
                                                    </Popconfirm>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <Table 
                            dataSource={apoyos} 
                            columns={columns} 
                            rowKey="id" 
                            loading={loading} 
                            pagination={{ pageSize: 5 }}
                        />
                    )}
                </>
            ) : (
                <Form layout="vertical" form={form} onFinish={handleSubmit}>
                    <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: 'Seleccione fecha' }]}>
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                    
                    <Form.Item name="tipo_apoyo" label="Tipo de Apoyo" rules={[{ required: true, message: 'Ingrese tipo de apoyo' }]}>
                        <Input placeholder="Ej. Despensa, Gestión Médica, etc." />
                    </Form.Item>
                    
                    <Form.Item name="cantidad_monetaria" label="Cantidad Monetaria (Opcional)">
                        <InputNumber style={{ width: '100%' }} prefix="$" min={0} />
                    </Form.Item>

                    <Form.Item name="estado" label="Estado" initialValue="Entregado" rules={[{ required: true, message: 'Seleccione estado' }]}>
                        <Select>
                            <Option value="Entregado">Entregado</Option>
                            <Option value="Pendiente">Pendiente</Option>
                            <Option value="Cancelado">Cancelado</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="descripcion" label="Descripción / Notas">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item name="evidencia" label="Evidencia (Foto/Documento)">
                        {/* Si estamos editando y hay evidencia guardada, la mostramos */}
                        {editingId && currentEvidenciaUrl && (
                            <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded flex items-center gap-2">
                                {isImageUrl(currentEvidenciaUrl) ? (
                                    <a href={currentEvidenciaUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={currentEvidenciaUrl} alt="evidencia actual" className="w-14 h-14 object-cover rounded border" />
                                    </a>
                                ) : (
                                    <a href={currentEvidenciaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600">
                                        <PaperClipOutlined /> Ver archivo actual
                                    </a>
                                )}
                                <span className="text-xs text-gray-500 ml-1">Sube un nuevo archivo para reemplazarla.</span>
                            </div>
                        )}
                        <Upload
                            beforeUpload={(file) => {
                                const maxSizeMB = 5;
                                if (file.size / 1024 / 1024 > maxSizeMB) {
                                    message.error(`❌ El archivo es demasiado pesado. El tamaño máximo permitido es ${maxSizeMB} MB. Tu archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
                                    return Upload.LIST_IGNORE;
                                }
                                return false;
                            }}
                            maxCount={1}
                        >
                            <Button icon={<UploadOutlined />}>Seleccionar Archivo</Button>
                        </Upload>
                    </Form.Item>

                    <Space>
                        <Button onClick={handleCancelForm}>Cancelar</Button>
                        <Button type="primary" htmlType="submit">
                            {editingId ? 'Actualizar' : 'Guardar Apoyo'}
                        </Button>
                    </Space>
                </Form>
            )}
        </Drawer>
    );
};

export default ApoyosDrawer;
