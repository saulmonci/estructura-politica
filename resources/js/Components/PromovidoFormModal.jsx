import React, { useState, forwardRef, useRef, useImperativeHandle } from 'react';
import { ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Row, Col, Form, Button, message, Alert, Divider } from 'antd';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    CameraOutlined,
    SafetyCertificateOutlined,
    UsergroupAddOutlined,
    ThunderboltOutlined,
    TeamOutlined,
    BankOutlined
} from '@ant-design/icons';
import { usePage } from '@inertiajs/react';
import AppModal from './AppModal';
import AppForm from './AppForm';
import AppUpload from './AppUpload';
import AppSelect from './AppSelect';
import IneScanner from './IneScanner';
import { generatePromovidoFormData } from '@/Utils/dummyDataGenerator';
import axios from 'axios';

const PromovidoFormModal = forwardRef(({ onSuccess, availablePromotores = [] }, ref) => {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;

    const modalRef = useRef();
    const [form] = Form.useForm();
    const [demarcaciones, setDemarcaciones] = useState([]);
    const [secciones, setSecciones] = useState([]);
    const [selectedDemarcacion, setSelectedDemarcacion] = useState(null);

    const fotoRef = useRef(null);
    const ineFrenteRef = useRef(null);
    const ineReversoRef = useRef(null);

    useImperativeHandle(ref, () => ({
        open(id = null, url = null) {
            modalRef.current?.open({ id, url });
        },
        close() {
            modalRef.current?.close();
        }
    }));

    const afterOpenChange = (isOpen) => {
        if (isOpen) {
            const data = modalRef.current?.getData();
            const editId = data?.id;

            if (!editId) {
                fotoRef.current?.reset();
                ineFrenteRef.current?.reset();
                ineReversoRef.current?.reset();
                setSelectedDemarcacion(null);
                setSecciones([]);

                form.resetFields();
                form.setFieldsValue({
                    promotor_id: undefined,
                    nombre: '',
                    apellidos: '',
                    clave_elector: '',
                    curp: '',
                    telefono: '',
                    codigo_postal: '',
                    colonia: '',
                    calle: '',
                    numero: '',
                    demarcacion_id: undefined,
                    seccion_electoral: undefined
                });
            }
        }
    };

    return (
        <AppModal
            ref={modalRef}
            afterOpenChange={afterOpenChange}
            width={1000}
            footer={null}
            destroyOnClose={true}
            maskClosable={false}
            keyboard={true}
            closeIcon={null}
            styles={{ body: { padding: 0 } }}
            title={null}
        >
            {(data, close) => {
                const editId = data?.id;
                const fetchUrl = data?.url;
                const endpoint = fetchUrl || (editId ? `/promovidos/${editId}` : '/promovidos');

                return (
                    <AppForm
                        form={form}
                        modalClose={close}
                        fetchUrl={editId ? endpoint : null}
                        onDataFetched={(data) => {
                            if (data.foto) {
                                fotoRef.current?.setExistingUrl(`/storage/${data.foto}`);
                            }
                            if (data.ine_frente) {
                                ineFrenteRef.current?.setExistingUrl(`/storage/${data.ine_frente}`);
                            }
                            if (data.ine_reverso) {
                                ineReversoRef.current?.setExistingUrl(`/storage/${data.ine_reverso}`);
                            }

                            if (data.demarcacion_id) {
                                const demId = String(data.demarcacion_id);
                                setSelectedDemarcacion(demId);
                                form.setFieldsValue({
                                    ...data,
                                    demarcacion_id: demId,
                                    seccion_electoral: data.seccion_electoral ? String(data.seccion_electoral) : undefined
                                });
                            } else {
                                setSelectedDemarcacion(null);
                                setSecciones([]);
                                form.setFieldsValue(data);
                            }
                        }}
                        endpoint={endpoint}
                        method={editId ? 'PUT' : 'POST'}
                        onSuccess={() => {
                            if (onSuccess) onSuccess();
                            close();
                        }}
                        beforeSubmit={(values) => {
                            const fotoFile = fotoRef.current?.getFile();
                            if (fotoFile) values.foto = fotoFile;
            
                            const ineFrenteFile = ineFrenteRef.current?.getFile();
                            if (ineFrenteFile) values.ine_frente = ineFrenteFile;
                            
                            const ineReversoFile = ineReversoRef.current?.getFile();
                            if (ineReversoFile) values.ine_reverso = ineReversoFile;
            
                            return values;
                        }}
                    >
            <div className="bg-[#0f172a] text-white p-6 rounded-t-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-lg">
                        <UsergroupAddOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold m-0 tracking-wide uppercase">
                            {editId ? 'Editar Promovido' : 'Registro de Promovido'}
                        </h2>
                        <p className="text-gray-300 text-sm m-0">Registro Simpatizantes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(auth?.user?.role === 'superuser' || auth?.is_impersonating || auth?.impersonator?.role === 'superuser') && (
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold border-none shadow-md"
                            onClick={() => {
                                const dummy = generatePromovidoFormData({
                                    availablePromotores,
                                    demarcaciones,
                                    secciones,
                                });
                                form.setFieldsValue(dummy);
                                if (dummy.demarcacion_id) {
                                    setSelectedDemarcacion(dummy.demarcacion_id);
                                    fetchSecciones(dummy.demarcacion_id);
                                }
                                message.success('⚡ Datos de prueba generados exitosamente');
                            }}
                        >
                            ⚡ Llenar datos de prueba
                        </Button>
                    )}
                    <div className="hidden sm:flex items-center gap-2 text-gray-300 bg-white/10 px-4 py-2 rounded-full text-sm">
                        <SafetyCertificateOutlined />
                        <span>Información segura</span>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <Row gutter={48}>
                    <Col xs={24} md={15}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-[#0f172a] text-white p-1 rounded">
                                <UserOutlined />
                            </div>
                            <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">DATOS DEL PROMOVIDO</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />

                        <IneScanner onDataExtracted={async (data, compressedFile) => {
                            // 1. Normalizar sexo
                            let sexo = data.sexo;
                            if (sexo) {
                                const s = String(sexo).trim().toUpperCase();
                                if (s === 'H' || s === 'MASCULINO' || s === 'HOMBRE') {
                                    sexo = 'Masculino';
                                } else if (s === 'M' || s === 'FEMENINO' || s === 'MUJER') {
                                    sexo = 'Femenino';
                                }
                            }
                            
                            // 2. Mapear clave_elector
                            const claveElector = data.clave_elector || data.clave_electoral || '';

                            // 3. Mapear numero_exterior e interior al campo "numero"
                            let numero = '';
                            if (data.numero_exterior) {
                                numero = String(data.numero_exterior).trim();
                                if (data.numero_interior && String(data.numero_interior).trim() !== '') {
                                    numero += ' Int ' + String(data.numero_interior).trim();
                                }
                            } else if (data.numero_interior && String(data.numero_interior).trim() !== '') {
                                numero = 'Int ' + String(data.numero_interior).trim();
                            }

                            const fieldsToSet = {
                                nombre: data.nombre || '',
                                apellidos: data.apellidos || '',
                                clave_elector: claveElector,
                                curp: data.curp || '',
                                telefono: data.telefono || '',
                                codigo_postal: data.codigo_postal || '',
                                colonia: data.colonia || '',
                                calle: data.calle || '',
                                numero: numero,
                            };

                            // 4. Si viene imagen comprimida y no hay foto de frente asignada, asignarla
                            if (compressedFile && fileListIneFrente.length === 0) {
                                setFileListIneFrente([{ originFileObj: compressedFile }]);
                            }

                            // 5. Manejar Demarcación y Sección
                            if (data.demarcacion_id) {
                                const demId = String(data.demarcacion_id);
                                fieldsToSet.demarcacion_id = demId;
                                setSelectedDemarcacion(demId);
                                
                                setLoadingSecciones(true);
                                try {
                                    const secRes = await axios.get(`/catalogos/demarcaciones/${demId}/secciones`);
                                    const secList = secRes.data || [];
                                    setSecciones(secList);
                                    
                                    if (data.seccion_electoral) {
                                        const rawSec = String(data.seccion_electoral);
                                        const trimmedSec = rawSec.replace(/^0+/, '');
                                        const foundSec = secList.find(s => String(s.numero) === rawSec || String(s.numero) === trimmedSec);
                                        if (foundSec) {
                                            fieldsToSet.seccion_electoral = String(foundSec.numero);
                                        } else {
                                            fieldsToSet.seccion_electoral = rawSec;
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error al cargar secciones para la demarcación', e);
                                } finally {
                                    setLoadingSecciones(false);
                                }
                            } else if (data.seccion_electoral) {
                                fieldsToSet.seccion_electoral = String(data.seccion_electoral);
                            }

                            form.setFieldsValue(fieldsToSet);
                            message.success('Campos llenados automáticamente');
                        }} />

                        <div className="mt-4">
                            {userRole !== 'promotor' && (
                                availablePromotores.length > 0 ? (
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
                                ) : (
                                    <Row gutter={16} className="mb-4 bg-red-50 p-3 rounded-md border border-red-100 text-red-600 text-sm">
                                        <Col span={24}>
                                            <strong>⚠️ Sin Promotores:</strong> No tienes promotores registrados en tu red. 
                                            Debes registrar al menos un promotor antes de poder registrar un promovido.
                                        </Col>
                                    </Row>
                                )
                            )}
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="nombre"
                                        label="Nombre(s)"
                                        placeholder="Ingresar nombre(s)"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { max: 100, message: 'Máximo 100 caracteres' }
                                        ]}
                                        fieldProps={{
                                            prefix: <UserOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 100,
                                            showCount: true,
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="apellidos"
                                        label="Apellidos"
                                        placeholder="Ingresar apellidos"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { max: 100, message: 'Máximo 100 caracteres' }
                                        ]}
                                        fieldProps={{
                                            prefix: <UserOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 100,
                                            showCount: true,
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="clave_elector"
                                        label="Clave de elector"
                                        placeholder="18 caracteres"
                                        rules={[
                                            { max: 18, message: 'Máximo 18 caracteres' }
                                        ]}
                                        formItemProps={{
                                            getValueFromEvent: (e) => e.target.value.toUpperCase().replace(/[^A-Z0-9]/ig, '')
                                        }}
                                        fieldProps={{
                                            prefix: <IdcardOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' }
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="curp"
                                        label="CURP"
                                        placeholder="18 caracteres"
                                        rules={[
                                            { len: 18, message: 'Debe contener exactamente 18 caracteres' }
                                        ]}
                                        formItemProps={{
                                            getValueFromEvent: (e) => e.target.value.toUpperCase().replace(/[^A-Z0-9Ñ]/ig, '')
                                        }}
                                        fieldProps={{
                                            prefix: <IdcardOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' }
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="telefono"
                                        label="Teléfono de contacto"
                                        placeholder="10 dígitos"
                                        rules={[
                                            { pattern: /^[0-9]{10}$/, message: 'Debe contener exactamente 10 dígitos' }
                                        ]}
                                        fieldProps={{
                                            prefix: <PhoneOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 10,
                                            onKeyPress: (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="codigo_postal"
                                        label="Código Postal"
                                        placeholder="5 dígitos"
                                        rules={[
                                            { pattern: /^[0-9]{5}$/, message: 'Debe contener exactamente 5 dígitos' }
                                        ]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 5,
                                            onKeyPress: (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="colonia"
                                        label="Colonia"
                                        placeholder="Ingresar colonia"
                                        rules={[{ max: 255, message: 'Máximo 255 caracteres' }]}
                                        fieldProps={{
                                            prefix: <BankOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 255,
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="calle"
                                        label="Calle"
                                        placeholder="Ingresar calle"
                                        rules={[{ max: 255, message: 'Máximo 255 caracteres' }]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 255,
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={4}>
                                    <ProFormText
                                        name="numero"
                                        label="Número"
                                        placeholder="Nº"
                                        rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 50,
                                        }}
                                    />
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <AppSelect
                                        name="demarcacion_id"
                                        label="Demarcación"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        url="/catalogos/demarcaciones"
                                        onChange={(value) => {
                                            setSelectedDemarcacion(value);
                                            form.setFieldValue('seccion_electoral', undefined);
                                        }}
                                        disabled={!!editId}
                                        icon={<EnvironmentOutlined />}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <AppSelect
                                        name="seccion_electoral"
                                        label="Sección Electoral"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        url={selectedDemarcacion ? `/catalogos/demarcaciones/${selectedDemarcacion}/secciones` : null}
                                        valueProp="numero"
                                        labelProp="numero"
                                        disabled={!selectedDemarcacion || !!editId}
                                        icon={<EnvironmentOutlined />}
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
                    </Col>
                    
                    <Col xs={24} md={9}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-[#0f172a] text-white p-1 rounded">
                                <CameraOutlined />
                            </div>
                            <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">FOTOGRAFÍAS</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />
                        
                        <div className="mt-4">
                            <Alert
                                description={<span className="text-sm text-blue-800">Fotografía del promovido para identificarlo fácilmente en campo.</span>}
                                type="info"
                                showIcon
                                className="mb-6 bg-blue-50 border-blue-100"
                            />

                            <AppUpload
                                ref={fotoRef}
                                title="Foto de Perfil"
                                icon={<CameraOutlined />}
                                className="bg-blue-50/50 border-blue-200"
                            />

                            <AppUpload
                                ref={ineFrenteRef}
                                title="INE Frente"
                                icon={<IdcardOutlined />}
                                className="bg-slate-50 border-slate-200 mt-4"
                            />

                            <AppUpload
                                ref={ineReversoRef}
                                title="INE Reverso"
                                icon={<IdcardOutlined />}
                                className="bg-slate-50 border-slate-200 mt-4"
                            />
                        </div>
                    </Col>
                </Row>
            </div>
            </AppForm>
                );
            }}
        </AppModal>
    );
});

export default PromovidoFormModal;
