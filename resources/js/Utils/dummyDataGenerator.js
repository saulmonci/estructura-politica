/**
 * Generador de datos de prueba para desarrollo y testing exclusivo de Superusuario.
 */

const NOMBRES_HOMBRES = [
    'Juan Carlos',
    'José Luis',
    'Miguel Ángel',
    'Francisco Javier',
    'Jesús',
    'Alejandro',
    'Manuel',
    'Roberto',
    'Fernando',
    'Ricardo',
    'Eduardo',
    'Jorge',
    'Héctor',
    'Raúl',
    'Guillermo',
    'Salvador',
    'Arturo',
    'Óscar',
    'Mario',
    'Antonio',
];

const NOMBRES_MUJERES = [
    'María Elena',
    'Guadalupe',
    'Rosa María',
    'Ana Patricia',
    'Adriana',
    'Leticia',
    'Gabriela',
    'Verónica',
    'Patricia',
    'Silvia',
    'Claudia',
    'Teresa',
    'Laura',
    'Mónica',
    'Martha',
    'Beatriz',
    'Alejandra',
    'Yolanda',
    'Carmen',
    'Sofía',
];

const APELLIDOS = [
    'García',
    'Hernández',
    'Martínez',
    'López',
    'González',
    'Pérez',
    'Rodríguez',
    'Sánchez',
    'Ramírez',
    'Cruz',
    'Flores',
    'Gómez',
    'Morales',
    'Vázquez',
    'Jiménez',
    'Reyes',
    'Díaz',
    'Torres',
    'Gutiérrez',
    'Ruiz',
    'Mendoza',
    'Aguilar',
    'Ortiz',
    'Moreno',
    'Castillo',
    'Romero',
    'Álvarez',
    'Méndez',
    'Chávez',
    'Rivera',
];

const APODOS = [
    'El Capi',
    'El Inge',
    'La Güera',
    'El Profe',
    'El Lic',
    'Pepe',
    'Paco',
    'Beto',
    'Charly',
    'Toño',
    'Rafa',
    'Lalo',
    'Memo',
    'Monse',
    'Gaby',
    'Paty',
    'El Puma',
    'La Jefa',
];

const CALLES = [
    'Av. Insurgentes',
    'Av. México',
    'Calle Hidalgo',
    'Calle Morelos',
    'Calle Juárez',
    'Calle Allende',
    'Av. Independencia',
    'Calle 5 de Mayo',
    'Calle Zaragoza',
    'Av. Jacarandas',
    'Calle Lerdo',
    'Calle Mina',
    'Av. Universidad',
    'Calle Bravo',
];

const COLONIAS = [
    'Centro',
    'San Juan',
    'Las Brisas',
    'Los Sauces',
    'Ciudad del Valle',
    'Mololoa',
    'Jardines del Valle',
    'Versalles',
    'Lindavista',
    'El Rodeo',
    'Amado Nervo',
    'Lomas de la Cruz',
];

const CODIGOS_POSTALES = ['63000', '63175', '63190', '63038', '63150', '63130', '63060', '63180'];

