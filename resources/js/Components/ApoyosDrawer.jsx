import React, { useState, useEffect } from 'react';
import { Drawer, Button, Form, Input, DatePicker, Select, InputNumber, Upload, message, Table, Popconfirm, Tag, Space } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
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
        form.setFieldsValue({
            fecha: dayjs(record.fecha),
            tipo_apoyo: record.tipo_apoyo,
            descripcion: record.descripcion,
            estado: record.estado,
            cantidad_monetaria: record.cantidad_monetaria,
        });
        setIsFormVisible(true);
    };

    const columns = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
        { title: 'Tipo de Apoyo', dataIndex: 'tipo_apoyo', key: 'tipo_apoyo' },
        { title: 'Cantidad ($)', dataIndex: 'cantidad_monetaria', key: 'cantidad_monetaria' },
        { 
            title: 'Estado', 
            dataIndex: 'estado', 
            key: 'estado',
            render: (estado) => {
                let color = estado === 'Entregado' ? 'green' : (estado === 'Pendiente' ? 'orange' : 'red');
                return <Tag color={color}>{estado}</Tag>;
            }
        },
        { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion' },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_, record) => (
                <Space size="middle">
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
            width={720}
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
                    >
                        Registrar Nuevo Apoyo
                    </Button>
                    <Table 
                        dataSource={apoyos} 
                        columns={columns} 
                        rowKey="id" 
                        loading={loading} 
                        pagination={{ pageSize: 5 }}
                    />
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
                        <Upload beforeUpload={() => false} maxCount={1}>
                            <Button icon={<UploadOutlined />}>Seleccionar Archivo</Button>
                        </Upload>
                    </Form.Item>

                    <Space>
                        <Button onClick={() => setIsFormVisible(false)}>Cancelar</Button>
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
