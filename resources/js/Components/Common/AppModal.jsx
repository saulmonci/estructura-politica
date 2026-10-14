import React, { useState, forwardRef, useImperativeHandle, createContext, useContext, useCallback } from 'react';
import { Modal, Button, Spin } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';

export const AppModalContext = createContext(null);

export const useAppModalContext = () => {
    const context = useContext(AppModalContext);
    if (!context) {
        throw new Error('useAppModalContext debe usarse dentro de un <AppModal>');
    }
    return context;
};

/**
 * AppModal - Componente Wrapper para Modales
 *
 * Características:
 * 1. Control imperativo con `ref` (useImperativeHandle): `modalRef.current.open(data)` y `modalRef.current.close()`.
 *    Elimina la necesidad de declarar múltiples `useState` de apertura y datos en el componente padre.
 * 2. Soporta Render Props: `children` puede ser una función `({ data, close, loading, setLoading }) => JSX`.
 * 3. Provee `AppModalContext` para que los componentes hijos profundos accedan a helpers sin prop-drilling.
 * 4. Gestiona internamente el estado de carga (`loading`), payload (`data`) y títulos dinámicos.
 */
const AppModal = forwardRef(
    (
        {
            title,
            subtitle,
            children,
            footer,
            onOk,
            onCancel,
            okText = 'Guardar',
            cancelText = 'Cancelar',
            showOk = false,
            showCancel = true,
            okButtonProps = {},
            cancelButtonProps = {},
            headerBanner = false,
            headerIcon = null,
            width = 650,
            destroyOnClose = true,
            destroyOnHidden,
            maskClosable = false,
            centered = true,
            afterClose,
            ...modalProps
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const [data, setData] = useState(null);
        const [loading, setLoading] = useState(false);
        const [dynamicTitle, setDynamicTitle] = useState(null);
        const [dynamicSubtitle, setDynamicSubtitle] = useState(null);

        const close = useCallback(() => {
            setIsOpen(false);
        }, []);

        const open = useCallback((payload = null, options = {}) => {
            setData(payload);
            setLoading(false);
            if (options.title) setDynamicTitle(options.title);
            else setDynamicTitle(null);

            if (options.subtitle) setDynamicSubtitle(options.subtitle);
            else setDynamicSubtitle(null);

            setIsOpen(true);
        }, []);

        useImperativeHandle(
            ref,
            () => ({
                open,
                close,
                setData,
                getData: () => data,
                setLoading,
                setTitle: setDynamicTitle,
                setSubtitle: setDynamicSubtitle,
                isOpen: () => isOpen,
            }),
            [open, close, data, isOpen]
        );

        const handleCancel = useCallback(
            (e) => {
                if (onCancel) {
                    onCancel(data, { close, setLoading });
                } else {
                    close();
                }
            },
            [onCancel, data, close]
        );

        const handleOk = useCallback(async () => {
            if (!onOk) return;
            try {
                setLoading(true);
                const shouldClose = await onOk(data, { close, setLoading });
                if (shouldClose !== false) {
                    close();
                }
            } catch (error) {
                console.error('AppModal onOk error:', error);
            } finally {
                setLoading(false);
            }
        }, [onOk, data, close]);

        const contextValue = {
            data,
            setData,
            close,
            open,
            loading,
            setLoading,
            isOpen,
        };

        // Resolución de título
        const resolvedTitle = dynamicTitle || (typeof title === 'function' ? title(data) : title);
        const resolvedSubtitle = dynamicSubtitle || (typeof subtitle === 'function' ? subtitle(data) : subtitle);

        // Renderizado del footer
        const renderFooter = () => {
            if (footer === null) return null;
            if (typeof footer === 'function') {
                return footer(contextValue);
            }
            if (footer !== undefined) {
                return footer;
            }

            // Si hay onOk o showOk, renderizamos botones por defecto
            if (onOk || showOk) {
                return (
                    <div className="flex justify-end gap-2 rounded-b-lg border-t border-gray-100 bg-gray-50/50 p-3">
                        {showCancel && (
                            <Button
                                onClick={handleCancel}
                                disabled={loading}
                                icon={<CloseOutlined />}
                                {...cancelButtonProps}
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            type="primary"
                            loading={loading}
                            onClick={handleOk}
                            icon={<SaveOutlined />}
                            className="bg-[#0f172a] hover:bg-[#1e293b]"
                            {...okButtonProps}
                        >
                            {okText}
                        </Button>
                    </div>
                );
            }

            return null;
        };

        // Renderizado del contenido (soporte Render Props)
        const renderedContent = typeof children === 'function' ? children(contextValue) : children;

        // Custom Header Banner si headerBanner=true
        const modalTitle = headerBanner ? null : resolvedTitle;

        return (
            <AppModalContext.Provider value={contextValue}>
                <Modal
                    open={isOpen}
                    onCancel={handleCancel}
                    title={modalTitle}
                    footer={renderFooter()}
                    width={width}
                    destroyOnHidden={destroyOnHidden ?? destroyOnClose}
                    maskClosable={maskClosable}
                    centered={centered}
                    afterClose={() => {
                        setData(null);
                        setDynamicTitle(null);
                        setDynamicSubtitle(null);
                        setLoading(false);
                        if (afterClose) afterClose();
                    }}
                    styles={{
                        body: headerBanner ? { padding: 0 } : undefined,
                    }}
                    {...modalProps}
                >
                    {headerBanner && (
                        <div className="mb-4 flex items-center justify-between rounded-t-lg bg-[#0f172a] p-6 text-white">
                            <div className="flex items-center gap-4">
                                {headerIcon && (
                                    <div className="rounded-lg bg-white/20 p-3 text-2xl text-white">{headerIcon}</div>
                                )}
                                <div>
                                    <h2 className="m-0 text-xl font-bold tracking-wide text-white">{resolvedTitle}</h2>
                                    {resolvedSubtitle && (
                                        <p className="m-0 mt-0.5 text-sm text-gray-300">{resolvedSubtitle}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={headerBanner ? 'p-6 pt-0' : ''}>
                        {loading && !onOk && !showOk ? (
                            <Spin spinning={loading}>{renderedContent}</Spin>
                        ) : (
                            renderedContent
                        )}
                    </div>
                </Modal>
            </AppModalContext.Provider>
        );
    }
);

AppModal.displayName = 'AppModal';

export default AppModal;
