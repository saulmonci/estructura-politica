import React, { useState, useEffect } from 'react';
import { Drawer, Button, Form, Input, InputNumber, message, Table, Space, Card, Divider, Tag } from 'antd';
import { PlusOutlined, EditOutlined, FolderOpenOutlined } from '@ant-design/icons';
import axios from 'axios';

const SeccionesDrawer = ({ visible, onClose, demarcacion, presidenteId = null }) => {
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
    }, [visible, demarcacion, presidenteId]);

    const fetchSecciones = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/demarcaciones/${demarcacion.id}/secciones`, {
                params: presidenteId ? { presidente_id: presidenteId } : {},
            });
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
            const payload = {
                ...values,
                ...(presidenteId ? { presidente_id: presidenteId } : {}),
            };

            if (editingId) {
                // Update
                const response = await axios.put(`/secciones/${editingId}`, payload);
                if (response.data.success) {
                    message.success('Sección electoral actualizada exitosamente.');
                    setEditingId(null);
                    setIsFormVisible(false);
                    form.resetFields();
                    fetchSecciones();
                }
            } else {
                // Create
                const response = await axios.post(`/demarcaciones/${demarcacion.id}/secciones`, payload);
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
            render: (numero) => <span className="font-bold text-gray-800">Sección {numero}</span>,
        },
        {
            title: 'META VOTANTES',
            dataIndex: 'meta',
            key: 'meta',
            sorter: (a, b) => a.meta - b.meta,
            render: (meta, record) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">{meta}</span>
                    {record.is_custom_meta ? (
                        <Tag color="blue" className="m-0 px-1 py-0 text-[10px] leading-tight">
                            Personalizada
                        </Tag>
                    ) : (
                        <Tag color="default" className="m-0 px-1 py-0 text-[10px] leading-tight text-gray-400">
                            Base
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: 'ACCIONES',
            key: 'acciones',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <Button
                    type="text"
                    icon={<EditOutlined className="text-blue-600" />}
                    onClick={() => handleEdit(record)}
                    title="Editar Sección"
                />
            ),
        },
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
            <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                    {secciones.length} secciones registradas {presidenteId ? '(Metas para el candidato)' : ''}
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
                    title={editingId ? 'Editar Sección Electoral' : 'Nueva Sección Electoral'}
                    size="small"
                    className="mb-6 border border-blue-100 bg-blue-50/20 shadow-sm"
                    styles={{ header: { background: '#f8fafc', fontWeight: 'bold' } }}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ meta: 0 }}>
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
                                label={presidenteId ? 'Meta para Candidato' : 'Meta Base'}
                                rules={[{ required: true, message: 'Ingresa la meta.' }]}
                            >
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="Ej. 100" />
                            </Form.Item>
                        </div>

                        <div className="mt-2 flex justify-end gap-2">
                            <Button onClick={handleCancelForm}>Cancelar</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {editingId ? 'Guardar Cambios' : 'Agregar'}
                            </Button>
                        </div>
                    </Form>
                </Card>
            )}

            <Divider className="my-4" />

            {loading && secciones.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Cargando secciones...</div>
            ) : isMobile ? (
                <div className="space-y-4">
                    {secciones.map((record) => (
                        <Card key={record.id} size="small" className="rounded-lg border border-gray-100 shadow-sm">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="font-bold text-gray-800">Sección {record.numero}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-blue-600">Meta: {record.meta}</span>
                                    {record.is_custom_meta ? (
                                        <Tag color="blue" className="m-0 px-1 py-0 text-[10px] leading-tight">
                                            Personalizada
                                        </Tag>
                                    ) : (
                                        <Tag
                                            color="default"
                                            className="m-0 px-1 py-0 text-[10px] leading-tight text-gray-400"
                                        >
                                            Base
                                        </Tag>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
                                <Button
                                    type="text"
                                    icon={<EditOutlined className="text-blue-600" />}
                                    onClick={() => handleEdit(record)}
                                >
                                    Editar
                                </Button>
                            </div>
                        </Card>
                    ))}
                    {secciones.length === 0 && (
                        <div className="py-8 text-center text-gray-400">
                            No hay secciones registradas para esta demarcación.
                        </div>
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
