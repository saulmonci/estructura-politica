import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ModalForm, ProFormText, ProFormDigit, ProFormTextArea } from '@ant-design/pro-components';
import { Row, Col, message, Alert, Button, Divider, Form } from 'antd';
import { 
    EnvironmentOutlined, 
    SaveOutlined, 
    CloseOutlined, 
    InfoCircleOutlined,
    GlobalOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { router } from '@inertiajs/react';

const DemarcacionFormModal = forwardRef(({ onSuccess }, ref) => {
    const [open, setOpen] = useState(false);
    const [editId, setEditingId] = useState(null);
    const [fetchUrl, setFetchUrl] = useState(null);

    useImperativeHandle(ref, () => ({
        open(id = null, url = null) {
            setEditingId(id);
            setFetchUrl(url);
            setOpen(true);
        },
        close() {
            setOpen(false);
        }
    }));

    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            if (!editId) {
                form.resetFields();
            }
        }
    }, [open, editId]);

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
                        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
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

                if (editId) {
                    values._method = 'put';
                    router.post(endpoint, values, {
                        onSuccess: () => {
                            message.success('Demarcación actualizada exitosamente');
                            if (onSuccess) onSuccess(values);
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
                        }
                    });
                } else {
                    router.post(endpoint, values, {
                        onSuccess: () => {
                            message.success('Demarcación creada exitosamente');
                            if (onSuccess) onSuccess(values);
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
                        }
                    });
                }
                return false;
            }}
            request={async () => {
                if (!editId) {
                    return {};
                }
                try {
                    const url = fetchUrl || `/demarcaciones/${editId}`;
                    const response = await axios.get(url);
                    return response.data;
                } catch (error) {
                    message.error('No se pudo cargar la información de la demarcación');
                    return {};
                }
            }}
        >
            {/* Custom Header */}
            <div className="bg-[#0f172a] text-white p-6 rounded-t-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-lg">
                        <EnvironmentOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold m-0 tracking-wide uppercase">
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} Demarcación Territorial
                        </h2>
                        <p className="text-gray-300 text-sm m-0">Estructura Electoral Municipal</p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-[#0f172a] text-white p-1 rounded">
                        <EnvironmentOutlined />
                    </div>
                    <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">DATOS DE LA DEMARCACIÓN</h3>
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
                                    { type: 'number', min: 1, message: 'Debe ser mayor o igual a 1' }
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
                                label="Meta de Votantes"
                                placeholder="Número total de simpatizantes como objetivo"
                                rules={[
                                    { required: true, message: 'Requerido' },
                                    { type: 'number', min: 0, message: 'Debe ser mayor o igual a 0' }
                                ]}
                                fieldProps={{
                                    precision: 0,
                                }}
                            />
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <ProFormTextArea
                                name="wkt_polygon"
                                label="Delimitación Geográfica (Polígono WKT)"
                                placeholder="Ej: POLYGON((-105.28 20.78, -105.26 20.74, -105.24 20.72, -105.19 20.75, -105.28 20.78))"
                                fieldProps={{ 
                                    rows: 4 
                                }}
                            />
                            <div className="text-gray-400 text-xs mt-1 mb-4 flex items-center gap-1">
                                <GlobalOutlined />
                                <span>Coordenadas en sistema EPSG:4326 (Longitud Latitud). El primer y último punto deben ser idénticos para cerrar el polígono.</span>
                            </div>
                        </Col>
                    </Row>

                    <Alert
                        message={<span className="font-bold text-xs uppercase">Advertencia Geográfica</span>}
                        description="Si ingresas un polígono WKT, asegúrate de que tenga un formato correcto. De lo contrario, no se cargará adecuadamente en el mapa territorial."
                        type="warning"
                        showIcon
                        className="bg-amber-50 border-amber-200"
                    />
                </div>
            </div>
        </ModalForm>
    );
});

export default DemarcacionFormModal;
