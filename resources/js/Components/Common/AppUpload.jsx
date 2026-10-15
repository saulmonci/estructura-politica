import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { Button, Progress, Modal, Image, Input, Space, Tooltip, Typography, Spin, message } from 'antd';
import {
    CameraOutlined,
    PictureOutlined,
    DeleteOutlined,
    EyeOutlined,
    UploadOutlined,
    LinkOutlined,
    LoadingOutlined,
    UserOutlined,
    IdcardOutlined,
    FileOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    InboxOutlined,
    CheckCircleOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import imageCompression from 'browser-image-compression';

const { Text } = Typography;

/**
 * Función utilitaria para formatear bytes a tamaño legible (KB, MB).
 */
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Detecta si una cadena o archivo corresponde a un tipo imagen.
 */
export function isImageFile(fileOrUrl) {
    if (!fileOrUrl) return false;
    if (typeof fileOrUrl === 'string') {
        const cleanUrl = fileOrUrl.split('?')[0].toLowerCase();
        return (
            cleanUrl.endsWith('.jpg') ||
            cleanUrl.endsWith('.jpeg') ||
            cleanUrl.endsWith('.png') ||
            cleanUrl.endsWith('.webp') ||
            cleanUrl.endsWith('.gif') ||
            cleanUrl.endsWith('.svg') ||
            cleanUrl.startsWith('data:image/') ||
            cleanUrl.startsWith('blob:')
        );
    }
    if (fileOrUrl instanceof File || fileOrUrl?.type) {
        return fileOrUrl.type.startsWith('image/');
    }
    return false;
}

/**
 * Detecta si una cadena o archivo corresponde a un PDF.
 */
export function isPdfFile(fileOrUrl) {
    if (!fileOrUrl) return false;
    if (typeof fileOrUrl === 'string') {
        const cleanUrl = fileOrUrl.split('?')[0].toLowerCase();
        return cleanUrl.endsWith('.pdf') || cleanUrl.startsWith('data:application/pdf');
    }
    if (fileOrUrl instanceof File || fileOrUrl?.type) {
        return fileOrUrl.type === 'application/pdf';
    }
    return false;
}

/**
 * AppUpload - Componente Autónomo de Carga de Archivos e Imágenes
 *
 * Escenarios y Capacidades Soportadas:
 * 1. Modos de Operación:
 *    - Inmediato (endpoint): Sube el archivo inmediatamente al endpoint vía axios con barra de progreso.
 *    - Diferido (deferred): Retiene el File localmente para enviarse con multipart/form-data en submit.
 *    - Enlace Directo (URL): Permite ingresar o precargar una URL existente (S3, CDN, /storage/...).
 * 2. Variantes Visuales:
 *    - 'avatar': Fotos de perfil circulares o cuadradas con hover overlay y botones directos.
 *    - 'card': Credenciales y documentos rectangulares (aspect ratio 16/9 o credit-card para INE).
 *    - 'dragger': Área de arrastrar y soltar (drag & drop) para archivos generales.
 *    - 'button': Botón compacto con badge/tag del archivo.
 * 3. Captura Móvil Dual:
 *    - Botón "Cámara" con capture="environment" para abrir la cámara trasera en smartphones/tablets.
 *    - Botón "Galería" para seleccionar del explorador de fotos.
 * 4. Compresión y Optimización:
 *    - Integrado con browser-image-compression para optimizar fotos pesadas de celulares (12MB -> <1MB).
 * 5. Control Imperativo:
 *    - openCamera(), openGallery(), clear(), getFile(), getUrl(), upload().
 * 6. Integración Form.Item / AppForm:
 *    - Totalmente controlado vía `value` y `onChange`.
 */
const AppUpload = forwardRef(
    (
        {
            value,
            onChange,
            endpoint,
            method = 'post',
            name = 'file',
            extraData = {},
            headers = {},
            responseTransform,
            deleteEndpoint,
            variant = 'card', // 'avatar' | 'card' | 'dragger' | 'button'
            shape = 'square', // 'circle' | 'square' (para variant="avatar")
            size = 110, // tamaño en px para avatar o dimensiones base
            aspectRatio = '16/9', // para variant="card" ('16/9', 'credit-card', '4/3', o ratio css)
            title, // Título descriptivo (ej. "INE FRENTE")
            placeholderIcon,
            helperText,
            accept = 'image/*',
            maxSizeMB = 5,
            showCamera = true,
            showGallery = true,
            allowUrlInput = false,
            compress = true,
            compressOptions = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            },
            validateFile,
            beforeUpload,
            disabled = false,
            className = '',
            style = {},
            children,
        },
        ref
    ) => {
        // Estado interno
        const [currentFile, setCurrentFile] = useState(null);
        const [previewUrl, setPreviewUrl] = useState(null);
        const [isBlobUrl, setIsBlobUrl] = useState(false);
        const [uploading, setUploading] = useState(false);
        const [compressing, setCompressing] = useState(false);
        const [progress, setProgress] = useState(0);
        const [urlModalVisible, setUrlModalVisible] = useState(false);
        const [tempInputUrl, setTempInputUrl] = useState('');
        const [previewVisible, setPreviewVisible] = useState(false);

        // Referencias a los inputs de subida ocultos
        const cameraInputRef = useRef(null);
        const galleryInputRef = useRef(null);
        const fileInputRef = useRef(null);

        // Limpieza de Object URLs para evitar memory leaks
        const revokeCurrentBlob = useCallback(() => {
            if (isBlobUrl && previewUrl && previewUrl.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(previewUrl);
                } catch {
                    // Ignorar error al revocar
                }
            }
        }, [isBlobUrl, previewUrl]);

        // Sincronización con el prop `value` externo (controlado por Form / AppForm)
        useEffect(() => {
            if (!value) {
                revokeCurrentBlob();
                setCurrentFile(null);
                setPreviewUrl(null);
                setIsBlobUrl(false);
                return;
            }

            if (typeof value === 'string') {
                // Es una URL o ruta relativa en storage
                revokeCurrentBlob();
                setCurrentFile(null);
                let resolved = value;
                if (
                    resolved &&
                    !resolved.startsWith('http://') &&
                    !resolved.startsWith('https://') &&
                    !resolved.startsWith('/') &&
                    !resolved.startsWith('data:') &&
                    !resolved.startsWith('blob:')
                ) {
                    resolved = `/storage/${resolved}`;
                }
                setPreviewUrl(resolved);
                setIsBlobUrl(false);
            } else if (value instanceof File || value?.originFileObj instanceof File) {
                const fileObj = value instanceof File ? value : value.originFileObj;
                if (fileObj !== currentFile) {
                    revokeCurrentBlob();
                    setCurrentFile(fileObj);
                    const newBlob = URL.createObjectURL(fileObj);
                    setPreviewUrl(newBlob);
                    setIsBlobUrl(true);
                }
            } else if (typeof value === 'object' && value.url) {
                revokeCurrentBlob();
                setCurrentFile(null);
                let resolved = value.url;
                if (
                    resolved &&
                    !resolved.startsWith('http://') &&
                    !resolved.startsWith('https://') &&
                    !resolved.startsWith('/') &&
                    !resolved.startsWith('data:') &&
                    !resolved.startsWith('blob:')
                ) {
                    resolved = `/storage/${resolved}`;
                }
                setPreviewUrl(resolved);
                setIsBlobUrl(false);
            }
        }, [value]);

        // Limpieza al desmontar
        useEffect(() => {
            return () => {
                revokeCurrentBlob();
            };
        }, [revokeCurrentBlob]);

        /**
         * Ejecuta la subida asíncrona hacia el endpoint
         */
        const uploadToEndpoint = async (fileToUpload) => {
            if (!endpoint) return null;

            setUploading(true);
            setProgress(0);

            try {
                const formData = new FormData();
                formData.append(name, fileToUpload);

                if (extraData && typeof extraData === 'object') {
                    Object.entries(extraData).forEach(([k, v]) => {
                        if (v !== undefined && v !== null) {
                            formData.append(k, v);
                        }
                    });
                }

                const res = await axios({
                    method,
                    url: endpoint,
                    data: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...headers,
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setProgress(percent);
                        }
                    },
                });

                let extractedUrl = null;
                if (typeof responseTransform === 'function') {
                    extractedUrl = responseTransform(res);
                } else if (res.data) {
                    extractedUrl =
                        res.data.url ||
                        res.data.path ||
                        res.data.file_url ||
                        res.data.foto_url ||
                        res.data.src ||
                        (typeof res.data === 'string' ? res.data : null);
                }

                if (!extractedUrl) {
                    extractedUrl = URL.createObjectURL(fileToUpload);
                }

                revokeCurrentBlob();
                setCurrentFile(fileToUpload);
                setPreviewUrl(extractedUrl);
                setIsBlobUrl(false);

                message.success('Archivo cargado exitosamente');
                onChange?.(extractedUrl, fileToUpload, res);
                return extractedUrl;
            } catch (err) {
                console.error('AppUpload: Error al subir archivo:', err);
                const errMsg =
                    err.response?.data?.message || err.response?.data?.error || 'Error al subir el archivo al servidor';
                message.error(errMsg);
                throw err;
            } finally {
                setUploading(false);
            }
        };

        /**
         * Procesador principal del archivo seleccionado
         */
        const processFile = async (rawFile) => {
            if (!rawFile) return;

            // 1. Validación de tamaño
            const sizeInMB = rawFile.size / (1024 * 1024);
            if (sizeInMB > maxSizeMB) {
                message.error(`El archivo excede el tamaño máximo permitido de ${maxSizeMB}MB.`);
                return;
            }

            // 2. Validación personalizada del consumidor
            const customValidate = validateFile || beforeUpload;
            if (typeof customValidate === 'function') {
                const validationResult = await customValidate(rawFile);
                if (validationResult === false) return;
                if (typeof validationResult === 'string') {
                    message.error(validationResult);
                    return;
                }
            }

            let finalFile = rawFile;

            // 3. Compresión opcional de imágenes
            if (compress && isImageFile(rawFile) && rawFile.type !== 'image/svg+xml') {
                try {
                    setCompressing(true);
                    finalFile = await imageCompression(rawFile, compressOptions);
                } catch (compressionErr) {
                    console.warn('AppUpload: Falló la compresión en cliente, usando archivo original:', compressionErr);
                    finalFile = rawFile;
                } finally {
                    setCompressing(false);
                }
            }

            // 4. Si hay endpoint, subir inmediatamente
            if (endpoint) {
                await uploadToEndpoint(finalFile);
            } else {
                // Modo diferido (retener File local y crear ObjectURL)
                revokeCurrentBlob();
                const newBlob = URL.createObjectURL(finalFile);
                setCurrentFile(finalFile);
                setPreviewUrl(newBlob);
                setIsBlobUrl(true);
                onChange?.(finalFile);
            }
        };

        /**
         * Limpieza / Eliminación del archivo actual
         */
        const handleClear = async (e) => {
            e?.stopPropagation();
            if (disabled || uploading || compressing) return;

            // Si hay deleteEndpoint y existía una URL previa
            if (deleteEndpoint && previewUrl && !isBlobUrl) {
                try {
                    if (typeof deleteEndpoint === 'function') {
                        await deleteEndpoint(previewUrl);
                    } else {
                        await axios.delete(deleteEndpoint, {
                            data: { url: previewUrl },
                        });
                    }
                } catch (delErr) {
                    console.warn('AppUpload: Error al notificar eliminación en backend:', delErr);
                }
            }

            revokeCurrentBlob();
            setCurrentFile(null);
            setPreviewUrl(null);
            setIsBlobUrl(false);
            setProgress(0);
            onChange?.(null);
        };

        /**
         * Manejador de asignación directa por URL
         */
        const handleApplyUrl = () => {
            const trimmed = tempInputUrl.trim();
            if (!trimmed) {
                message.warning('Por favor ingresa una URL válida');
                return;
            }

            revokeCurrentBlob();
            setCurrentFile(null);
            setPreviewUrl(trimmed);
            setIsBlobUrl(false);
            setUrlModalVisible(false);
            setTempInputUrl('');
            onChange?.(trimmed);
            message.success('URL asignada correctamente');
        };

        // Disparadores de selección
        const triggerCamera = () => {
            if (disabled) return;
            cameraInputRef.current?.click();
        };

        const triggerGallery = () => {
            if (disabled) return;
            galleryInputRef.current?.click();
        };

        const triggerGeneralFile = () => {
            if (disabled) return;
            fileInputRef.current?.click();
        };

        // Métodos expuestos al ref padre
        useImperativeHandle(ref, () => ({
            openCamera: triggerCamera,
            openGallery: triggerGallery,
            openUrlInput: () => setUrlModalVisible(true),
            clear: handleClear,
            getFile: () => currentFile,
            getUrl: () => previewUrl,
            upload: () => {
                if (currentFile && endpoint) {
                    return uploadToEndpoint(currentFile);
                }
                return Promise.resolve(previewUrl);
            },
            setValue: (newVal) => {
                if (typeof newVal === 'string') {
                    revokeCurrentBlob();
                    setCurrentFile(null);
                    setPreviewUrl(newVal);
                    setIsBlobUrl(false);
                } else if (newVal instanceof File) {
                    processFile(newVal);
                } else if (!newVal) {
                    handleClear();
                }
            },
        }));

        // Inputs nativos ocultos para Cámara, Galería y Selección general
        const hiddenInputs = (
            <div style={{ display: 'none' }} aria-hidden="true">
                <input
                    type="file"
                    ref={cameraInputRef}
                    accept={accept}
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processFile(file);
                        e.target.value = '';
                    }}
                />
                <input
                    type="file"
                    ref={galleryInputRef}
                    accept={accept}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processFile(file);
                        e.target.value = '';
                    }}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    accept={accept}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processFile(file);
                        e.target.value = '';
                    }}
                />
            </div>
        );

        // Modal para entrada de URL
        const urlInputModal = allowUrlInput && (
            <Modal
                title="Cargar archivo por URL"
                open={urlModalVisible}
                onOk={handleApplyUrl}
                onCancel={() => {
                    setUrlModalVisible(false);
                    setTempInputUrl('');
                }}
                okText="Cargar"
                cancelText="Cancelar"
                centered
            >
                <div className="py-2">
                    <p className="mb-2 text-sm text-gray-500">
                        Pega el enlace directo a la imagen o documento público (https://...):
                    </p>
                    <Input
                        prefix={<LinkOutlined className="text-gray-400" />}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        value={tempInputUrl}
                        onChange={(e) => setTempInputUrl(e.target.value)}
                        onPressEnter={handleApplyUrl}
                    />
                </div>
            </Modal>
        );

        // Renderizado personalizado si se proporciona children como función
        if (typeof children === 'function') {
            return (
                <div className={`app-upload-custom ${className}`} style={style}>
                    {hiddenInputs}
                    {urlInputModal}
                    {children({
                        file: currentFile,
                        previewUrl,
                        isBlobUrl,
                        uploading,
                        compressing,
                        progress,
                        openCamera: triggerCamera,
                        openGallery: triggerGallery,
                        openUrlInput: () => setUrlModalVisible(true),
                        clear: handleClear,
                        disabled,
                    })}
                </div>
            );
        }

        // ==========================================
        // VARIANTE: AVATAR (Fotos de perfil)
        // ==========================================
        if (variant === 'avatar') {
            const isCircle = shape === 'circle';
            const borderRadius = isCircle ? '50%' : '12px';

            return (
                <div className={`app-upload-avatar flex flex-col items-center ${className}`} style={style}>
                    {hiddenInputs}
                    {urlInputModal}

                    <div
                        className="group relative flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-100 shadow-inner transition-all hover:border-blue-500"
                        style={{
                            width: size,
                            height: size,
                            borderRadius,
                        }}
                    >
                        {uploading || compressing ? (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                                <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} spin />} />
                                {uploading && (
                                    <div className="mt-2 w-full px-2">
                                        <Progress percent={progress} size="small" showInfo={false} />
                                    </div>
                                )}
                                <span className="mt-1 text-[11px] font-medium text-gray-500">
                                    {compressing ? 'Optimizando...' : `${progress}%`}
                                </span>
                            </div>
                        ) : previewUrl ? (
                            <>
                                <Image
                                    src={previewUrl}
                                    alt="Avatar"
                                    width={size}
                                    height={size}
                                    style={{
                                        objectFit: 'cover',
                                        borderRadius,
                                    }}
                                    preview={{
                                        visible: previewVisible,
                                        onVisibleChange: setPreviewVisible,
                                    }}
                                />
                                {!disabled && (
                                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                                        <Tooltip title="Ver grande">
                                            <Button
                                                type="text"
                                                shape="circle"
                                                size="small"
                                                icon={<EyeOutlined className="text-white" />}
                                                onClick={() => setPreviewVisible(true)}
                                            />
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <Button
                                                type="text"
                                                shape="circle"
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined className="text-red-400" />}
                                                onClick={handleClear}
                                            />
                                        </Tooltip>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                {placeholderIcon || <UserOutlined style={{ fontSize: Math.max(28, size * 0.4) }} />}
                            </div>
                        )}
                    </div>

                    {!disabled && (
                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                            {showCamera && (
                                <Button
                                    size="small"
                                    type="primary"
                                    className="bg-[#0f172a] hover:bg-slate-800"
                                    icon={<CameraOutlined />}
                                    onClick={triggerCamera}
                                    loading={uploading || compressing}
                                >
                                    Cámara
                                </Button>
                            )}
                            {showGallery && (
                                <Button
                                    size="small"
                                    icon={<PictureOutlined />}
                                    onClick={triggerGallery}
                                    loading={uploading || compressing}
                                >
                                    Galería
                                </Button>
                            )}
                            {allowUrlInput && (
                                <Button
                                    size="small"
                                    icon={<LinkOutlined />}
                                    onClick={() => setUrlModalVisible(true)}
                                    title="Cargar por URL"
                                />
                            )}
                            {previewUrl && (
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={handleClear}
                                    title="Quitar foto"
                                />
                            )}
                        </div>
                    )}
                    {helperText && <p className="mt-1 mb-0 text-center text-xs text-gray-400">{helperText}</p>}
                </div>
            );
        }

        // ==========================================
        // VARIANTE: CARD (INE Frente / Reverso, etc.)
        // ==========================================
        if (variant === 'card') {
            const ratioStyle =
                aspectRatio === 'credit-card'
                    ? { aspectRatio: '85.6 / 53.98' }
                    : aspectRatio === '16/9'
                      ? { aspectRatio: '16 / 9' }
                      : { aspectRatio };

            return (
                <div
                    className={`app-upload-card flex flex-col items-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-center transition-colors hover:border-blue-400 ${className}`}
                    style={style}
                >
                    {hiddenInputs}
                    {urlInputModal}

                    {title && (
                        <span className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">{title}</span>
                    )}

                    <div
                        className="relative flex w-full max-w-[260px] items-center justify-center overflow-hidden rounded-lg bg-gray-200 shadow-inner"
                        style={ratioStyle}
                    >
                        {uploading || compressing ? (
                            <div className="flex w-full flex-col items-center justify-center p-3">
                                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                                <span className="mt-2 text-xs font-medium text-gray-600">
                                    {compressing ? 'Optimizando imagen...' : 'Subiendo al servidor...'}
                                </span>
                                {uploading && (
                                    <div className="mt-1 w-3/4">
                                        <Progress percent={progress} size="small" />
                                    </div>
                                )}
                            </div>
                        ) : previewUrl ? (
                            isPdfFile(previewUrl) ? (
                                <div className="flex h-full w-full flex-col items-center justify-center bg-red-50/60 p-3 text-red-500">
                                    <FilePdfOutlined className="mb-1 text-4xl text-red-500" />
                                    <span className="max-w-[200px] truncate text-xs font-semibold text-gray-700">
                                        {currentFile?.name || 'Documento PDF'}
                                    </span>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 text-xs text-blue-600 hover:underline"
                                    >
                                        Abrir documento
                                    </a>
                                </div>
                            ) : (
                                <div className="relative h-full w-full">
                                    <Image
                                        src={previewUrl}
                                        alt={title || 'Documento'}
                                        width="100%"
                                        height="100%"
                                        style={{
                                            objectFit: 'cover',
                                        }}
                                        className="rounded-lg shadow-sm"
                                        preview={{
                                            visible: previewVisible,
                                            onVisibleChange: setPreviewVisible,
                                        }}
                                    />
                                    <div className="absolute top-1 right-1 flex items-center gap-1">
                                        <Tooltip title="Previsualizar">
                                            <Button
                                                type="primary"
                                                size="small"
                                                shape="circle"
                                                icon={<EyeOutlined />}
                                                className="bg-black/60 backdrop-blur-xs"
                                                onClick={() => setPreviewVisible(true)}
                                            />
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center p-4 text-gray-400">
                                {placeholderIcon || <IdcardOutlined className="text-4xl text-gray-400" />}
                                <span className="mt-1 text-[11px] text-gray-400">Sin archivo seleccionado</span>
                            </div>
                        )}
                    </div>

                    {!disabled && (
                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                            {previewUrl ? (
                                <>
                                    {showCamera && (
                                        <Button
                                            size="small"
                                            icon={<CameraOutlined />}
                                            onClick={triggerCamera}
                                            loading={uploading || compressing}
                                        >
                                            Reemplazar
                                        </Button>
                                    )}
                                    {!showCamera && showGallery && (
                                        <Button
                                            size="small"
                                            icon={<PictureOutlined />}
                                            onClick={triggerGallery}
                                            loading={uploading || compressing}
                                        >
                                            Reemplazar
                                        </Button>
                                    )}
                                    <Button size="small" danger icon={<DeleteOutlined />} onClick={handleClear}>
                                        Eliminar
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {showCamera && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            className="bg-[#0f172a] hover:bg-slate-800"
                                            icon={<CameraOutlined />}
                                            onClick={triggerCamera}
                                            loading={uploading || compressing}
                                        >
                                            Cámara
                                        </Button>
                                    )}
                                    {showGallery && (
                                        <Button
                                            size="small"
                                            icon={<PictureOutlined />}
                                            onClick={triggerGallery}
                                            loading={uploading || compressing}
                                        >
                                            Galería
                                        </Button>
                                    )}
                                    {allowUrlInput && (
                                        <Button
                                            size="small"
                                            icon={<LinkOutlined />}
                                            onClick={() => setUrlModalVisible(true)}
                                            title="Cargar por URL"
                                        >
                                            URL
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <p className="mt-2 mb-0 text-xs text-gray-400">
                        {helperText || `Máx: ${maxSizeMB}MB • Formato: JPG, PNG`}
                    </p>
                </div>
            );
        }

        // ==========================================
        // VARIANTE: DRAGGER (Arrastrar y soltar)
        // ==========================================
        if (variant === 'dragger') {
            return (
                <div className={`app-upload-dragger w-full ${className}`} style={style}>
                    {hiddenInputs}
                    {urlInputModal}

                    {previewUrl ? (
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {isImageFile(previewUrl) ? (
                                    <Image
                                        src={previewUrl}
                                        alt="Preview"
                                        width={48}
                                        height={48}
                                        className="rounded-lg object-cover"
                                        preview={{
                                            visible: previewVisible,
                                            onVisibleChange: setPreviewVisible,
                                        }}
                                    />
                                ) : isPdfFile(previewUrl) ? (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-2xl text-red-600">
                                        <FilePdfOutlined />
                                    </div>
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-2xl text-blue-600">
                                        <FileTextOutlined />
                                    </div>
                                )}
                                <div className="truncate">
                                    <div className="truncate text-sm font-medium text-gray-800">
                                        {currentFile?.name ||
                                            (typeof previewUrl === 'string' ? previewUrl.split('/').pop() : 'Archivo')}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {currentFile ? formatFileSize(currentFile.size) : 'Enlace en la nube'}
                                    </div>
                                </div>
                            </div>

                            <Space>
                                <Button
                                    type="text"
                                    icon={<EyeOutlined />}
                                    onClick={() => {
                                        if (isImageFile(previewUrl)) {
                                            setPreviewVisible(true);
                                        } else if (typeof previewUrl === 'string') {
                                            window.open(previewUrl, '_blank');
                                        }
                                    }}
                                />
                                {!disabled && (
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={handleClear} />
                                )}
                            </Space>
                        </div>
                    ) : (
                        <div
                            onClick={triggerGeneralFile}
                            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20 ${
                                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            }`}
                        >
                            {uploading || compressing ? (
                                <div className="flex flex-col items-center">
                                    <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
                                    <span className="mt-3 text-sm font-medium text-gray-600">
                                        {compressing ? 'Comprimiendo archivo...' : 'Subiendo archivo...'}
                                    </span>
                                    {uploading && (
                                        <div className="mt-2 w-48">
                                            <Progress percent={progress} size="small" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="mb-2 text-4xl text-blue-500">
                                        {placeholderIcon || <InboxOutlined />}
                                    </div>
                                    <p className="mb-1 text-sm font-semibold text-gray-700">
                                        {title || 'Haz clic o arrastra un archivo aquí para subirlo'}
                                    </p>
                                    <p className="mb-3 text-xs text-gray-400">
                                        {helperText || `Tamaño máximo: ${maxSizeMB}MB`}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            size="small"
                                            type="primary"
                                            className="bg-[#0f172a]"
                                            icon={<UploadOutlined />}
                                        >
                                            Seleccionar archivo
                                        </Button>
                                        {allowUrlInput && (
                                            <Button
                                                size="small"
                                                icon={<LinkOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUrlModalVisible(true);
                                                }}
                                            >
                                                Desde URL
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // ==========================================
        // VARIANTE: BUTTON (Compacto)
        // ==========================================
        return (
            <div className={`app-upload-button inline-flex items-center gap-2 ${className}`} style={style}>
                {hiddenInputs}
                {urlInputModal}

                {previewUrl ? (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1">
                        {isImageFile(previewUrl) && (
                            <Image
                                src={previewUrl}
                                width={24}
                                height={24}
                                className="rounded object-cover"
                                preview={{
                                    visible: previewVisible,
                                    onVisibleChange: setPreviewVisible,
                                }}
                            />
                        )}
                        <span className="max-w-[140px] truncate text-xs font-medium text-gray-700">
                            {currentFile?.name ||
                                (typeof previewUrl === 'string' ? previewUrl.split('/').pop() : 'Archivo')}
                        </span>
                        <Button
                            type="text"
                            size="small"
                            shape="circle"
                            icon={<EyeOutlined />}
                            onClick={() => {
                                if (isImageFile(previewUrl)) {
                                    setPreviewVisible(true);
                                } else if (typeof previewUrl === 'string') {
                                    window.open(previewUrl, '_blank');
                                }
                            }}
                        />
                        {!disabled && (
                            <Button
                                type="text"
                                size="small"
                                shape="circle"
                                danger
                                icon={<CloseOutlined className="text-xs" />}
                                onClick={handleClear}
                            />
                        )}
                    </div>
                ) : (
                    <Space size="small">
                        <Button
                            icon={uploading || compressing ? <LoadingOutlined /> : <UploadOutlined />}
                            onClick={triggerGeneralFile}
                            disabled={disabled || uploading || compressing}
                            loading={uploading || compressing}
                        >
                            {title || 'Adjuntar archivo'}
                        </Button>
                        {allowUrlInput && (
                            <Tooltip title="Cargar por URL">
                                <Button
                                    icon={<LinkOutlined />}
                                    onClick={() => setUrlModalVisible(true)}
                                    disabled={disabled || uploading || compressing}
                                />
                            </Tooltip>
                        )}
                    </Space>
                )}
            </div>
        );
    }
);

AppUpload.displayName = 'AppUpload';

export default AppUpload;
