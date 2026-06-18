import React, { useEffect, useRef, useState } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import { Card, Row, Col, Progress, Statistic, Badge, List, Button } from 'antd';
import { EnvironmentOutlined, GlobalOutlined, ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { demarcacionesGeoJson } from './Mapa/demarcacionesGeoJson';

export default function MapaPage({ demarcaciones = [], globalStats = {} }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const geoJsonLayers = useRef({});
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        if (!mapInstance.current && mapRef.current) {
            // Inicializar mapa centrado en Bahía de Banderas, Nayarit
            mapInstance.current = L.map(mapRef.current, {
                center: [20.78, -105.28],
                zoom: 11,
                minZoom: 10,
                maxZoom: 14,
                zoomControl: true,
                attributionControl: true
            });

            // Capa base de mapas (OpenStreetMap)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);

            // Cargar los polígonos GeoJSON de las demarcaciones
            L.geoJSON(demarcacionesGeoJson, {
                style: (feature) => {
                    const id = feature.properties.id;
                    const stats = demarcaciones.find(d => d.id === id) || {};
                    const color = stats.color || '#94a3b8'; // color por defecto gris
                    
                    return {
                        color: color,
                        weight: 2,
                        opacity: 0.8,
                        fillColor: color,
                        fillOpacity: 0.4
                    };
                },
                onEachFeature: (feature, layer) => {
                    const id = feature.properties.id;
                    const stats = demarcaciones.find(d => d.id === id) || {
                        id,
                        nombre: `Demarcación ${id}`,
                        promovidos: 0,
                        meta: 500,
                        porcentaje: 0,
                        color: '#94a3b8'
                    };

                    geoJsonLayers.current[id] = layer;

                    // Popup interactivo
                    layer.bindPopup(`
                        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 160px;">
                            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
                                Demarcación ${stats.id}
                            </h3>
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
                                ${feature.properties.nombre.split(' - ')[1] || ''}
                            </div>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;"/>
                            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 2px 0; color: #475569;">Promovidos:</td>
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

                    // Eventos de hover
                    layer.on({
                        mouseover: (e) => {
                            const l = e.target;
                            l.setStyle({
                                weight: 4,
                                fillOpacity: 0.65
                            });
                        },
                        mouseout: (e) => {
                            const l = e.target;
                            l.setStyle({
                                weight: 2,
                                fillOpacity: 0.4
                            });
                        },
                        click: () => {
                            setSelectedId(id);
                        }
                    });

                    // Añadir etiqueta estática en el centro del polígono
                    const center = layer.getBounds().getCenter();
                    const labelIcon = L.divIcon({
                        className: 'custom-map-label-wrapper',
                        html: `
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
                        `,
                        iconSize: [70, 50],
                        iconAnchor: [35, 25]
                    });

                    L.marker(center, { icon: labelIcon, interactive: false }).addTo(mapInstance.current);
                }
            }).addTo(mapInstance.current);
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [demarcaciones]);

    const focusDemarcacion = (id) => {
        setSelectedId(id);
        const layer = geoJsonLayers.current[id];
        if (layer && mapInstance.current) {
            const bounds = layer.getBounds();
            mapInstance.current.fitBounds(bounds, { maxZoom: 12, animate: true, padding: [30, 30] });
            layer.openPopup();
        }
    };

    return (
        <MainLayout>
            <Head title="Mapa Territorial" />

            <div className="mb-6">
                <h2 className="text-xl font-bold m-0 flex items-center gap-2">
                    <GlobalOutlined className="text-[#0f172a]" /> Mapa Territorial (Bahía de Banderas)
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    Visualiza en tiempo real el cumplimiento y metas de simpatizantes (promovidos) en las 9 demarcaciones municipales.
                </p>
            </div>

            <Row gutter={[16, 16]}>
                {/* Panel lateral: Estadísticas y lista de Demarcaciones */}
                <Col xs={24} lg={8} className="flex flex-col gap-4">
                    {/* Estadísticas Generales */}
                    <Card bordered={false} className="shadow-sm bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
                        <Statistic 
                            title={<span className="text-gray-300 text-xs tracking-wider uppercase font-semibold">Avance General Municipal</span>} 
                            value={globalStats.porcentaje} 
                            precision={1}
                            suffix="%"
                            valueStyle={{ color: '#10B981', fontSize: '32px', fontWeight: 'bold' }}
                        />
                        <div className="mt-3">
                            <Progress 
                                percent={globalStats.porcentaje} 
                                strokeColor="#10B981" 
                                trailColor="rgba(255,255,255,0.1)" 
                                showInfo={false} 
                            />
                        </div>
                        <Row className="mt-4 border-t border-white/10 pt-4" gutter={16}>
                            <Col span={12}>
                                <div className="text-gray-400 text-xs">Total Promovidos</div>
                                <div className="text-lg font-bold text-white mt-1">{globalStats.total_promovidos}</div>
                            </Col>
                            <Col span={12}>
                                <div className="text-gray-400 text-xs">Meta Total Votantes</div>
                                <div className="text-lg font-bold text-white mt-1">{globalStats.total_meta}</div>
                            </Col>
                        </Row>
                    </Card>

                    {/* Semáforo Leyenda */}
                    <Card title={<span className="text-xs uppercase tracking-wide font-bold">Semáforo de Cumplimiento</span>} size="small" bordered={false} className="shadow-sm">
                        <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100">
                                <Badge color="#10B981" text={<span className="font-semibold text-green-800 text-xs">Verde (&gt; 60% Meta)</span>} />
                                <span className="text-xs text-green-700 font-bold">Excelente avance</span>
                            </div>
                            <div className="flex justify-between items-center bg-amber-50 p-2 rounded border border-amber-100">
                                <Badge color="#F59E0B" text={<span className="font-semibold text-amber-800 text-xs">Amarillo (40% - 60% Meta)</span>} />
                                <span className="text-xs text-amber-700 font-bold">En proceso</span>
                            </div>
                            <div className="flex justify-between items-center bg-red-50 p-2 rounded border border-red-100">
                                <Badge color="#EF4444" text={<span className="font-semibold text-red-800 text-xs">Rojo (&lt; 40% Meta)</span>} />
                                <span className="text-xs text-red-700 font-bold">Alerta / Bajo</span>
                            </div>
                        </div>
                    </Card>

                    {/* Listado de Avance de Demarcaciones */}
                    <Card title={<span className="text-xs uppercase tracking-wide font-bold font-sans">Avance por Demarcación</span>} size="small" bordered={false} className="shadow-sm flex-1 max-h-[380px] overflow-y-auto">
                        <List
                            dataSource={demarcaciones}
                            renderItem={(item) => (
                                <List.Item 
                                    className={`cursor-pointer px-2.5 py-2 hover:bg-gray-50 rounded transition-colors ${selectedId === item.id ? 'bg-blue-50 hover:bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                    onClick={() => focusDemarcacion(item.id)}
                                >
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-xs text-gray-800">
                                                Demarcación {item.id}
                                            </span>
                                            <span style={{ color: item.color }} className="font-bold text-xs">
                                                {item.porcentaje}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                                            <span>{item.promovidos} promovidos</span>
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
                    <Card bordered={false} className="shadow-sm p-0 w-full overflow-hidden" styles={{ body: { padding: 0 } }}>
                        <div 
                            ref={mapRef} 
                            style={{ height: '620px', width: '100%', position: 'relative' }} 
                            className="bg-gray-100 rounded-lg outline-none"
                        />
                    </Card>
                </Col>
            </Row>
        </MainLayout>
    );
}
