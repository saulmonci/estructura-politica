import React, { useEffect, useRef, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router } from '@inertiajs/react';
import { Card, Row, Col, Progress, Statistic, Badge, List, Radio, Input, Select } from 'antd';
import { GlobalOutlined, SearchOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { demarcacionesGeoJson } from './Mapa/demarcacionesGeoJson';

export default function MapaPage({
    demarcaciones = [],
    secciones = [],
    globalStats = {},
    currentMunicipality = null,
    availableMunicipalities = [],
    canSwitchMunicipality = false,
}) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const geoJsonLayers = useRef({});
    const demarcacionGroupsRef = useRef({});
    const [selectedId, setSelectedId] = useState(null);
    const [viewMode, setViewMode] = useState(demarcaciones.length > 0 ? 'demarcacion' : 'seccion');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (demarcaciones.length === 0 && secciones.length > 0 && viewMode === 'demarcacion') {
            setViewMode('seccion');
        }
    }, [demarcaciones, secciones]);

    useEffect(() => {
        if (!mapInstance.current && mapRef.current) {
            const initialLat = currentMunicipality?.lat ? Number(currentMunicipality.lat) : 20.8;
            const initialLng = currentMunicipality?.lng ? Number(currentMunicipality.lng) : -105.25;
            const initialZoom = currentMunicipality?.zoom ? Number(currentMunicipality.zoom) : 11;

            // Inicializar mapa centrado en el municipio
            mapInstance.current = L.map(mapRef.current, {
                center: [initialLat, initialLng],
                zoom: initialZoom,
                minZoom: 6,
                maxZoom: 18,
                zoomControl: true,
                attributionControl: true,
            });

            // Definir capas base libres de marca de agua
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            });

            const lightLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
                {
                    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
                    maxZoom: 16,
                }
            );

            const darkLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
                {
                    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
                    maxZoom: 16,
                }
            );

            const satelliteLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                {
                    attribution:
                        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                    maxZoom: 18,
                }
            );

            // Añadir la capa inicial por defecto (OpenStreetMap estándar limpio)
            osmLayer.addTo(mapInstance.current);

            // Crear el contenedor de grupos de capas para cada demarcación/sección individual
            const demarcacionGroups = {};
            demarcacionGroupsRef.current = demarcacionGroups;

            // Objeto de mapas base para el control
            const baseMaps = {
                'Mapa Claro': lightLayer,
                'Mapa Oscuro': darkLayer,
                'Mapa Estándar (OSM)': osmLayer,
                'Mapa Satelital': satelliteLayer,
            };

            // Cargar los polígonos GeoJSON desde la base de datos
            let geoJsonToLoad = { type: 'FeatureCollection', features: [] };

            if (viewMode === 'demarcacion') {
                const features = demarcaciones
                    .filter((d) => d.geojson)
                    .map((d) => {
                        try {
                            const geometry = JSON.parse(d.geojson);
                            return {
                                type: 'Feature',
                                properties: {
                                    id: d.id,
                                    nombre: d.nombre,
                                },
                                geometry: geometry,
                            };
                        } catch (e) {
                            console.error('Error parsing GeoJSON for demarcation', d.id, e);
                            return null;
                        }
                    })
                    .filter(Boolean);

                if (features.length > 0) {
                    geoJsonToLoad = {
                        type: 'FeatureCollection',
                        features: features,
                    };
                } else if (currentMunicipality?.nombre?.toLowerCase().includes('banderas')) {
                    // Fallback para Bahía de Banderas si no hay geometrías en DB
                    geoJsonToLoad = demarcacionesGeoJson;
                }
            } else {
                const features = secciones
                    .filter((s) => s.geojson)
                    .map((s) => {
                        try {
                            const geometry = JSON.parse(s.geojson);
                            return {
                                type: 'Feature',
                                properties: {
                                    id: s.id,
                                    numero: s.numero,
                                    demarcacion_id: s.demarcacion_id,
                                },
                                geometry: geometry,
                            };
                        } catch (e) {
                            console.error('Error parsing GeoJSON for section', s.id, e);
                            return null;
                        }
                    })
                    .filter(Boolean);

                geoJsonToLoad = {
                    type: 'FeatureCollection',
                    features: features,
                };
            }

            const geoJsonLayer = L.geoJSON(geoJsonToLoad, {
                style: (feature) => {
                    const id = feature.properties.id;
                    const stats =
                        viewMode === 'demarcacion'
                            ? demarcaciones.find((d) => d.id === id) || {}
                            : secciones.find((s) => s.id === id) || {};
                    const color = stats.color || '#94a3b8'; // color por defecto gris

                    return {
                        color: color,
                        weight: 2,
                        opacity: 0.8,
                        fillColor: color,
                        fillOpacity: 0.4,
                    };
                },
                onEachFeature: (feature, layer) => {
                    const id = feature.properties.id;
                    const stats =
                        viewMode === 'demarcacion'
                            ? demarcaciones.find((d) => d.id === id) || {
                                  id,
                                  nombre: feature.properties.nombre || `Demarcación ${id}`,
                                  promovidos: 0,
                                  meta: 500,
                                  porcentaje: 0,
                                  color: '#94a3b8',
                              }
                            : secciones.find((s) => s.id === id) || {
                                  id,
                                  numero: feature.properties.numero,
                                  demarcacion_id: feature.properties.demarcacion_id,
                                  promovidos: 0,
                                  meta: 50,
                                  porcentaje: 0,
                                  color: '#94a3b8',
                              };

                    geoJsonLayers.current[id] = layer;

                    // Popup interactivo
                    if (viewMode === 'demarcacion') {
                        layer.bindPopup(`
                            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 160px;">
                                <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
                                    Demarcación ${stats.id}
                                </h3>
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
                                    ${(stats.nombre || '').split(' - ')[1] || stats.nombre || ''}
                                </div>
                                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;"/>
                                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 2px 0; color: #475569;">Votantes:</td>
                                        <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0f172a;">${stats.promovidos}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 0; color: #475569;">Meta Votantes:</td>
                                        <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0f172a;">${stats.meta}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 0; color: #475569; font-weight: bold;">Avance:</td>
                                        <td style="padding: 2px 0; text-align: right; font-weight: bold; color: ${stats.color}; font-size: 13px;">${stats.porcentaje}%</td>
                                    </tr>
                                </table>
                            </div>
                        `);
                    } else {
                        layer.bindPopup(`
                            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 160px;">
                                <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
                                    Sección ${stats.numero}
                                </h3>
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
                                    ${stats.demarcacion_id ? `Demarcación ${stats.demarcacion_id}` : `Municipio: ${currentMunicipality?.nombre || ''}`}
                                </div>
                                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;"/>
                                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 2px 0; color: #475569;">Votantes:</td>
                                        <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0f172a;">${stats.promovidos}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 0; color: #475569;">Meta Votantes:</td>
                                        <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #0f172a;">${stats.meta}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 2px 0; color: #475569; font-weight: bold;">Avance:</td>
                                        <td style="padding: 2px 0; text-align: right; font-weight: bold; color: ${stats.color}; font-size: 13px;">${stats.porcentaje}%</td>
                                    </tr>
                                </table>
                            </div>
                        `);
                    }

                    // Eventos de hover
                    layer.on({
                        mouseover: (e) => {
                            const l = e.target;
                            l.setStyle({
                                weight: 4,
                                fillOpacity: 0.65,
                            });
                        },
                        mouseout: (e) => {
                            const l = e.target;
                            l.setStyle({
                                weight: 2,
                                fillOpacity: 0.4,
                            });
                        },
                        click: () => {
                            setSelectedId(id);
                        },
                    });

                    // Añadir etiqueta estática en el centro del polígono
                    if (layer.getBounds && layer.getBounds().isValid()) {
                        const center = layer.getBounds().getCenter();
                        const labelHtml =
                            viewMode === 'demarcacion'
                                ? `
                                <div style="
                                    background-color: white; 
                                    border: 2px solid ${stats.color}; 
                                    border-radius: 6px; 
                                    padding: 3px 6px; 
                                    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15); 
                                    display: flex; 
                                    flex-direction: column; 
                                    align-items: center; 
                                    justify-content: center; 
                                    min-width: 66px; 
                                    font-family: system-ui, sans-serif;
                                ">
                                    <div style="
                                        background-color: ${stats.color}; 
                                        color: white; 
                                        border-radius: 50%; 
                                        width: 18px; 
                                        height: 18px; 
                                        display: flex; 
                                        align-items: center; 
                                        justify-content: center; 
                                        font-weight: bold; 
                                        font-size: 9px;
                                    ">
                                        ${stats.id}
                                    </div>
                                    <div style="font-weight: 800; font-size: 11px; margin-top: 1px; color: #0f172a;">
                                        ${stats.porcentaje}%
                                    </div>
                                    <div style="font-size: 9px; color: #64748b; font-weight: 600;">
                                        ${stats.promovidos}/${stats.meta}
                                    </div>
                                </div>
                            `
                                : `
                                <div style="
                                    background-color: white; 
                                    border: 2px solid ${stats.color}; 
                                    border-radius: 6px; 
                                    padding: 3px 6px; 
                                    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15); 
                                    display: flex; 
                                    flex-direction: column; 
                                    align-items: center; 
                                    justify-content: center; 
                                    min-width: 66px; 
                                    font-family: system-ui, sans-serif;
                                ">
                                    <div style="
                                        background-color: ${stats.color}; 
                                        color: white; 
                                        border-radius: 4px; 
                                        padding: 1px 4px; 
                                        display: flex; 
                                        align-items: center; 
                                        justify-content: center; 
                                        font-weight: bold; 
                                        font-size: 9px;
                                    ">
                                        S-${stats.numero}
                                    </div>
                                    <div style="font-weight: 800; font-size: 11px; margin-top: 1px; color: #0f172a;">
                                        ${stats.porcentaje}%
                                    </div>
                                    <div style="font-size: 9px; color: #64748b; font-weight: 600;">
                                        ${stats.promovidos}/${stats.meta}
                                    </div>
                                </div>
                            `;

                        const labelIcon = L.divIcon({
                            className: 'custom-map-label-wrapper',
                            html: labelHtml,
                            iconSize: [70, 50],
                            iconAnchor: [35, 25],
                        });

                        const labelMarker = L.marker(center, { icon: labelIcon, interactive: false });

                        const group = L.layerGroup();
                        demarcacionGroups[id] = group;

                        layer.addTo(group);
                        labelMarker.addTo(group);
                    }
                },
            });

            // Definir capas overlay individuales por cada entidad
            const overlayMaps = {};
            Object.keys(demarcacionGroups)
                .sort((a, b) => Number(a) - Number(b))
                .forEach((id) => {
                    const group = demarcacionGroups[id];
                    const stats =
                        viewMode === 'demarcacion'
                            ? demarcaciones.find((d) => d.id === Number(id)) || {}
                            : secciones.find((s) => s.id === Number(id)) || {};
                    const name =
                        viewMode === 'demarcacion'
                            ? stats.nombre || `Demarcación ${id}`
                            : `Sección ${stats.numero || id}`;

                    group.addTo(mapInstance.current);
                    overlayMaps[name] = group;
                });

            // Añadir control de selección al mapa con mapas base y capas individuales (colapsado por defecto)
            L.control
                .layers(baseMaps, overlayMaps, { position: 'topright', collapsed: true })
                .addTo(mapInstance.current);

            // Ajustar automáticamente vista con fitBounds si hay polígonos válidos
            if (geoJsonLayer.getLayers().length > 0 && geoJsonLayer.getBounds().isValid()) {
                mapInstance.current.fitBounds(geoJsonLayer.getBounds(), { padding: [30, 30], maxZoom: 14 });
            } else {
                mapInstance.current.setView([initialLat, initialLng], initialZoom);
            }
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [demarcaciones, secciones, viewMode, currentMunicipality]);

    const focusDemarcacion = (id) => {
        setSelectedId(id);
        const layer = geoJsonLayers.current[id];
        if (layer && mapInstance.current) {
            // Asegurar que la capa de la demarcación específica esté visible si se había desactivado
            const group = demarcacionGroupsRef.current[id];
            if (group && !mapInstance.current.hasLayer(group)) {
                group.addTo(mapInstance.current);
            }
            if (layer.getBounds && layer.getBounds().isValid()) {
                const bounds = layer.getBounds();
                mapInstance.current.fitBounds(bounds, { maxZoom: 14, animate: true, padding: [30, 30] });
                layer.openPopup();
            }
        }
    };

    return (
        <MainLayout>
            <Head title={`Mapa Territorial - ${currentMunicipality?.nombre || 'General'}`} />

            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="m-0 flex items-center gap-2 text-xl font-bold">
                        <GlobalOutlined className="text-[#0f172a]" /> Mapa Territorial (
                        {currentMunicipality?.nombre || 'General'})
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Visualiza en tiempo real el cumplimiento y metas de votantes en{' '}
                        {demarcaciones.length > 0 ? `${demarcaciones.length} demarcaciones y ` : ''}
                        {secciones.length} secciones electorales.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canSwitchMunicipality && availableMunicipalities.length > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1 shadow-sm">
                            <span className="text-xs font-semibold text-gray-500">Municipio:</span>
                            <Select
                                showSearch
                                value={currentMunicipality?.id}
                                style={{ width: 220 }}
                                placeholder="Seleccionar municipio"
                                optionFilterProp="label"
                                onChange={(val) => {
                                    router.get('/mapa', { municipality_id: val }, { preserveState: false });
                                }}
                                options={availableMunicipalities.map((m) => ({
                                    value: m.id,
                                    label: m.nombre,
                                }))}
                            />
                        </div>
                    )}

                    <div className="rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                        <Radio.Group
                            value={viewMode}
                            onChange={(e) => {
                                setViewMode(e.target.value);
                                setSelectedId(null);
                                setSearchTerm('');
                            }}
                            buttonStyle="solid"
                            size="middle"
                        >
                            {demarcaciones.length > 0 && <Radio.Button value="demarcacion">Demarcación</Radio.Button>}
                            <Radio.Button value="seccion">Sección Electoral</Radio.Button>
                        </Radio.Group>
                    </div>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                {/* Panel lateral: Estadísticas y lista de Demarcaciones */}
                <Col xs={24} lg={8} className="flex flex-col gap-4">
                    {/* Estadísticas Generales */}
                    <Card bordered={false} className="shadow-sm">
                        <Statistic
                            title={
                                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    Avance General ({currentMunicipality?.nombre || 'Municipal'})
                                </span>
                            }
                            value={globalStats.porcentaje}
                            precision={1}
                            suffix="%"
                            valueStyle={{ color: '#10B981', fontSize: '32px', fontWeight: 'bold' }}
                        />
                        <div className="mt-3">
                            <Progress
                                percent={globalStats.porcentaje}
                                strokeColor="#10B981"
                                trailColor="#f1f5f9"
                                showInfo={false}
                            />
                        </div>
                        <Row className="mt-4 border-t border-gray-100 pt-4" gutter={16}>
                            <Col span={12}>
                                <div className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                    Total Votantes
                                </div>
                                <div className="mt-1 text-xl font-bold text-gray-800">
                                    {globalStats.total_promovidos}
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                    Meta Total Votantes
                                </div>
                                <div className="mt-1 text-xl font-bold text-gray-800">{globalStats.total_meta}</div>
                            </Col>
                        </Row>
                    </Card>

                    {/* Semáforo Leyenda */}
                    <Card
                        title={
                            <span className="text-xs font-bold tracking-wide uppercase">Semáforo de Cumplimiento</span>
                        }
                        size="small"
                        bordered={false}
                        className="shadow-sm"
                    >
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between rounded border border-green-100 bg-green-50 p-2">
                                <Badge
                                    color="#10B981"
                                    text={
                                        <span className="text-xs font-semibold text-green-800">
                                            Verde (&gt; 60% Meta)
                                        </span>
                                    }
                                />
                                <span className="text-xs font-bold text-green-700">Excelente avance</span>
                            </div>
                            <div className="flex items-center justify-between rounded border border-amber-100 bg-amber-50 p-2">
                                <Badge
                                    color="#F59E0B"
                                    text={
                                        <span className="text-xs font-semibold text-amber-800">
                                            Amarillo (40% - 60% Meta)
                                        </span>
                                    }
                                />
                                <span className="text-xs font-bold text-amber-700">En proceso</span>
                            </div>
                            <div className="flex items-center justify-between rounded border border-red-100 bg-red-50 p-2">
                                <Badge
                                    color="#EF4444"
                                    text={
                                        <span className="text-xs font-semibold text-red-800">Rojo (&lt; 40% Meta)</span>
                                    }
                                />
                                <span className="text-xs font-bold text-red-700">Alerta / Bajo</span>
                            </div>
                        </div>
                    </Card>

                    {/* Listado de Avance de Demarcaciones o Secciones */}
                    <Card
                        title={
                            <span className="font-sans text-xs font-bold tracking-wide uppercase">
                                Avance por {viewMode === 'demarcacion' ? 'Demarcación' : 'Sección Electoral'}
                            </span>
                        }
                        size="small"
                        bordered={false}
                        className="max-h-[380px] flex-1 overflow-y-auto shadow-sm"
                    >
                        <div className="mb-3">
                            <Input
                                placeholder={
                                    viewMode === 'demarcacion' ? 'Buscar demarcación...' : 'Buscar sección electoral...'
                                }
                                prefix={<SearchOutlined className="text-gray-400" />}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                allowClear
                                size="small"
                            />
                        </div>
                        <List
                            dataSource={(viewMode === 'demarcacion' ? demarcaciones : secciones).filter((item) => {
                                if (!searchTerm.trim()) return true;
                                const term = searchTerm.toLowerCase().trim();
                                if (viewMode === 'demarcacion') {
                                    return (
                                        String(item.id).includes(term) ||
                                        (item.nombre && item.nombre.toLowerCase().includes(term))
                                    );
                                } else {
                                    return (
                                        String(item.numero).includes(term) || String(item.demarcacion_id).includes(term)
                                    );
                                }
                            })}
                            renderItem={(item) => (
                                <List.Item
                                    className={`cursor-pointer rounded px-2.5 py-2 transition-colors hover:bg-gray-50 ${selectedId === item.id ? 'border-l-4 border-blue-600 bg-blue-50 hover:bg-blue-50' : ''}`}
                                    onClick={() => focusDemarcacion(item.id)}
                                >
                                    <div className="w-full">
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-800">
                                                {viewMode === 'demarcacion'
                                                    ? `Demarcación ${item.id}`
                                                    : `Sección ${item.numero}`}
                                            </span>
                                            <span style={{ color: item.color }} className="text-xs font-bold">
                                                {item.porcentaje}%
                                            </span>
                                        </div>
                                        <div className="mb-2 flex justify-between text-xs text-gray-400">
                                            <span>{item.promovidos} votantes</span>
                                            <span>Meta: {item.meta}</span>
                                        </div>
                                        <Progress
                                            percent={item.porcentaje}
                                            strokeColor={item.color}
                                            size="small"
                                            showInfo={false}
                                        />
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                {/* Contenedor del Mapa */}
                <Col xs={24} lg={16}>
                    <Card
                        bordered={false}
                        className="w-full overflow-hidden p-0 shadow-sm"
                        styles={{ body: { padding: 0 } }}
                    >
                        <div
                            ref={mapRef}
                            style={{ height: '620px', width: '100%', position: 'relative' }}
                            className="rounded-lg bg-gray-100 outline-none"
                        />
                    </Card>
                </Col>
            </Row>
        </MainLayout>
    );
}
