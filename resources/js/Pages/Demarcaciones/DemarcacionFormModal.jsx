import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ModalForm, ProFormText, ProFormDigit } from '@ant-design/pro-components';
import { Row, Col, message, Button, Divider, Form, Alert } from 'antd';
import { EnvironmentOutlined, SaveOutlined, CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { router } from '@inertiajs/react';

const DemarcacionFormModal = forwardRef(({ onSuccess, presidenteId: propPresidenteId = null }, ref) => {
    const [open, setOpen] = useState(false);
    const [editId, setEditingId] = useState(null);
    const [fetchUrl, setFetchUrl] = useState(null);
    const [activePresidenteId, setActivePresidenteId] = useState(propPresidenteId);

    useEffect(() => {
        setActivePresidenteId(propPresidenteId);
    }, [propPresidenteId]);

    useImperativeHandle(ref, () => ({
        open(id = null, url = null, targetPresId = null) {
            setEditingId(id);
            setFetchUrl(url);
            if (targetPresId !== undefined && targetPresId !== null) {
                setActivePresidenteId(targetPresId);
            } else {
                setActivePresidenteId(propPresidenteId);
            }
            setOpen(true);
        },
        close() {
            setOpen(false);
        },
    }));

    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            form.resetFields();
            form.setFieldsValue({
                id: undefined,
                nombre: '',
                meta: undefined,
            });

            if (editId) {
                const url = fetchUrl || `/demarcaciones/${editId}`;
                axios
                    .get(url, {
                        params: activePresidenteId ? { presidente_id: activePresidenteId } : {},
                    })
                    .then((response) => {
                        form.setFieldsValue({
                            id: response.data.id,
                            nombre: response.data.nombre,
                            meta: response.data.meta,
                        });
                    })
                    .catch(() => {
                        message.error('No se pudo cargar la información de la demarcación');
                    });
            }
        }
    }, [open, editId, fetchUrl, activePresidenteId]);

    return (
        <ModalForm
            form={form}
            title={null}
            open={open}
            onOpenChange={setOpen}
            width={700}
            modalProps={{
                destroyOnClose: true,
                maskClosable: true,
                keyboard: true,
                bodyStyle: { padding: 0 },
                closeIcon: null,
            }}
            submitter={{
                render: (props) => {
                    return (
                        <div className="flex justify-end gap-3 rounded-b-lg border-t border-gray-200 bg-gray-50 p-4">
                            <Button
                                key="cancel"
                                onClick={() => setOpen(false)}
                                icon={<CloseOutlined />}
                                className="border-gray-300 text-gray-700"
                            >
                                Cancelar
                            </Button>
                            <Button
                                key="submit"
                                type="primary"
                                onClick={() => props.form?.submit?.()}
                                icon={<SaveOutlined />}
                                className="bg-[#0f172a]"
                            >
                                Guardar demarcación
                            </Button>
                        </div>
                    );
                },
            }}
            onFinish={async (values) => {
                const basePath = '/demarcaciones';
                const endpoint = fetchUrl || (editId ? `${basePath}/${editId}` : basePath);
                const payload = {
                    ...values,
                    ...(activePresidenteId ? { presidente_id: activePresidenteId } : {}),
                };

                if (editId) {
                    payload._method = 'put';
                    router.post(endpoint, payload, {
                        onSuccess: () => {
                            message.success('Demarcación actualizada exitosamente');
                            if (onSuccess) onSuccess(payload);
                            setOpen(false);
                        },
                        onError: (errors) => {
                            if (errors) {
                                const fieldErrors = Object.keys(errors).map((key) => ({
                                    name: key,
                                    errors: Array.isArray(errors[key]) ? errors[key] : [errors[key]],
                                }));
                                form.setFields(fieldErrors);
                            }
                            message.error('Por favor revisa los campos en rojo');
                        },
                    });
                } else {
                    router.post(endpoint, payload, {
                        onSuccess: () => {
                            message.success('Demarcación creada exitosamente');
                            if (onSuccess) onSuccess(payload);
                            setOpen(false);
                        },
                        onError: (errors) => {
                            if (errors) {
                                const fieldErrors = Object.keys(errors).map((key) => ({
                                    name: key,
                                    errors: Array.isArray(errors[key]) ? errors[key] : [errors[key]],
                                }));
                                form.setFields(fieldErrors);
                            }
                            message.error('Por favor revisa los campos en rojo');
                        },
                    });
                }
                return false;
            }}
        >
            {/* Custom Header */}
            <div className="flex items-center justify-between rounded-t-lg bg-[#0f172a] p-6 text-white">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-white/20 p-3">
                        <EnvironmentOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="m-0 text-xl font-bold tracking-wide uppercase">
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} Demarcación Territorial
                        </h2>
                        <p className="m-0 text-sm text-gray-300">
                            {activePresidenteId
                                ? 'Configurando meta para el candidato seleccionado'
                                : 'Estructura Electoral Municipal'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <div className="rounded bg-[#0f172a] p-1 text-white">
                        <EnvironmentOutlined />
                    </div>
                    <h3 className="m-0 text-sm font-bold tracking-wide text-[#0f172a]">DATOS DE LA DEMARCACIÓN</h3>
                </div>
                <Divider className="my-2 border-gray-200" />

                <div className="mt-4">
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <ProFormDigit
                                name="id"
                                label="Número de Demarcación"
                                placeholder="Ej: 10"
                                disabled={!!editId}
                                rules={[
                                    { required: true, message: 'Requerido' },
                                    { type: 'number', min: 1, message: 'Debe ser mayor o igual a 1' },
                                ]}
                                fieldProps={{
                                    precision: 0,
                                }}
                            />
                        </Col>
                        <Col xs={24} md={16}>
                            <ProFormText
                                name="nombre"
                                label="Nombre de la Demarcación"
                                placeholder="Ej: Demarcación 10 - San Vicente"
                                rules={[{ required: true, message: 'Requerido' }]}
                            />
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <ProFormDigit
                                name="meta"
                                label={
                                    activePresidenteId ? 'Meta de Votantes para el Candidato' : 'Meta de Votantes Base'
                                }
                                placeholder="Número total de simpatizantes como objetivo"
                                rules={[
                                    { required: true, message: 'Requerido' },
                                    { type: 'number', min: 0, message: 'Debe ser mayor o igual a 0' },
                                ]}
                                fieldProps={{
                                    precision: 0,
                                }}
                            />
                        </Col>
                    </Row>
                </div>
            </div>
        </ModalForm>
    );
});

export default DemarcacionFormModal;
