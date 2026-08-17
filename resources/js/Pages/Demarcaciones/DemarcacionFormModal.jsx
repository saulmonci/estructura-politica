import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { ProFormText, ProFormDigit } from '@ant-design/pro-components';
import { Row, Col, Divider, Form } from 'antd';
import { 
    EnvironmentOutlined
} from '@ant-design/icons';
import AppModal from '@/Components/AppModal';
import AppForm from '@/Components/AppForm';

const DemarcacionFormModal = forwardRef(({ onSuccess }, ref) => {
    const modalRef = useRef();
    const [form] = Form.useForm();

    useImperativeHandle(ref, () => ({
        open(id = null, url = null) {
            modalRef.current?.open({ id, url });
        },
        close() {
            modalRef.current?.close();
        },
        getData() {
            return modalRef.current?.getData();
        }
    }));

    const afterOpenChange = (isOpen) => {
        if (isOpen) {
            const data = modalRef.current?.getData();
            if (!data?.id) {
                form.resetFields();
            }
        }
    };

    return (
        <AppModal
            ref={modalRef}
            afterOpenChange={afterOpenChange}
            width={700}
            footer={null}
            destroyOnClose={true}
            maskClosable={true}
            keyboard={true}
            closeIcon={null}
            styles={{ body: { padding: 0 } }}
            title={null}
        >
            {(data, close) => {
                const editId = data?.id;
                const fetchUrl = data?.url;
                const basePath = '/demarcaciones';
                const endpoint = fetchUrl || (editId ? `${basePath}/${editId}` : basePath);

                return (
                    <AppForm
                        form={form}
                        modalClose={close}
                        fetchUrl={editId ? endpoint : null}
                        endpoint={endpoint}
                        method={editId ? 'PUT' : 'POST'}
                        successMessage={editId ? 'Demarcación actualizada exitosamente' : 'Demarcación creada exitosamente'}
                        onSuccess={() => {
                            if (onSuccess) onSuccess();
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
                            </div>
                        </div>
                    </AppForm>
                );
            }}
        </AppModal>
    );
});

export default DemarcacionFormModal;
