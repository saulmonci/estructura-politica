import React from 'react';
import { usePage } from '@inertiajs/react';

/**
 * Hook para evaluar si el usuario tiene acceso basado en roles o entidades.
 */
export const useRoleGuard = () => {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role?.toLowerCase() || '';

    const hasAccess = ({ allowedRoles = [], entities = [], currentEntity }) => {
        // Si no se especifican roles ni entidades, se asume que no hay restricciones adicionales en ese criterio
        
        const roleMatches = allowedRoles.length === 0 || allowedRoles.map(r => r.toLowerCase()).includes(userRole);
        const entityMatches = entities.length === 0 || (currentEntity && entities.includes(currentEntity));

        // Si se pasaron props, deben cumplirse ambos (AND logic)
        return roleMatches && entityMatches;
    };

    return { hasAccess, userRole };
};

/**
 * Componente envoltorio para renderizar condicionalmente partes de la UI
 * dependiendo del rol del usuario.
 */
const RoleGuard = ({ allowedRoles = [], entities = [], currentEntity, fallback = null, children }) => {
    const { hasAccess } = useRoleGuard();

    if (hasAccess({ allowedRoles, entities, currentEntity })) {
        return <>{children}</>;
    }

    return fallback;
};

export default RoleGuard;
