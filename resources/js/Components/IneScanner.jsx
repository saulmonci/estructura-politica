import React, { useState } from 'react';
import { Upload, Button, message, Spin, Alert } from 'antd';
import { CameraOutlined, IdcardOutlined } from '@ant-design/icons';
import imageCompression from 'browser-image-compression';
import axios from 'axios';

const IneScanner = ({ onDataExtracted }) => {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

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
                message.success('Datos extraídos correctamente de la INE');
                if (onDataExtracted) {
                    onDataExtracted(response.data.data);
                }
            } else {
                setErrorMsg(response.data?.message || 'No se pudieron extraer los datos. Por favor revisa la imagen e intenta de nuevo.');
            }
        } catch (error) {
            console.error('Error extrayendo INE:', error);
            const msg = error.response?.data?.message || 'Hubo un error al procesar la imagen de la INE.';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }

        return false; // Prevent default upload behavior of Ant Design Upload component
    };

    return (
        <div style={{ marginBottom: 24 }}>
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
                        Sube o toma una foto del <strong>frente de la INE</strong> para llenar los datos automáticamente.
                        <div style={{ marginTop: 12 }}>
                            <Upload
                                name="ine_image"
                                showUploadList={false}
                                beforeUpload={handleUpload}
                                accept="image/jpeg,image/png,image/jpg"
                            >
                                <Button 
                                    type="primary" 
                                    icon={<IdcardOutlined />} 
                                    loading={loading}
                                >
                                    {loading ? 'Analizando documento...' : 'Escanear INE para autollenar'}
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