const ESTADOS_CURP = ['NT', 'JC', 'DF', 'MX', 'CL', 'SN', 'MI', 'GR', 'PL', 'VZ'];

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cleanString(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

/**
 * Genera una persona con datos coherentes y válidos.
 */
export function generateRandomPerson() {
    const isMale = Math.random() > 0.5;
    const sexo = isMale ? 'Masculino' : 'Femenino';
    const nombre = isMale ? getRandomItem(NOMBRES_HOMBRES) : getRandomItem(NOMBRES_MUJERES);
    const apellidoPaterno = getRandomItem(APELLIDOS);
    const apellidoMaterno = getRandomItem(APELLIDOS);
    const apellidos = `${apellidoPaterno} ${apellidoMaterno}`;
    const apodo = Math.random() > 0.3 ? getRandomItem(APODOS) : '';

    // Fecha de nacimiento (entre 20 y 60 años de edad)
    const year = getRandomInt(1965, 2004);
    const month = String(getRandomInt(1, 12)).padStart(2, '0');
    const day = String(getRandomInt(1, 28)).padStart(2, '0');
    const yearStr = String(year).slice(-2);

    // Letras iniciales para CURP
    const p1 = cleanString(apellidoPaterno.slice(0, 2));
    const p2 = cleanString(apellidoMaterno.slice(0, 1));
    const p3 = cleanString(nombre.split(' ')[0].slice(0, 1));
    const letrasCurp = `${p1}${p2}${p3}`.padEnd(4, 'X').slice(0, 4);

    const sexChar = isMale ? 'H' : 'M';
    const stateChar = getRandomItem(ESTADOS_CURP);
    const homoclave = `${getRandomInt(10, 99)}`;

    // CURP de 18 caracteres
    const curp = `${letrasCurp}${yearStr}${month}${day}${sexChar}${stateChar}NNN${homoclave}`.slice(0, 18);

    // Clave de Elector de 18 caracteres
    const cElec1 = cleanString(`${apellidoPaterno.slice(0, 2)}${apellidoMaterno.slice(0, 2)}${nombre.slice(0, 2)}`)
        .padEnd(6, 'X')
        .slice(0, 6);
    const clave_electoral = `${cElec1}${yearStr}${month}${day}18H${getRandomInt(100, 999)}`.slice(0, 18);

    // Teléfono de 10 dígitos (ej. 311XXXXXXX)
    const telefono = `311${getRandomInt(1000000, 9999999)}`;

    // Email único
    const slugName = cleanString(nombre.split(' ')[0]).toLowerCase();
    const slugApellido = cleanString(apellidoPaterno).toLowerCase();
    const uniqueSuffix = Date.now().toString().slice(-4) + getRandomInt(10, 99);
    const email = `test.${slugName}.${slugApellido}.${uniqueSuffix}@prueba.com`;

    // Dirección
    const calle = getRandomItem(CALLES);
    const numero_exterior = String(getRandomInt(1, 999));
    const numero_interior = Math.random() > 0.6 ? `Int ${getRandomInt(1, 12)}` : '';
    const colonia = getRandomItem(COLONIAS);
    const codigo_postal = getRandomItem(CODIGOS_POSTALES);
    const seccion_electoral = String(getRandomInt(110, 150)).padStart(4, '0');

    return {
        nombre,
        apellidos,
        name: `${nombre} ${apellidos}`,
        apodo,
        sexo,
        telefono,
        email,
        curp,
        clave_electoral,
        clave_elector: clave_electoral,
        calle,
        numero_exterior,
        numero_interior,
        colonia,
        codigo_postal,
        seccion_electoral,
        estado: true,
        notas: 'Registro de prueba generado automáticamente para desarrollo.',
        password: 'password123',
    };
}

/**
 * Genera datos completos para PersonaFormModal (Coordinadores, RDs, Operadores, Promotores).
 */
export function generatePersonaFormData({
    entityType = 'Representante',
    availablePresidentes = [],
    availableRds = [],
    demarcaciones = [],
    secciones = [],
} = {}) {
    const person = generateRandomPerson();

    const data = { ...person };

    // Asignar parent_id si corresponde
    if (entityType === 'Representante' || entityType === 'Coordinador') {
        if (availablePresidentes && availablePresidentes.length > 0) {
            data.parent_id = availablePresidentes[0].id;
        }
    } else if (entityType === 'Operador' || entityType === 'Promotor') {
        if (availableRds && availableRds.length > 0) {
            data.parent_id = availableRds[0].id;
        }
    }

    // Asignar demarcación si hay opciones
    if (demarcaciones && demarcaciones.length > 0) {
        const randomDem = getRandomItem(demarcaciones);
        data.demarcacion_id = String(randomDem.id);
        if (entityType === 'RD' || entityType === 'Representante') {
            data.demarcacion_asignada_id = String(randomDem.id);
        }
    }

    // Asignar sección si hay opciones
    if (secciones && secciones.length > 0) {
        data.seccion_electoral = String(secciones[0].numero || secciones[0].id);
    }

    return data;
}

/**
 * Genera datos completos para PromovidoFormModal.
 */
export function generatePromovidoFormData({ availablePromotores = [], demarcaciones = [], secciones = [] } = {}) {
    const person = generateRandomPerson();

    const data = {
        nombre: person.nombre,
        apellidos: person.apellidos,
        telefono: person.telefono,
        email: person.email,
        curp: person.curp,
        clave_elector: person.clave_elector,
        calle: person.calle,
        numero_exterior: person.numero_exterior,
        numero_interior: person.numero_interior,
        colonia: person.colonia,
        codigo_postal: person.codigo_postal,
        seccion_electoral: person.seccion_electoral,
        notas: 'Promovido de prueba generado automáticamente.',
    };

    if (availablePromotores && availablePromotores.length > 0) {
        data.promotor_id = availablePromotores[0].id;
    }

    if (demarcaciones && demarcaciones.length > 0) {
        const randomDem = getRandomItem(demarcaciones);
        data.demarcacion_id = String(randomDem.id);
    }

    if (secciones && secciones.length > 0) {
        data.seccion_electoral = String(secciones[0].numero || secciones[0].id);
    }

    return data;
}

/**
 * Genera datos completos para Presidentes Modal.
 */
export function generatePresidenteFormData({ estados = [], municipios = [] } = {}) {
    const person = generateRandomPerson();

    const data = {
        nombre: person.nombre,
        apellidos: person.apellidos,
        apodo: person.apodo,
        email: person.email,
        telefono: person.telefono,
        curp: person.curp,
        clave_electoral: person.clave_electoral,
        calle: person.calle,
        numero_exterior: person.numero_exterior,
        colonia: person.colonia,
        codigo_postal: person.codigo_postal,
        password: 'password123',
        scope_level: 'municipal',
        meta_promovidos: getRandomInt(500, 3000),
        color: '#2563eb',
        notas: 'Presidente de campaña de prueba generado automáticamente.',
    };

    if (estados && estados.length > 0) {
        data.state_id = estados[0].id;
    }

    if (municipios && municipios.length > 0) {
        data.municipality_id = municipios[0].id;
    }

    return data;
}
