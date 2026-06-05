import React from 'react';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Row, Col, message, Alert, Button, Divider } from 'antd';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    SafetyCertificateOutlined,
    TeamOutlined,
    SaveOutlined,
    CloseOutlined,
    BankOutlined,
    UsergroupAddOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { router } from '@inertiajs/react';

export default function PromovidoFormModal({ open, onOpenChange, onSuccess, editId = null, fetchUrl = null, availablePromotores = [] }) {

    return (
        <ModalForm
            title={null}
            open={open}
            onOpenChange={onOpenChange}
            width={800}
            modalProps={{
                destroyOnClose: true,
                maskClosable: false,
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
                                onClick={() => onOpenChange(false)}
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
                                Guardar registro
                            </Button>
                        </div>
                    );
                },
            }}
            onFinish={async (values) => {
                const endpoint = fetchUrl || (editId ? `/promovidos/${editId}` : '/promovidos');

                if (editId) {
                    values._method = 'put';
                    router.post(endpoint, values, {
                        forceFormData: true,
                        onSuccess: () => {
                            message.success('Registro actualizado exitosamente');
                            if (onSuccess) onSuccess(values);
                            onOpenChange(false);
                        },
                        onError: () => message.error('Por favor revisa los campos en rojo')
                    });
                } else {
                    router.post(endpoint, values, {
                        forceFormData: true,
                        onSuccess: () => {
                            message.success('Registro creado exitosamente');
                            if (onSuccess) onSuccess(values);
                            onOpenChange(false);
                        },
                        onError: () => message.error('Por favor revisa los campos en rojo')
                    });
                }
                return false;
            }}
            request={async () => {
                if (!editId) {
                    return {};
                }
                try {
                    const url = fetchUrl || `/api/promovidos/${editId}`;
                    const response = await axios.get(url);
                    return response.data;
                } catch (error) {
                    message.error('No se pudo cargar la información del registro');
                    return {};
                }
            }}
        >
            <div className="bg-[#0f172a] text-white p-6 rounded-t-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-lg">
                        <UsergroupAddOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold m-0 tracking-wide uppercase">
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} PROMOVIDO
                        </h2>
                        <p className="text-gray-300 text-sm m-0">Registro Simpatizantes</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-gray-300 bg-white/10 px-4 py-2 rounded-full text-sm">
                    <SafetyCertificateOutlined />
                    <span>Información segura</span>
                </div>
            </div>

            <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-[#0f172a] text-white p-1 rounded">
                        <UserOutlined />
                    </div>
                    <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">DATOS DEL PROMOVIDO</h3>
                </div>
                <Divider className="my-2 border-gray-300" />

                <div className="mt-4">
                    {availablePromotores.length > 0 && (
                        <Row gutter={16} className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                            <Col span={24}>
                                <ProFormSelect
                                    name="promotor_id"
                                    label={<span className="font-bold text-blue-800">Asignar a Promotor</span>}
                                    placeholder="Seleccionar el Promotor que trajo a este simpatizante"
                                    rules={[{ required: true, message: 'Debe seleccionar un Promotor' }]}
                                    options={availablePromotores.map(p => ({
                                        label: p.apodo ? `${p.name} (${p.apodo})` : p.name,
                                        value: p.id
                                    }))}
                                    fieldProps={{ prefix: <TeamOutlined className="text-blue-500 mr-2" />, showSearch: true }}
                                />
                            </Col>
                        </Row>
                    )}
                    <Row gutter={16}>
                        <Col span={24}>
                            <ProFormText
                                name="nombre_completo"
                                label="Nombre completo"
                                placeholder="Ingresar nombre completo"
                                rules={[{ required: true, message: 'Requerido' }]}
                                fieldProps={{ prefix: <UserOutlined className="text-gray-400 mr-2" /> }}
                            />
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <ProFormText
                                name="clave_elector"
                                label="Clave de elector"
                                placeholder="Ingresar clave de elector"
                                rules={[{ required: true, message: 'Requerido' }]}
                                fieldProps={{ prefix: <IdcardOutlined className="text-gray-400 mr-2" /> }}
                            />
                        </Col>
                        <Col span={12}>
                            <ProFormText
                                name="telefono"
                                label="Teléfono de contacto"
                                placeholder="Ingresar teléfono"
                                fieldProps={{ prefix: <PhoneOutlined className="text-gray-400 mr-2" /> }}
                            />
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <ProFormText
                                name="colonia"
                                label="Colonia"
                                placeholder="Ingresar colonia"
                                fieldProps={{ prefix: <BankOutlined className="text-gray-400 mr-2" /> }}
                            />
                        </Col>
                        <Col span={12}>
                            <ProFormText
                                name="seccion_electoral"
                                label="Sección Electoral"
                                placeholder="Sección electoral"
                                rules={[{ required: true, message: 'Requerido' }]}
                                fieldProps={{ prefix: <EnvironmentOutlined className="text-gray-400 mr-2" /> }}
                            />
                        </Col>
                    </Row>

                    <Alert
                        message={<span className="font-bold">Privacidad</span>}
                        description="Los datos del promovido están protegidos y solo deben utilizarse para la estructura política y contacto."
                        type="info"
                        showIcon
                        className="mt-4 bg-blue-50 border-blue-200"
                    />
                </div>
            </div>
        </ModalForm>
    );
}
