import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Button, Input, DatePicker, Select, InputNumber, message, Table, Popconfirm, Tag, Space, Card, Modal, Form } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, PaperClipOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { ProFormText, ProFormDatePicker, ProFormSelect, ProFormDigit, ProFormTextArea } from '@ant-design/pro-components';
import axios from 'axios';
import dayjs from 'dayjs';
import AppForm from './AppForm';
import AppUpload from './AppUpload';

const ApoyosDrawer = ({ visible, onClose, promovido, entity, apiBasePath }) => {
    const resolvedEntity = entity || promovido;
    const resolvedBasePath = apiBasePath || (promovido ? `/promovidos/${promovido.id}` : null);
    const resolvedTitle = resolvedEntity?.nombre_completo || resolvedEntity?.name || '';
    const [apoyos, setApoyos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const evidenciaRef = useRef(null);

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
      
        form.setFieldsValue({
            fecha: record.fecha, // ProFormDatePicker puede manejar strings
            tipo_apoyo: record.tipo_apoyo,
            descripcion: record.descripcion,
            estado: record.estado,
            cantidad_monetaria: record.cantidad_monetaria,
        });
        if (record.evidencia_url) {
            setTimeout(() => {
                evidenciaRef.current?.setExistingUrl(record.evidencia_url);
            }, 100);
        }
        setIsFormVisible(true);
    };

    const handleCancelForm = () => {
        setIsFormVisible(false);
        setEditingId(null);
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
                        <div onClick={() => setPreviewImage(url)} className="cursor-pointer hover:opacity-80 transition-opacity" title="Ver imagen">
                            <img src={url} alt="evidencia" className="w-10 h-10 object-cover rounded border border-gray-200" />
                        </div>
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
                                                            <div onClick={() => setPreviewImage(record.evidencia_url)} className="cursor-pointer hover:opacity-80 transition-opacity">
                                                                <img src={record.evidencia_url} alt="evidencia" className="w-8 h-8 object-cover rounded border" />
                                                            </div>
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
                <AppForm 
                    form={form} 
                    apiMode={true}
                    endpoint={editingId ? `/apoyos/${editingId}` : `${resolvedBasePath}/apoyos`}
                    method={editingId ? 'PUT' : 'POST'}
                    onSuccess={() => {
                        setIsFormVisible(false);
                        form.resetFields();
                        setEditingId(null);
                        evidenciaRef.current?.reset();
                        fetchApoyos();
                    }}
                    onCancel={handleCancelForm}
                    successMessage={editingId ? 'Apoyo actualizado correctamente' : 'Apoyo registrado correctamente'}
                    submitText={editingId ? 'Actualizar' : 'Guardar Apoyo'}
                    beforeSubmit={(values) => {
                        if (values.fecha && dayjs.isDayjs(values.fecha)) {
                            values.fecha = values.fecha.format('YYYY-MM-DD');
                        }
                        
                        const file = evidenciaRef.current?.getFile();
                        if (file) {
                            values.evidencia_file = file;
                        }
                        
                        return values;
                    }}
                >
                    <ProFormDatePicker 
                        name="fecha" 
                        label="Fecha" 
                        rules={[{ required: true, message: 'Seleccione fecha' }]}
                        fieldProps={{ style: { width: '100%' }, format: "YYYY-MM-DD" }}
                    />
                    
                    <ProFormText 
                        name="tipo_apoyo" 
                        label="Tipo de Apoyo" 
                        rules={[{ required: true, message: 'Ingrese tipo de apoyo' }]}
                        placeholder="Ej. Despensa, Gestión Médica, etc." 
                    />
                    
                    <ProFormDigit 
                        name="cantidad_monetaria" 
                        label="Cantidad Monetaria (Opcional)"
                        fieldProps={{ prefix: "$", min: 0, style: { width: '100%' } }} 
                    />

                    <ProFormSelect 
                        name="estado" 
                        label="Estado" 
                        initialValue="Entregado" 
                        rules={[{ required: true, message: 'Seleccione estado' }]}
                        options={[
                            { label: 'Entregado', value: 'Entregado' },
                            { label: 'Pendiente', value: 'Pendiente' },
                            { label: 'Cancelado', value: 'Cancelado' }
                        ]}
                    />

                    <ProFormTextArea 
                        name="descripcion" 
                        label="Descripción / Notas"
                        fieldProps={{ rows: 3 }}
                    />

                    <AppUpload
                        ref={evidenciaRef}
                        title="Evidencia (Foto/Documento)"
                        icon={<CloudUploadOutlined />}
                        className="bg-slate-50 border-slate-200 mt-4"
                    />
                </AppForm>
            )}
            
            <Modal
                open={!!previewImage}
                title="Evidencia de Apoyo"
                footer={null}
                onCancel={() => setPreviewImage(null)}
                width={650}
                centered
            >
                <img alt="Evidencia" style={{ width: '100%', borderRadius: '8px', maxHeight: '75vh', objectFit: 'contain' }} src={previewImage} />
            </Modal>
        </Drawer>
    );
};

export default ApoyosDrawer;
