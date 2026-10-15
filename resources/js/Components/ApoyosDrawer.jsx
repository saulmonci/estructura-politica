import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import {
    Drawer,
    Button,
    Form,
    Input,
    DatePicker,
    Select,
    InputNumber,
    message,
    Table,
    Popconfirm,
    Tag,
    Space,
    Card,
    Modal,
} from 'antd';
import {
    PlusOutlined,
    UploadOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PaperClipOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { AppUpload } from '@/Components/Common';

const { Option } = Select;

const ApoyosDrawer = forwardRef(
    (
        { visible: propVisible, onClose: propOnClose, promovido, entity: propEntity, apiBasePath: propApiBasePath },
        ref
    ) => {
        const [internalVisible, setInternalVisible] = useState(false);
        const [internalEntity, setInternalEntity] = useState(null);
        const [internalBasePath, setInternalBasePath] = useState(null);

        const isVisible = propVisible !== undefined ? propVisible : internalVisible;
        const resolvedEntity = internalEntity || propEntity || promovido;
        const resolvedBasePath =
            internalBasePath ||
            (internalEntity && propApiBasePath && !propApiBasePath.endsWith(`/${internalEntity.id}`)
                ? `${propApiBasePath}/${internalEntity.id}`
                : propApiBasePath) ||
            (resolvedEntity ? `/promovidos/${resolvedEntity.id}` : null);
        const resolvedTitle = resolvedEntity?.nombre_completo || resolvedEntity?.name || '';

        const handleClose = () => {
            setInternalVisible(false);
            if (propOnClose) propOnClose();
        };

        useImperativeHandle(ref, () => ({
            open(entity = null, customBasePath = null) {
                setInternalEntity(entity);
                if (customBasePath) {
                    setInternalBasePath(customBasePath);
                } else if (entity?.id && propApiBasePath) {
                    setInternalBasePath(`${propApiBasePath}/${entity.id}`);
                } else {
                    setInternalBasePath(null);
                }
                setInternalVisible(true);
            },
            close: handleClose,
        }));

        const [apoyos, setApoyos] = useState([]);
        const [loading, setLoading] = useState(false);
        const [isFormVisible, setIsFormVisible] = useState(false);
        const [form] = Form.useForm();
        const [editingId, setEditingId] = useState(null);
        const [isMobile, setIsMobile] = useState(false);
        const [previewImage, setPreviewImage] = useState(null);

        useEffect(() => {
            const handleResize = () => {
                setIsMobile(window.innerWidth < 768);
            };
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        const prevVisibleRef = useRef(false);

        useEffect(() => {
            if (isVisible && resolvedBasePath) {
                prevVisibleRef.current = true;
                fetchApoyos();
            } else if (prevVisibleRef.current) {
                setApoyos([]);
                setIsFormVisible(false);
                setEditingId(null);
                prevVisibleRef.current = false;
            }
        }, [isVisible, resolvedBasePath]);

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

                if (values.evidencia instanceof File || values.evidencia instanceof Blob) {
                    formData.append('evidencia_file', values.evidencia);
                }

                if (editingId) {
                    // Para update con FormData puede ser engañoso en Laravel, simulamos put con _method
                    formData.append('_method', 'PUT');
                    await axios.post(`/apoyos/${editingId}`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    message.success('Apoyo actualizado correctamente');
                } else {
                    await axios.post(`${resolvedBasePath}/apoyos`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
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
                evidencia: record.evidencia_url || record.evidencia || null,
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
                title: 'Fecha',
                dataIndex: 'fecha',
                key: 'fecha',
                width: 100,
            },
            {
                title: 'Tipo de Apoyo',
                dataIndex: 'tipo_apoyo',
                key: 'tipo_apoyo',
            },
            {
                title: 'Cantidad ($)',
                dataIndex: 'cantidad_monetaria',
                key: 'cantidad_monetaria',
                width: 110,
                render: (val) => (val ? `$${Number(val).toLocaleString()}` : '-'),
            },
            {
                title: 'Estado',
                dataIndex: 'estado',
                key: 'estado',
                width: 100,
                render: (estado) => {
                    let color = estado === 'Entregado' ? 'green' : estado === 'Pendiente' ? 'orange' : 'red';
                    return <Tag color={color}>{estado}</Tag>;
                },
            },
            {
                title: 'Descripción',
                dataIndex: 'descripcion',
                key: 'descripcion',
                render: (v) => v || <span className="text-gray-400">-</span>,
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
                            <div
                                onClick={() => setPreviewImage(url)}
                                className="cursor-pointer transition-opacity hover:opacity-80"
                                title="Ver imagen"
                            >
                                <img
                                    src={url}
                                    alt="evidencia"
                                    className="h-10 w-10 rounded border border-gray-200 object-cover"
                                />
                            </div>
                        );
                    }
                    return (
                        <a href={url} target="_blank" rel="noopener noreferrer" title="Ver archivo">
                            <Button size="small" icon={<PaperClipOutlined />} type="link">
                                Ver
                            </Button>
                        </a>
                    );
                },
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
                onClose={handleClose}
                open={isVisible}
                styles={{ body: { paddingBottom: 80 } }}
            >
                <div style={{ display: !isFormVisible ? 'block' : 'none' }}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingId(null);
                            form.resetFields();
                            setIsFormVisible(true);
                        }}
                        style={{ marginBottom: 16 }}
                        block={isMobile}
                    >
                        Registrar Nuevo Apoyo
                    </Button>
                    {isMobile ? (
                        <div className="flex flex-col gap-3">
                            {loading ? (
                                <div className="py-6 text-center text-gray-500">Cargando apoyos...</div>
                            ) : apoyos.length === 0 ? (
                                <div className="rounded-lg border bg-gray-50 py-6 text-center text-gray-400">
                                    No hay apoyos registrados.
                                </div>
                            ) : (
                                apoyos.map((record) => {
                                    let tagColor =
                                        record.estado === 'Entregado'
                                            ? 'green'
                                            : record.estado === 'Pendiente'
                                              ? 'orange'
                                              : 'red';
                                    return (
                                        <Card
                                            key={record.id}
                                            size="small"
                                            className="rounded-lg border border-gray-100 shadow-sm"
                                        >
                                            <div className="mb-2 flex items-start justify-between">
                                                <div>
                                                    <span className="text-sm font-bold text-gray-800">
                                                        {record.tipo_apoyo}
                                                    </span>
                                                    <div className="mt-0.5 text-xs text-gray-400">
                                                        Fecha: {record.fecha}
                                                    </div>
                                                </div>
                                                <Tag color={tagColor} className="m-0">
                                                    {record.estado}
                                                </Tag>
                                            </div>
                                            <div className="mb-3 rounded bg-gray-50 p-2 text-xs text-gray-600">
                                                <span className="mb-0.5 block font-semibold text-gray-500">
                                                    Descripción:
                                                </span>
                                                {record.descripcion || 'Sin descripción'}
                                            </div>
                                            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {record.cantidad_monetaria
                                                        ? `$${Number(record.cantidad_monetaria).toLocaleString()}`
                                                        : '$0'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {record.evidencia_url &&
                                                        (isImageUrl(record.evidencia_url) ? (
                                                            <div
                                                                onClick={() => setPreviewImage(record.evidencia_url)}
                                                                className="cursor-pointer transition-opacity hover:opacity-80"
                                                            >
                                                                <img
                                                                    src={record.evidencia_url}
                                                                    alt="evidencia"
                                                                    className="h-8 w-8 rounded border object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <a
                                                                href={record.evidencia_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    icon={<PaperClipOutlined />}
                                                                    type="link"
                                                                >
                                                                    Doc
                                                                </Button>
                                                            </a>
                                                        ))}
                                                    <Button
                                                        icon={<EditOutlined />}
                                                        onClick={() => handleEdit(record)}
                                                        size="small"
                                                    />
                                                    <Popconfirm
                                                        title="¿Eliminar apoyo?"
                                                        onConfirm={() => handleDelete(record.id)}
                                                    >
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
                </div>
                <div style={{ display: isFormVisible ? 'block' : 'none' }}>
                    <Form layout="vertical" form={form} onFinish={handleSubmit}>
                        <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: 'Seleccione fecha' }]}>
                            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                        </Form.Item>

                        <Form.Item
                            name="tipo_apoyo"
                            label="Tipo de Apoyo"
                            rules={[{ required: true, message: 'Ingrese tipo de apoyo' }]}
                        >
                            <Input placeholder="Ej. Despensa, Gestión Médica, etc." />
                        </Form.Item>

                        <Form.Item name="cantidad_monetaria" label="Cantidad Monetaria (Opcional)">
                            <InputNumber style={{ width: '100%' }} prefix="$" min={0} />
                        </Form.Item>

                        <Form.Item
                            name="estado"
                            label="Estado"
                            initialValue="Entregado"
                            rules={[{ required: true, message: 'Seleccione estado' }]}
                        >
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
                            <AppUpload
                                variant="card"
                                aspectRatio="16/9"
                                title="EVIDENCIA O COMPROBANTE"
                                accept="image/*,application/pdf"
                                maxSizeMB={10}
                                showCamera={true}
                                allowUrlInput={true}
                            />
                        </Form.Item>

                        <Space>
                            <Button onClick={handleCancelForm}>Cancelar</Button>
                            <Button type="primary" htmlType="submit">
                                {editingId ? 'Actualizar' : 'Guardar Apoyo'}
                            </Button>
                        </Space>
                    </Form>
                </div>

                <Modal
                    open={!!previewImage}
                    title="Evidencia de Apoyo"
                    footer={null}
                    onCancel={() => setPreviewImage(null)}
                    width={650}
                    centered
                >
                    <img
                        alt="Evidencia"
                        style={{ width: '100%', borderRadius: '8px', maxHeight: '75vh', objectFit: 'contain' }}
                        src={previewImage}
                    />
                </Modal>
            </Drawer>
        );
    }
);

ApoyosDrawer.displayName = 'ApoyosDrawer';

export default ApoyosDrawer;
