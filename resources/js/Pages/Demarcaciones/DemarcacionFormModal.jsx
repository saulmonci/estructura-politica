import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Row, Col, Input, InputNumber, Button, Divider, message } from 'antd';
import { EnvironmentOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { AppModal, AppForm } from '@/Components/Common';

const DemarcacionFormModal = forwardRef(({ onSuccess, presidenteId: propPresidenteId = null }, ref) => {
    const modalRef = useRef();
    const formRef = useRef();

    const [editId, setEditId] = useState(null);
    const [fetchUrl, setFetchUrl] = useState(null);
    const [activePresidenteId, setActivePresidenteId] = useState(propPresidenteId);

    useImperativeHandle(ref, () => ({
        open(id = null, url = null, targetPresId = null) {
            setEditId(id);
            setFetchUrl(url);
            const targetPres = targetPresId !== undefined && targetPresId !== null ? targetPresId : propPresidenteId;
            setActivePresidenteId(targetPres);

            modalRef.current?.open(null);

            // Cargar datos si es edición
            if (id) {
                const endpoint = url || `/demarcaciones/${id}`;
                axios
                    .get(endpoint, {
                        params: targetPres ? { presidente_id: targetPres } : {},
                    })
                    .then((res) => {
                        formRef.current?.setValues({
                            id: res.data.id,
                            nombre: res.data.nombre,
                            meta: res.data.meta,
                        });
                    })
                    .catch(() => {
                        message.error('No se pudo cargar la información de la demarcación');
                    });
            } else {
                formRef.current?.reset();
            }
        },
        close() {
            modalRef.current?.close();
        },
    }));

    return (
        <AppModal
            ref={modalRef}
            title={editId ? 'EDICIÓN DE Demarcación Territorial' : 'REGISTRO DE Demarcación Territorial'}
            subtitle={
                activePresidenteId
                    ? 'Configurando meta para el candidato seleccionado'
                    : 'Estructura Electoral Municipal'
            }
            headerBanner
            headerIcon={<EnvironmentOutlined />}
            width={700}
            destroyOnHidden
        >
            {({ close }) => (
                <AppForm
                    ref={formRef}
                    initialValues={{ id: undefined, nombre: '', meta: undefined }}
                    onSubmit={async (values, { setErrors, setLoading }) => {
                        const basePath = '/demarcaciones';
                        const endpoint = fetchUrl || (editId ? `${basePath}/${editId}` : basePath);
                        const payload = {
                            ...values,
                            ...(activePresidenteId ? { presidente_id: activePresidenteId } : {}),
                        };

                        if (editId) {
                            payload._method = 'put';
                        }

                        return new Promise((resolve) => {
                            router.post(endpoint, payload, {
                                onSuccess: () => {
                                    message.success(
                                        editId
                                            ? 'Demarcación actualizada exitosamente'
                                            : 'Demarcación creada exitosamente'
                                    );
                                    if (onSuccess) onSuccess(payload);
                                    close();
                                    resolve();
                                },
                                onError: (errors) => {
                                    setErrors(errors);
                                    resolve();
                                },
                                onFinish: () => {
                                    setLoading(false);
                                },
                            });
                        });
                    }}
                >
                    {({ loading }) => (
                        <div className="p-2">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded bg-[#0f172a] p-1 text-white">
                                    <EnvironmentOutlined />
                                </div>
                                <h3 className="m-0 text-sm font-bold tracking-wide text-[#0f172a]">
                                    DATOS DE LA DEMARCACIÓN
                                </h3>
                            </div>
                            <Divider className="my-2 border-gray-200" />

                            <div className="mt-4">
                                <Row gutter={16}>
                                    <Col xs={24} md={8}>
                                        <AppForm.Item
                                            name="id"
                                            label="Número de Demarcación"
                                            rules={[
                                                { required: true, message: 'Requerido' },
                                                { type: 'number', min: 1, message: 'Debe ser mayor o igual a 1' },
                                            ]}
                                        >
                                            <InputNumber
                                                placeholder="Ej: 10"
                                                disabled={Boolean(editId)}
                                                precision={0}
                                                className="w-full"
                                            />
                                        </AppForm.Item>
                                    </Col>
                                    <Col xs={24} md={16}>
                                        <AppForm.Item
                                            name="nombre"
                                            label="Nombre de la Demarcación"
                                            rules={[{ required: true, message: 'Requerido' }]}
                                        >
                                            <Input placeholder="Ej: Demarcación 10 - San Vicente" />
                                        </AppForm.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={24}>
                                        <AppForm.Item
                                            name="meta"
                                            label={
                                                activePresidenteId
                                                    ? 'Meta de Votantes para el Candidato'
                                                    : 'Meta de Votantes Base'
                                            }
                                            rules={[
                                                { required: true, message: 'Requerido' },
                                                { type: 'number', min: 0, message: 'Debe ser mayor o igual a 0' },
                                            ]}
                                        >
                                            <InputNumber
                                                placeholder="Número total de simpatizantes como objetivo"
                                                precision={0}
                                                className="w-full"
                                            />
                                        </AppForm.Item>
                                    </Col>
                                </Row>
                            </div>

                            <div className="-mx-6 mt-6 -mb-2 flex justify-end gap-3 rounded-b-lg border-t border-gray-200 bg-gray-50/50 p-4">
                                <Button onClick={close} icon={<CloseOutlined />}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    icon={<SaveOutlined />}
                                    className="bg-[#0f172a] hover:bg-[#1e293b]"
                                >
                                    Guardar demarcación
                                </Button>
                            </div>
                        </div>
                    )}
                </AppForm>
            )}
        </AppModal>
    );
});

DemarcacionFormModal.displayName = 'DemarcacionFormModal';

export default DemarcacionFormModal;
