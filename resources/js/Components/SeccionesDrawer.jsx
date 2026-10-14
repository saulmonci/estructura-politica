import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Drawer, Button, Form, Input, InputNumber, message, Table, Space, Card, Divider, Tag } from 'antd';
import { PlusOutlined, EditOutlined, FolderOpenOutlined } from '@ant-design/icons';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

const SeccionesDrawer = forwardRef(
    (
        {
            visible: propVisible,
            onClose: propOnClose,
            demarcacion: propDemarcacion,
            presidenteId: propPresidenteId = null,
        },
        ref
    ) => {
        const { auth } = usePage().props;
        const userRole = auth?.user?.role;
        const canEditCasilla = ['superuser', 'admin'].includes(userRole);

        const [internalVisible, setInternalVisible] = useState(false);
        const [internalDemarcacion, setInternalDemarcacion] = useState(null);
        const [internalPresidenteId, setInternalPresidenteId] = useState(null);

        const isVisible = propVisible !== undefined ? propVisible : internalVisible;
        const activeDemarcacion = internalDemarcacion || propDemarcacion;
        const activePresidenteId =
            internalPresidenteId !== null && internalPresidenteId !== undefined
                ? internalPresidenteId
                : propPresidenteId;

        const handleClose = () => {
            setInternalVisible(false);
            if (propOnClose) propOnClose();
        };

        useImperativeHandle(ref, () => ({
            open(demarcacion = null, presId = null) {
                setInternalDemarcacion(demarcacion);
                setInternalPresidenteId(presId);
                setInternalVisible(true);
            },
            close: handleClose,
        }));

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

        const prevVisibleRef = useRef(false);

        useEffect(() => {
            if (isVisible && activeDemarcacion) {
                prevVisibleRef.current = true;
                fetchSecciones();
            } else if (prevVisibleRef.current) {
                setSecciones([]);
                setIsFormVisible(false);
                setEditingId(null);
                prevVisibleRef.current = false;
            }
        }, [isVisible, activeDemarcacion, activePresidenteId]);

        const fetchSecciones = async () => {
            if (!activeDemarcacion?.id) return;
            setLoading(true);
            try {
                const response = await axios.get(`/demarcaciones/${activeDemarcacion.id}/secciones`, {
                    params: activePresidenteId ? { presidente_id: activePresidenteId } : {},
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
                    ...(activePresidenteId ? { presidente_id: activePresidenteId } : {}),
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
                    const response = await axios.post(`/demarcaciones/${activeDemarcacion.id}/secciones`, payload);
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
                ubicacion_casilla: record.ubicacion_casilla || '',
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
                width: 110,
                sorter: (a, b) => a.numero.localeCompare(b.numero),
                render: (numero) => <span className="font-bold text-gray-800">Sección {numero}</span>,
            },
            {
                title: 'UBICACIÓN CASILLA',
                dataIndex: 'ubicacion_casilla',
                key: 'ubicacion_casilla',
                render: (ubicacion) =>
                    ubicacion ? (
                        <span className="text-xs font-medium text-slate-700">{ubicacion}</span>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Sin asignar</span>
                    ),
            },
            {
                title: 'META',
                dataIndex: 'meta',
                key: 'meta',
                width: 100,
                sorter: (a, b) => a.meta - b.meta,
                render: (meta, record) => (
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-blue-600">{meta}</span>
                        {record.is_custom_meta ? (
                            <Tag color="blue" className="m-0 px-1 py-0 text-[10px] leading-tight">
                                Pers.
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
                width: 70,
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
                        <span>Secciones de la {activeDemarcacion?.nombre || 'Demarcación'}</span>
                    </div>
                }
                placement="right"
                onClose={handleClose}
                open={isVisible}
                width={isMobile ? '100%' : 540}
                styles={{ body: { padding: '24px' } }}
            >
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        {secciones.length} secciones registradas {activePresidenteId ? '(Metas para el candidato)' : ''}
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
                                    label={activePresidenteId ? 'Meta para Candidato' : 'Meta Base'}
                                    rules={[{ required: true, message: 'Ingresa la meta.' }]}
                                >
                                    <InputNumber min={0} style={{ width: '100%' }} placeholder="Ej. 100" />
                                </Form.Item>
                            </div>

                            {canEditCasilla ? (
                                <Form.Item
                                    name="ubicacion_casilla"
                                    label={
                                        <div className="flex items-center gap-1.5">
                                            <span>Ubicación / Sede de la Casilla</span>
                                            <Tag color="purple" className="m-0 text-[10px] leading-tight">
                                                Admin
                                            </Tag>
                                        </div>
                                    }
                                    rules={[{ max: 500, message: 'Máximo 500 caracteres.' }]}
                                    extra={
                                        <span className="text-[11px] text-slate-400">
                                            Dato general del INE (escuela o domicilio oficial).
                                        </span>
                                    }
                                >
                                    <Input placeholder="Ej. Primaria Lic. Benito Juárez / Kínder Rosaura Zapata" />
                                </Form.Item>
                            ) : (
                                form.getFieldValue('ubicacion_casilla') && (
                                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                                        <div className="font-semibold text-slate-800">📍 Sede de la Casilla (INE):</div>
                                        <div className="mt-0.5 text-slate-700">
                                            {form.getFieldValue('ubicacion_casilla')}
                                        </div>
                                    </div>
                                )
                            )}

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
                                {record.ubicacion_casilla && (
                                    <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                        📍 <span className="font-semibold">Casilla:</span> {record.ubicacion_casilla}
                                    </div>
                                )}
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
    }
);

SeccionesDrawer.displayName = 'SeccionesDrawer';

export default SeccionesDrawer;
