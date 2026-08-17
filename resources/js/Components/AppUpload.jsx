import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Upload, Button, Image, message } from 'antd';
import { CameraOutlined, PictureOutlined } from '@ant-design/icons';
import imageCompression from 'browser-image-compression';

const AppUpload = forwardRef(({ title, icon, className = "mt-4" }, ref) => {
    const [file, setFile] = useState(null);
    const [existingUrl, setExistingUrlState] = useState(null);

    useImperativeHandle(ref, () => ({
        getFile: () => file,
        setExistingUrl: (url) => setExistingUrlState(url),
        setFile: (newFile) => setFile(newFile),
        reset: () => {
            setFile(null);
            setExistingUrlState(null);
        }
    }));

    const compressImage = async (fileToCompress) => {
        const options = {
            maxSizeMB: 3.8,
            maxWidthOrHeight: 1920,
            useWebWorker: true
        };
        try {
            message.loading({ content: 'Procesando y comprimiendo imagen...', key: `compress_${title}` });
            const compressedFile = await imageCompression(fileToCompress, options);
            message.success({ content: 'Imagen procesada', key: `compress_${title}` });
            return compressedFile;
        } catch (error) {
            console.error(error);
            message.error({ content: 'Error procesando imagen', key: `compress_${title}` });
            return fileToCompress;
        }
    };

    const handleBeforeUpload = async (uploadFile) => {
        const compressedFile = await compressImage(uploadFile);
        setFile(compressedFile);
        return Upload.LIST_IGNORE;
    };

    const handleRemoveFile = () => {
        setFile(null);
    };

    return (
        <div className={`border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50 min-h-[260px] ${className}`}>
            <span className="text-gray-500 font-bold mb-2">{title}</span>
            {file ? (
                <div className="w-full flex flex-col items-center justify-center">
                    <Image 
                        src={URL.createObjectURL(file)} 
                        alt={title} 
                        width={128}
                        height={80}
                        style={{ objectFit: 'cover' }}
                        className="rounded-lg border-4 border-white shadow-md mb-3"
                    />
                    <Button danger size="small" className="mt-2" onClick={handleRemoveFile}>Eliminar foto</Button>
                </div>
            ) : existingUrl ? (
                <div className="w-full flex flex-col items-center justify-center">
                    <Image 
                        src={existingUrl} 
                        alt={title} 
                        width={128}
                        height={80}
                        style={{ objectFit: 'cover' }}
                        className="rounded-lg border-4 border-white shadow-md mb-3"
                    />
                    <div className="flex gap-2 justify-center flex-wrap">
                        <Upload
                            beforeUpload={handleBeforeUpload}
                            showUploadList={false}
                            accept="image/*"
                            capture="environment"
                        >
                            <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                Cámara
                            </Button>
                        </Upload>
                        <Upload
                            beforeUpload={handleBeforeUpload}
                            showUploadList={false}
                            accept="image/*"
                        >
                            <Button size="small" icon={<PictureOutlined />}>
                                Galería
                            </Button>
                        </Upload>
                    </div>
                </div>
            ) : (
                <>
                    <div className="w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center mb-4 relative shadow-inner text-4xl text-gray-400">
                        {icon}
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                        <Upload
                            beforeUpload={handleBeforeUpload}
                            showUploadList={false}
                            accept="image/*"
                            capture="environment"
                        >
                            <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                Cámara
                            </Button>
                        </Upload>
                        <Upload
                            beforeUpload={handleBeforeUpload}
                            showUploadList={false}
                            accept="image/*"
                        >
                            <Button size="small" icon={<PictureOutlined />}>
                                Galería
                            </Button>
                        </Upload>
                    </div>
                    <p className="text-gray-400 text-xs mt-2 mb-0">Max: 4MB</p>
                </>
            )}
        </div>
    );
});

export default AppUpload;
