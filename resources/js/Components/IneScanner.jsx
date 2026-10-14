import React, { useState } from 'react';
import { Upload, Button, message, Spin, Alert, Modal } from 'antd';
import { CameraOutlined, IdcardOutlined, PictureOutlined, StopOutlined } from '@ant-design/icons';
import imageCompression from 'browser-image-compression';
import axios from 'axios';

export const showIneVencidaModal = (year, modalInstance = null) => {
    const yearText = year ? `año ${year}` : '2016 o anterior';
    const modalConfig = {
        title: (
            <div className="flex items-center gap-2">
                <StopOutlined className="text-xl text-red-600" />
                <span className="text-lg font-black tracking-wide text-red-600">INE VENCIDA NO VOTA</span>
            </div>
        ),
        content: (
            <div className="py-2 text-sm text-gray-700">
                <p className="mb-2">
                    La credencial seleccionada tiene fecha de emisión <strong>{yearText}</strong> y se encuentra
                    vencida.
                </p>
                <p className="mb-0 text-gray-500">
                    Solo las credenciales INE con emisión del <strong>2017 en adelante</strong> se pueden registrar.
                    Este registro no se puede realizar.
                </p>
            </div>
        ),
        okText: 'Aceptar',
        okButtonProps: {
            danger: true,
            className: 'font-semibold',
        },
        centered: true,
        width: 480,
    };

    if (modalInstance?.error) {
        modalInstance.error(modalConfig);
    } else {
        Modal.error(modalConfig);
    }
};

const IneScanner = ({ onDataExtracted, onExtractionComplete, onIneRejected }) => {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [modal, contextHolder] = Modal.useModal();

    const handleUpload = async (file) => {
        try {
            setLoading(true);
            setErrorMsg(null);

            // 1. Comprimir la imagen para que sea ligera
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };

            const compressedFile = await imageCompression(file, options);

            // 2. Enviar al backend
            const formData = new FormData();
            formData.append('ine_image', compressedFile);

            const response = await axios.post('/extract-ine', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data && response.data.success) {
                const data = response.data.data;
                const anioEmision = data?.anio_emision || data?.emision;

                if (anioEmision && parseInt(anioEmision, 10) < 2017) {
                    showIneVencidaModal(anioEmision, modal);
                    if (onIneRejected) onIneRejected();
                    return;
                }

                message.success('Datos extraídos correctamente de la INE');
                if (onDataExtracted) {
                    onDataExtracted(response.data.data, compressedFile);
                }
                if (onExtractionComplete) {
                    onExtractionComplete(response.data.data, compressedFile);
                }
            } else {
                const resData = response.data;
                if (resData?.error_code === 'INE_VENCIDA' || resData?.message?.includes('INE VENCIDA NO VOTA')) {
                    showIneVencidaModal(resData?.anio_emision, modal);
                    if (onIneRejected) onIneRejected();
                    return;
                }
                setErrorMsg(
                    response.data?.message ||
                        'No se pudieron extraer los datos. Por favor revisa la imagen e intenta de nuevo.'
                );
            }
        } catch (error) {
            console.error('Error extrayendo INE:', error);
            const errData = error.response?.data;
            if (errData?.error_code === 'INE_VENCIDA' || errData?.message?.includes('INE VENCIDA NO VOTA')) {
                showIneVencidaModal(errData?.anio_emision, modal);
                if (onIneRejected) onIneRejected();
                return;
            }
            const msg = errData?.message || 'Hubo un error al procesar la imagen de la INE.';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }

        return false; // Prevent default upload behavior of Ant Design Upload component
    };

    return (
        <div style={{ marginBottom: 24 }}>
            {contextHolder}
            {errorMsg && (
                <Alert
                    message="Error de escaneo"
                    description={errorMsg}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setErrorMsg(null)}
                    style={{ marginBottom: 16 }}
                />
            )}
            <Alert
                message="Autollenado Inteligente"
                description={
                    <div style={{ marginTop: 8 }}>
                        Sube o toma una foto del <strong>frente de la INE</strong> para llenar los datos
                        automáticamente.
                        <div style={{ marginTop: 12 }} className="flex flex-wrap gap-2">
                            <Upload
                                name="ine_image"
                                showUploadList={false}
                                beforeUpload={handleUpload}
                                accept="image/jpeg,image/png,image/jpg"
                                capture="environment"
                            >
                                <Button type="primary" icon={<CameraOutlined />} loading={loading}>
                                    {loading ? 'Analizando...' : 'Tomar Foto'}
                                </Button>
                            </Upload>
                            <Upload
                                name="ine_image"
                                showUploadList={false}
                                beforeUpload={handleUpload}
                                accept="image/jpeg,image/png,image/jpg"
                            >
                                <Button icon={<PictureOutlined />} loading={loading}>
                                    {loading ? 'Analizando...' : 'Elegir de Galería'}
                                </Button>
                            </Upload>
                        </div>
                    </div>
                }
                type="info"
                showIcon
            />
        </div>
    );
};

export default IneScanner;
