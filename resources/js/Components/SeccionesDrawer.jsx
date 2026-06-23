import React, { useState, useEffect } from 'react';
import { Drawer, Button, Form, Input, InputNumber, message, Table, Popconfirm, Space, Card, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FolderOpenOutlined } from '@ant-design/icons';
import axios from 'axios';

const SeccionesDrawer = ({ visible, onClose, demarcacion }) => {
    const [secciones, setSecciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState(null);
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
        if (visible && demarcacion) {
            fetchSecciones();
        } else {
            setSecciones([]);
            setIsFormVisible(false);
            form.resetFields();
            setEditingId(null);
        }
    }, [visible, demarcacion]);

    const fetchSecciones = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/demarcaciones/${demarcacion.id}/secciones`);
            setSecciones(response.data);
        } catch (error) {
            message.error('Error al cargar las secciones electorales');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            if (editingId) {
                // Update
                const response = await axios.put(`/secciones/${editingId}`, values);
                if (response.data.success) {
                    message.success('Sección electoral actualizada exitosamente.');
                    setEditingId(null);
                    setIsFormVisible(false);
                    form.resetFields();
                    fetchSecciones();
                }
            } else {
                // Create
                const response = await axios.post(`/demarcaciones/${demarcacion.id}/secciones`, values);
                if (response.data.success) {
                    message.success('Sección electoral creada exitosamente.');
                    setIsFormVisible(false);
                    form.resetFields();
                    fetchSecciones();
                }
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Error al guardar la sección.';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        form.setFieldsValue({
            numero: record.numero,
            meta: record.meta,
        });
        setIsFormVisible(true);
    };

    const handleDelete = async (id) => {
        setLoading(true);
        try {
            const response = await axios.delete(`/secciones/${id}`);
            if (response.data.success) {
                message.success('Sección electoral eliminada.');
                fetchSecciones();
            }
        } catch (error) {
            message.error('Error al eliminar la sección.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelForm = () => {
        setIsFormVisible(false);
        setEditingId(null);
        form.resetFields();
    };

    const columns = [
        {
            title: 'SECCIÓN',
            dataIndex: 'numero',
            key: 'numero',
            sorter: (a, b) => a.numero.localeCompare(b.numero),
            render: (numero) => <span className="font-bold text-gray-800">Sección {numero}</span>
        },
        {
            title: 'META VOTANTES',
            dataIndex: 'meta',
            key: 'meta',
            sorter: (a, b) => a.meta - b.meta,
            render: (meta) => <span className="font-semibold text-blue-600">{meta}</span>
        },
        {
            title: 'ACCIONES',
            key: 'acciones',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Space size="middle">
                    <Button 
                        type="text" 
                        icon={<EditOutlined className="text-blue-600" />} 
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="¿Estás seguro de eliminar esta sección?"
                        description="Esta acción eliminará el registro de la sección."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Sí"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <FolderOpenOutlined className="text-blue-600" />
                    <span>Secciones de la {demarcacion?.nombre || 'Demarcación'}</span>
                </div>
            }
            placement="right"
            onClose={onClose}
            open={visible}
            width={isMobile ? '100%' : 540}
            styles={{ body: { padding: '24px' } }}
        >
            <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 text-sm">
                    {secciones.length} secciones registradas
                </span>
                {!isFormVisible && (
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => setIsFormVisible(true)}
                        className="bg-[#0f172a] hover:bg-slate-800"
                    >
                        Agregar Sección
                    </Button>
                )}
            </div>

            {isFormVisible && (
                <Card 
                    title={editingId ? "Editar Sección Electoral" : "Nueva Sección Electoral"} 
                    size="small" 
                    className="mb-6 border border-blue-100 bg-blue-50/20 shadow-sm"
                    styles={{ header: { background: '#f8fafc', fontWeight: 'bold' } }}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{ meta: 0 }}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                name="numero"
                                label="Número de Sección"
                                rules={[{ required: true, message: 'Ingresa el número de sección.' }]}
                            >
                                <Input placeholder="Ej. 0120" />
                            </Form.Item>

                            <Form.Item
                                name="meta"
                                label="Meta de Votantes"
                                rules={[{ required: true, message: 'Ingresa la meta.' }]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="Ej. 100" />
                            </Form.Item>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <Button onClick={handleCancelForm}>
                                Cancelar
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading} className="bg-blue-600 hover:bg-blue-700">
                                {editingId ? 'Guardar Cambios' : 'Agregar'}
                            </Button>
                        </div>
                    </Form>
                </Card>
            )}

            <Divider className="my-4" />

            {loading && secciones.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Cargando secciones...</div>
            ) : isMobile ? (
                <div className="space-y-4">
                    {secciones.map(record => (
                        <Card key={record.id} size="small" className="shadow-sm border border-gray-100 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-800">Sección {record.numero}</span>
                                <span className="font-semibold text-blue-600">Meta: {record.meta}</span>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <Button 
                                    type="text" 
                                    icon={<EditOutlined className="text-blue-600" />} 
                                    onClick={() => handleEdit(record)}
                                >
                                    Editar
                                </Button>
                                <Popconfirm
                                    title="¿Estás seguro de eliminar?"
                                    onConfirm={() => handleDelete(record.id)}
                                    okText="Sí"
                                    cancelText="No"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button 
                                        type="text" 
                                        danger 
                                        icon={<DeleteOutlined />}
                                    >
                                        Eliminar
                                    </Button>
                                </Popconfirm>
                            </div>
                        </Card>
                    ))}
                    {secciones.length === 0 && (
                        <div className="text-center py-8 text-gray-400">No hay secciones registradas para esta demarcación.</div>
                    )}
                </div>
            ) : (
                <Table
                    dataSource={secciones}
                    columns={columns}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10 }}
                    loading={loading}
                    locale={{ emptyText: 'No hay secciones registradas para esta demarcación.' }}
                />
            )}
        </Drawer>
    );
};

export default SeccionesDrawer;
