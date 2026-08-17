import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Modal } from 'antd';

/**
 * AppModal: Un envoltorio sobre el Modal de Ant Design que encapsula 
 * su estado interno (abierto/cerrado) y los datos que recibe.
 * 
 * Permite evitar el uso de múltiples `useState` en el componente padre.
 * 
 * Uso:
 * <AppModal ref={modalRef} title={(data) => `Editar ${data?.nombre}`}>
 *    {(data, close) => (
 *       <div>
 *          Contenido para {data?.nombre}
 *          <button onClick={close}>Cerrar</button>
 *       </div>
 *    )}
 * </AppModal>
 * 
 * modalRef.current.open(datos);
 */
const AppModal = forwardRef(({ children, title, footer, onCancel, ...props }, ref) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);

    useImperativeHandle(ref, () => ({
        open: (data = null, url = null) => {
            let resolvedData = data;
            if (url !== null && url !== undefined) {
                resolvedData = (typeof data === 'object' && data !== null) ? { ...data, url } : { id: data, url };
            }
            setModalData(resolvedData);
            setIsModalOpen(true);
        },
        close: () => {
            setIsModalOpen(false);
            // Limpiamos los datos después de la animación (300ms)
            setTimeout(() => setModalData(null), 300);
        },
        getData: () => modalData
    }));

    const handleCancel = (e) => {
        setIsModalOpen(false);
        setTimeout(() => setModalData(null), 300);
        if (onCancel) onCancel(e);
    };

    const closeFunction = () => {
        setIsModalOpen(false);
        setTimeout(() => setModalData(null), 300);
    };

    // Resolver contenido dinámico
    const resolvedTitle = typeof title === 'function' ? title(modalData) : title;
    const resolvedFooter = typeof footer === 'function' ? footer(modalData, closeFunction) : footer;
    const resolvedChildren = typeof children === 'function' ? children(modalData, closeFunction) : children;

    return (
        <Modal
            open={isModalOpen}
            onCancel={handleCancel}
            title={resolvedTitle}
            footer={resolvedFooter}
            {...props}
        >
            {resolvedChildren}
        </Modal>
    );
});

export default AppModal;
