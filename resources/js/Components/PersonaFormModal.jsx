import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { Row, Col, message, Alert, Button, Divider, Form, Modal } from 'antd';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    CameraOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    SaveOutlined,
    CloseOutlined,
    BankOutlined,
    LockOutlined,
    MailOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import IneScanner from './IneScanner';
import AppSelect from './AppSelect';
import AppUpload from './AppUpload';
import AppForm from './AppForm';
import AppModal from './AppModal';
import  { useRoleGuard } from './RoleGuard';
import { generatePersonaFormData } from '@/Utils/dummyDataGenerator';

const PersonaFormModal = forwardRef(({ onSuccess, entityType = 'RD', availableRds = [], availablePresidentes = [] }, ref) => {
    const { auth } = usePage().props;
    const { hasAccess } = useRoleGuard();
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

                // Limpiar todos los campos inmediatamente al abrir para creación
                form.resetFields();
                form.setFieldsValue({
                    parent_id: undefined,
                    nombre: '',
                    apellidos: '',
                    apodo: '',
                    sexo: undefined,
                    estado: true,
                    password: '',
                    calle: '',
                    numero_exterior: '',
                    numero_interior: '',
                    colonia: '',
                    codigo_postal: '',
                    demarcacion_id: undefined,
                    demarcacion_asignada_id: undefined,
                    seccion_electoral: undefined,
                    curp: '',
                    clave_electoral: '',
                    telefono: '',
                    email: '',
                    notas: ''
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
            maskClosable={true}
            keyboard={true}
            closeIcon={null}
            styles={{ body: { padding: 0 } }}
            title={null}
        >
            {(data, close) => {
                const editId = data?.id;
                const fetchUrl = data?.url;
                const basePath = entityType === 'Operador' ? '/operadores' : (entityType === 'Promotor' ? '/promotores' : (entityType === 'Coordinador' ? '/coordinadores' : '/representantes'));
                const endpoint = fetchUrl || (editId ? `${basePath}/${editId}` : basePath);

                return (
                    <AppForm
                        form={form}
                        modalClose={close}
                        fetchUrl={editId ? (fetchUrl || `/api/personas/${editId}`) : null}
                onDataFetched={(data) => {
                    if (data.foto_url) {
                        fotoRef.current?.setExistingUrl(data.foto_url);
                    }
                    if (data.ine_frente_url) {
                        ineFrenteRef.current?.setExistingUrl(data.ine_frente_url);
                    }
                    if (data.ine_reverso_url) {
                        ineReversoRef.current?.setExistingUrl(data.ine_reverso_url);
                    }
                    
                    if (data.estado !== undefined && data.estado !== null) {
                        form.setFieldsValue({ estado: (data.estado === true || data.estado === 1 || data.estado === '1') });
                    }

                    if (data.demarcacion_id) {
                        if (data.demarcacion_asignada_id) {
                            form.setFieldsValue({ demarcacion_asignada_id: String(data.demarcacion_asignada_id) });
                        }
                        
                        const demId = String(data.demarcacion_id);
                        setSelectedDemarcacion(demId);
                        form.setFieldsValue({
                            demarcacion_id: demId,
                            seccion_electoral: data.seccion_electoral ? String(data.seccion_electoral) : undefined
                        });
                    } else {
                        setSelectedDemarcacion(null);
                        setSecciones([]);
                    }
                }}
                endpoint={endpoint}
                method={editId ? 'PUT' : 'POST'}
                onSuccess={() => {
                    if (onSuccess) onSuccess();
                }}
                beforeSubmit={(values) => {
                    const fotoFile = fotoRef.current?.getFile();
                    if (fotoFile) values.foto = fotoFile;
    
                    const ineFrenteFile = ineFrenteRef.current?.getFile();
                    if (ineFrenteFile) values.ine_frente = ineFrenteFile;
                    
                    const ineReversoFile = ineReversoRef.current?.getFile();
                    if (ineReversoFile) values.ine_reverso = ineReversoFile;
    
                    if (values.estado !== undefined && values.estado !== null) {
                        values.estado = (values.estado === true || values.estado === 1 || values.estado === '1') ? 1 : 0;
                    }
                    return values;
                }}

            submitter={{
                render: (props) => {
                    const requiresParent = 
                        hasAccess({ allowedRoles: ['admin', 'superadmin', 'superuser'], entities: ['Representante', 'Coordinador'], currentEntity: entityType }) ||
                        hasAccess({ allowedRoles: ['presidente', 'coordinador_distrito', 'admin', 'superadmin', 'superuser'], entities: ['Operador'], currentEntity: entityType }) ||
                        hasAccess({ allowedRoles: ['presidente', 'coordinador_distrito', 'rd', 'admin', 'superadmin', 'superuser'], entities: ['Promotor'], currentEntity: entityType });

                    const isDisabled = !editId && requiresParent && ((entityType === 'Representante' || entityType === 'Coordinador') ? availablePresidentes.length === 0 : availableRds.length === 0);
                    
                    return (
                        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                            <Button 
                                key="cancel" 
                                htmlType="button"
                                onClick={() => setOpen(false)}
                                icon={<CloseOutlined />}
                                className="border-gray-300 text-gray-700"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                key="submit" 
                                type="primary" 
                                htmlType="button"
                                onClick={() => props.form?.submit?.()}
                                icon={<SaveOutlined />}
                                className="bg-[#0f172a]"
                                disabled={isDisabled}
                            >
                                Guardar registro
                            </Button>
                        </div>
                    );
                },
            }}
            >
            {/* Custom Header */}
            <div className="bg-[#0f172a] text-white p-6 rounded-t-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-lg">
                        <TeamOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold m-0 tracking-wide uppercase">
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} {entityType === 'Coordinador' ? 'Coordinador de Distrito' : (entityType === 'RD' || entityType === 'Representante' ? 'Representante Demarcación' : (entityType === 'Operador' ? 'Operador Político' : 'Promotor'))}
                        </h2>
                        <p className="text-gray-300 text-sm m-0">Estructura Política y Control Territorial</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(auth?.user?.role === 'superuser' || auth?.is_impersonating || auth?.impersonator?.role === 'superuser') && (
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold border-none shadow-md"
                            onClick={() => {
                                const dummy = generatePersonaFormData({
                                    entityType,
                                    userRole: auth?.user?.role,
                                    availablePresidentes,
                                    availableRds,
                                    demarcaciones,
                                    secciones,
                                });
                                form.setFieldsValue(dummy);
                                if (dummy.demarcacion_id) {
                                    setSelectedDemarcacion(dummy.demarcacion_id);
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
                    <Col xs={24} lg={15}>
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

                            // 2. Clave electoral
                            const claveElectoral = data.clave_electoral || data.clave_elector || '';

                            // 3. Preparar campos
                            const fieldsToSet = {
                                nombre: data.nombre || '',
                                apellidos: data.apellidos || '',
                                sexo: sexo || undefined,
                                calle: data.calle || '',
                                numero_exterior: data.numero_exterior || '',
                                numero_interior: data.numero_interior || '',
                                colonia: data.colonia || '',
                                codigo_postal: data.codigo_postal || '',
                                curp: data.curp || '',
                                clave_electoral: claveElectoral,
                            };

                            // 4. Si viene imagen comprimida, asignarla
                            if (compressedFile && !ineFrenteRef.current?.getFile()) {
                                ineFrenteRef.current?.setFile(compressedFile);
                            }

                            // 5. Manejar Demarcación y Sección
                            if (data.demarcacion_id) {
                                const demId = String(data.demarcacion_id);
                                fieldsToSet.demarcacion_id = demId;
                                setSelectedDemarcacion(demId);
                                
                                if (data.seccion_electoral) {
                                    const rawSec = String(data.seccion_electoral);
                                    const trimmedSec = rawSec.replace(/^0+/, '');
                                    fieldsToSet.seccion_electoral = trimmedSec || rawSec;
                                }
                            } else if (data.seccion_electoral) {
                                fieldsToSet.seccion_electoral = String(data.seccion_electoral);
                            }

                            form.setFieldsValue(fieldsToSet);
                            message.success('Campos llenados automáticamente');
                        }} />

                        <div className="mt-4">
                            {(() => {
                                const requiresParent = 
                                    hasAccess({ allowedRoles: ['admin', 'superadmin', 'superuser'], entities: ['Representante', 'Coordinador'], currentEntity: entityType }) ||
                                    hasAccess({ allowedRoles: ['presidente', 'coordinador_distrito', 'admin', 'superadmin', 'superuser'], entities: ['Operador'], currentEntity: entityType }) ||
                                    hasAccess({ allowedRoles: ['presidente', 'coordinador_distrito', 'rd', 'admin', 'superadmin', 'superuser'], entities: ['Promotor'], currentEntity: entityType });
                                
                                const parentOptions = (entityType === 'Representante' || entityType === 'Coordinador')
                                    ? availablePresidentes.map(p => ({ label: p.apodo ? `${p.name} (${p.apodo})` : p.name, value: p.id }))
                                    : availableRds.map(rd => ({ label: rd.apodo ? `${rd.name} (${rd.apodo})` : rd.name, value: rd.id }));
                                    
                                const parentLabel = (entityType === 'Representante' || entityType === 'Coordinador') ? 'Presidente a cargo' : (entityType === 'Operador' ? 'Representante de Demarcación (RD)' : 'Operador');
                                
                                return requiresParent ? (
                                <Row gutter={16} className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                                    <Col span={24}>
                                        <ProFormSelect
                                            name="parent_id"
                                            label={<span className="font-bold text-blue-800">Asignar a {parentLabel}</span>}
                                            placeholder={`Seleccionar el ${parentLabel} responsable`}
                                            rules={[{ required: !editId, message: 'Requerido' }]}
                                            options={parentOptions}
                                            fieldProps={{ prefix: <TeamOutlined className="text-blue-500 mr-2" />, showSearch: true }}
                                        />
                                    </Col>
                                </Row>
                            ) : null;
                            })()}
                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="nombre"
                                        label="Nombre(s)"
                                        placeholder="Ingresar nombre(s)"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <UserOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="apellidos"
                                        label="Apellidos"
                                        placeholder="Ingresar apellidos"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <UserOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="apodo"
                                        label="Apodo (alias)"
                                        placeholder="Ingresar apodo"
                                        fieldProps={{ prefix: <UserOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="sexo"
                                        label="Sexo"
                                        placeholder="Seleccionar"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        options={[
                                            { label: 'Masculino', value: 'Masculino' },
                                            { label: 'Femenino', value: 'Femenino' },
                                        ]}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="estado"
                                        label="Estatus"
                                        placeholder="Seleccionar estatus"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        options={[
                                            { label: 'Activo', value: true },
                                            { label: 'Inactivo', value: false },
                                        ]}
                                        initialValue={true}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={24}>
                                    <ProFormText.Password
                                        name="password"
                                        label="Contraseña de acceso"
                                        placeholder={editId ? "Dejar en blanco para conservar la actual" : "Ingresar contraseña (mín. 6 caracteres)"}
                                        rules={[{ required: !editId, message: 'La contraseña es requerida para un nuevo registro' }, { min: 6, message: 'Mínimo 6 caracteres' }]}
                                        fieldProps={{ prefix: <LockOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="calle"
                                        label="Calle"
                                        placeholder="Ingresar calle"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <EnvironmentOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={12} md={6}>
                                    <ProFormText
                                        name="numero_exterior"
                                        label="No. Ext"
                                        placeholder="Exterior"
                                        rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}
                                        fieldProps={{ prefix: <span className="text-gray-400 font-bold mr-2">#</span> }}
                                    />
                                </Col>
                                <Col xs={12} md={6}>
                                    <ProFormText
                                        name="numero_interior"
                                        label="No. Int"
                                        placeholder="Interior"
                                        fieldProps={{ prefix: <span className="text-gray-400 font-bold mr-2">#</span> }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="colonia"
                                        label="Colonia"
                                        placeholder="Ingresar colonia"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <BankOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="codigo_postal"
                                        label="Código Postal"
                                        placeholder="Ingresar C.P."
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { pattern: /^[0-9]{5}$/, message: 'Debe contener exactamente 5 números' }
                                        ]}
                                        fieldProps={{ 
                                            prefix: <span className="text-gray-400 font-bold mr-2">CP</span>,
                                            maxLength: 5,
                                            onKeyPress: (event) => {
                                                if (!/[0-9]/.test(event.key)) {
                                                    event.preventDefault();
                                                }
                                            }
                                        }}
                                    />
                                </Col>
                            </Row>

                            {entityType === 'RD' && (
                                <Row gutter={16} className="mb-4">
                                    <Col span={24}>
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="text-blue-800 font-bold mb-2 flex items-center">
                                                <TeamOutlined className="mr-2" /> ZONA DE RESPONSABILIDAD
                                            </h4>
                                            <p className="text-sm text-blue-700 mb-3">
                                                Selecciona la demarcación de la cual este Representante será responsable. Esta demarcación determinará los datos que el RD podrá visualizar.
                                            </p>
                                            <AppSelect
                                                name="demarcacion_asignada_id"
                                                label="Demarcación Asignada / A Cargo"
                                                placeholder="Seleccionar demarcación asignada"
                                                rules={[{ required: true, message: 'Requerido' }]}
                                                fetchUrl="/catalogos/demarcaciones"
                                                fieldProps={{
                                                    prefix: <EnvironmentOutlined className="text-blue-500 mr-2" />,
                                                }}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            )}

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <AppSelect
                                        name="demarcacion_id"
                                        label={entityType === 'RD' ? "Demarcación (Info Personal)" : "Demarcación"}
                                        placeholder="Seleccionar demarcación"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fetchUrl="/catalogos/demarcaciones"
                                        onDataLoaded={(data) => {
                                            setDemarcaciones(data);
                                            if (data.length === 1 && !editId && !form.getFieldValue('demarcacion_id')) {
                                                const demId = String(data[0].id);
                                                form.setFieldsValue({ demarcacion_id: demId });
                                                setSelectedDemarcacion(demId);
                                            }
                                        }}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="text-gray-400 mr-2" />,
                                            onChange: (value) => {
                                                setSelectedDemarcacion(value);
                                                form.setFieldsValue({ seccion_electoral: undefined });
                                            }
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <AppSelect
                                        name="seccion_electoral"
                                        label="Sección Electoral"
                                        placeholder="Seleccionar sección"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        disabled={!selectedDemarcacion}
                                        fetchUrl={selectedDemarcacion ? `/catalogos/demarcaciones/${selectedDemarcacion}/secciones` : null}
                                        valueKey="numero"
                                        labelKey={(s) => `Sección ${s.numero}`}
                                        onDataLoaded={setSecciones}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="text-gray-400 mr-2" />,
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="curp"
                                        label="CURP"
                                        placeholder="Ingresar CURP"
                                        rules={[
                                            { required: true, message: 'Requerido' },
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
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="clave_electoral"
                                        label="Clave electoral"
                                        placeholder="Clave electoral"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { len: 18, message: 'Debe contener exactamente 18 caracteres' }
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
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="telefono"
                                        label="Teléfono"
                                        placeholder="Ingresar teléfono"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { pattern: /^[0-9]{10}$/, message: 'Debe contener exactamente 10 números' }
                                        ]}
                                        fieldProps={{ 
                                            prefix: <PhoneOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 10,
                                            onKeyPress: (event) => {
                                                if (!/[0-9]/.test(event.key)) {
                                                    event.preventDefault();
                                                }
                                            }
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="email"
                                        label="Correo electrónico"
                                        placeholder="Ingresar correo (opcional)"
                                        rules={[
                                            { type: 'email', message: 'Correo no válido' }
                                        ]}
                                        fieldProps={{ prefix: <MailOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                            </Row>

                            {entityType === 'RD' && (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <ProFormTextArea
                                            name="notas"
                                            label="Notas"
                                            placeholder="Ingresar notas adicionales (opcional)"
                                            fieldProps={{ rows: 6 }}
                                        />
                                    </Col>
                                </Row>
                            )}

                            <Alert
                                message={<span className="font-bold">IMPORTANTE</span>}
                                description="Verifica que todos los datos sean correctos antes de guardar el registro. La información será utilizada únicamente para fines de organización y estrategia política."
                                type="success"
                                showIcon
                                className="mt-0 bg-green-50 border-green-200"
                            />
                        </div>
                    </Col>

                    {/* Right Column: Photography */}
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
                                description={<span className="text-sm text-blue-800">Fotografía actual de la persona. Esto nos ayuda a identificarla fácilmente en campo.</span>}
                                type="info"
                                showIcon
                                className="mb-4 bg-blue-50 border-blue-200"
                            />
                            <AppUpload 
                                ref={fotoRef} 
                                title="FOTOGRAFÍA" 
                                icon={<UserOutlined />} 
                                className="mt-0" 
                            />
                            <AppUpload 
                                ref={ineFrenteRef} 
                                title="INE FRENTE" 
                                icon={<IdcardOutlined />} 
                            />
                            <AppUpload 
                                ref={ineReversoRef} 
                                title="INE REVERSO" 
                                icon={<IdcardOutlined />} 
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

export default PersonaFormModal;
