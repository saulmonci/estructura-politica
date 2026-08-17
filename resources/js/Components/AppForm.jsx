import React, { useState, useEffect } from 'react';
import { ProForm } from '@ant-design/pro-components';
import { message, Skeleton } from 'antd';
import { router } from '@inertiajs/react';
import axios from 'axios';

/**
 * AppForm
 * 
 * Un contenedor (wrapper) sobre ProForm que centraliza el envío de datos a Laravel a través de Inertia.
 * Intercepta los errores de validación HTTP 422 de Laravel y los pinta directamente en los campos del formulario.
 * Envía la data siempre como `forceFormData: true` para soportar la subida de archivos de manera nativa.
 * 
 * Props:
 * @param {Object} form - La instancia de Form (Form.useForm())
 * @param {string} endpoint - La URL de destino en Laravel (ej: '/presidentes')
 * @param {string} method - Método HTTP, 'POST' o 'PUT' (por defecto 'POST')
 * @param {Function} beforeSubmit - (Opcional) Callback donde puedes modificar los datos antes de enviarlos
 * @param {Function} onSuccess - Callback al recibir respuesta exitosa (ideal para cerrar modales)
 * @param {Function} onError - Callback en caso de error
 * @param {string} successMessage - Mensaje de éxito a mostrar (default: 'Guardado correctamente')
 * @param {string} errorMessage - Mensaje de error a mostrar (default: 'Por favor revisa los campos en rojo')
 * @param {string} submitText - Texto del botón de enviar (default: 'Guardar')
 * @param {string} cancelText - Texto del botón de cancelar (default: 'Cancelar')
 * @param {Function} onCancel - Callback al hacer clic en cancelar
 * @param {boolean|Object} submitter - Configuración de los botones de ProForm
 * @param {string} fetchUrl - (Opcional) URL para cargar datos automáticamente y rellenar el formulario
 * @param {Function} onDataFetched - (Opcional) Callback ejecutado al terminar la autocarga, recibe los datos descargados
 * @param {Function} modalClose - (Opcional) Función `close` inyectada por el render prop de AppModal para cerrar automáticamente
 */
export default function AppForm({
    form,
    endpoint,
    method = 'POST',
    beforeSubmit,
    onSuccess,
    onError,
    successMessage = 'Guardado correctamente',
    errorMessage = 'Por favor revisa los campos en rojo',
    submitText = 'Guardar',
    cancelText = 'Cancelar',
    onCancel,
    submitter,
    fetchUrl,
    onDataFetched,
    modalClose,
    children,
    ...proFormProps
}) {
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        if (fetchUrl) {
            setLoadingData(true);
            axios.get(fetchUrl)
                .then(response => {
                    const data = response.data;
                    form.setFieldsValue(data);
                    if (onDataFetched) {
                        onDataFetched(data);
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    message.error('No se pudo cargar la información del registro.');
                    if (onCancel) onCancel();
                })
                .finally(() => {
                    setLoadingData(false);
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchUrl, form]);

    const handleFinish = async (rawValues) => {
        return new Promise((resolve) => {
            let finalValues = { ...rawValues };
            
            if (beforeSubmit) {
                const transformed = beforeSubmit(finalValues);
                if (transformed) {
                    finalValues = transformed;
                }
            }

            if (method.toUpperCase() === 'PUT') {
                finalValues._method = 'PUT';
            }

            const handleSuccess = () => {
                message.success(successMessage);
                if (modalClose) modalClose();
                if (onSuccess) onSuccess();
                resolve(true);
            };

            const handleErrors = (errors) => {
                if (errors) {
                    const fieldErrors = Object.keys(errors).map((key) => ({
                        name: key,
                        errors: Array.isArray(errors[key]) ? errors[key] : [errors[key]],
                    }));
                    form.setFields(fieldErrors);
                }
                message.error(errorMessage);
                if (onError) onError(errors);
                resolve(false);
            };

            if (proFormProps.apiMode) {
                // Modo API: Usar Axios
                const isMultipart = finalValues instanceof FormData || Object.values(finalValues).some(v => v instanceof File || v instanceof Blob);
                
                let dataToSend = finalValues;
                if (isMultipart && !(finalValues instanceof FormData)) {
                    dataToSend = new FormData();
                    Object.keys(finalValues).forEach(key => {
                        if (finalValues[key] !== undefined && finalValues[key] !== null) {
                            dataToSend.append(key, finalValues[key]);
                        }
                    });
                }

                axios.post(endpoint, dataToSend, {
                    headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : {}
                })
                    .then(response => {
                        if (response.data.success || response.status === 200 || response.status === 201) {
                            handleSuccess();
                        } else {
                            handleErrors(response.data.errors);
                        }
                    })
                    .catch(error => {
                        handleErrors(error.response?.data?.errors);
                    });
            } else {
                // Modo Inertia (Default)
                router.post(endpoint, finalValues, {
                    forceFormData: true,
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: handleSuccess,
                    onError: handleErrors,
                });
            }
        });
    };

    // Configuración por defecto del submitter (botones alineados a la derecha)
    const defaultSubmitter = {
        searchConfig: {
            submitText,
            resetText: cancelText,
        },
        onReset: () => {
            if (modalClose) modalClose();
            if (onCancel) onCancel();
        },
        render: (props, doms) => {
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                    {doms[0]} {/* Cancelar */}
                    {doms[1]} {/* Guardar */}
                </div>
            );
        },
    };

    return (
        <ProForm
            form={form}
            onFinish={handleFinish}
            submitter={submitter !== undefined ? submitter : defaultSubmitter}
            {...proFormProps}
        >
            <Skeleton active loading={loadingData}>
                {children}
            </Skeleton>
        </ProForm>
    );
}
