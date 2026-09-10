import React, { useEffect, useRef, useState } from 'react';
import { Modal, Upload, Button, message, Alert, Space } from 'antd';
import { InboxOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const { Dragger } = Upload;

/**
 * Modal reusable para subir un archivo GeoJSON y asignarlo como geometría
 * de una demarcación o sección electoral, con preview en Leaflet antes de confirmar.
 */
export default function GeomUploadModal({ open, onClose, endpoint, resourceLabel, onSuccess }) {
    const [file, setFile] = useState(null);
    const [parsedGeoJson, setParsedGeoJson] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const [uploading, setUploading] = useState(false);

    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    const resetState = () => {
        setFile(null);
        setParsedGeoJson(null);
        setPreviewError(null);
        setUploading(false);
    };

    const handleClose = () => {
        resetState();
        onClose?.();
    };

    const beforeUpload = (selectedFile) => {
        setPreviewError(null);
        setParsedGeoJson(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                setParsedGeoJson(data);
                setFile(selectedFile);
            } catch (err) {
                setPreviewError('El archivo no contiene un JSON válido.');
                setFile(null);
            }
        };
        reader.onerror = () => {
            setPreviewError('No se pudo leer el archivo.');
            setFile(null);
        };
        reader.readAsText(selectedFile);

        return false; // evitar auto-upload de AntD, se envía manualmente al confirmar
    };

    useEffect(() => {
        if (!open || !parsedGeoJson || !mapRef.current) {
            return;
        }

        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }

        const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
        mapInstance.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        try {
            const layer = L.geoJSON(parsedGeoJson, {
                style: { color: '#0f172a', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.35 },
            }).addTo(map);

            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [16, 16] });
            } else {
                map.setView([20.8, -105.25], 11);
                setPreviewError('El archivo es JSON válido pero no se pudo interpretar como geometría geográfica.');
            }
        } catch (err) {
            map.setView([20.8, -105.25], 11);
            setPreviewError('El archivo es JSON válido pero no se pudo interpretar como geometría geográfica.');
        }

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, [open, parsedGeoJson]);

    const handleConfirm = async () => {
        if (!file) {
            message.error('Selecciona primero un archivo GeoJSON.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('geojson', file);

            const response = await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data?.success) {
                message.success(response.data.message || 'Geometría actualizada exitosamente.');
                onSuccess?.();
                handleClose();
            } else {
                message.error(response.data?.message || 'No se pudo guardar la geometría.');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Ocurrió un error al subir la geometría.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={handleClose}
            destroyOnClose
            width={720}
            title={`Subir capa geográfica${resourceLabel ? ` · ${resourceLabel}` : ''}`}
            footer={[
                <Button key="cancel" onClick={handleClose} icon={<CloseOutlined />}>
                    Cancelar
                </Button>,
                <Button
                    key="confirm"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={uploading}
                    disabled={!file || !!previewError}
                    onClick={handleConfirm}
                    className="bg-[#0f172a]"
                >
                    Confirmar y guardar
                </Button>,
            ]}
        >
            <Space direction="vertical" size="middle" className="w-full">
                <Dragger
                    accept=".geojson,.json"
                    maxCount={1}
                    showUploadList={{ showRemoveIcon: false }}
                    beforeUpload={beforeUpload}
                    onRemove={() => {
                        setFile(null);
                        setParsedGeoJson(null);
                        setPreviewError(null);
                    }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Haz clic o arrastra aquí un archivo .geojson</p>
                    <p className="ant-upload-hint">
                        Acepta un Feature, FeatureCollection (con un solo feature) o una Geometry directa. Máximo 5 MB.
                    </p>
                </Dragger>

                {previewError && <Alert type="error" message={previewError} showIcon />}

                {parsedGeoJson && !previewError && (
                    <div
                        ref={mapRef}
                        style={{ height: 320, width: '100%', borderRadius: 8, overflow: 'hidden' }}
                        className="border border-gray-200"
                    />
                )}
            </Space>
        </Modal>
    );
}
