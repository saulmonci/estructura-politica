import React, { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Input, Select, Tag, Avatar, Spin, Empty, Button, Popover } from 'antd';
import { 
  SearchOutlined, 
  UserOutlined, 
  UserSwitchOutlined, 
  EnvironmentOutlined,
  LoadingOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const ROLE_COLORS = {
  superuser: 'magenta',
  admin: 'red',
  presidente: 'gold',
  rd: 'blue',
  operador: 'cyan',
  promotor: 'green',
};

const ROLE_NAMES = {
  superuser: 'Superuser',
  admin: 'Admin',
  presidente: 'Presidente',
  rd: 'RD',
  operador: 'Operador',
  promotor: 'Promotor',
};

export default function HeaderImpersonateSearch() {
  const { auth } = usePage().props;
  const canImpersonate = auth?.can_impersonate ?? false;

  const [municipios, setMunicipios] = useState([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);

  const containerRef = useRef(null);

  // Cargar lista de municipios
  useEffect(() => {
    if (canImpersonate) {
      axios.get('/catalogos/municipios')
        .then(res => {
          setMunicipios(res.data || []);
        })
        .catch(err => console.error('Error cargando municipios:', err));
    }
  }, [canImpersonate]);

  // Ejecutar búsqueda con debounce
  useEffect(() => {
    if (!canImpersonate) return;

    const timer = setTimeout(() => {
      fetchUsers(query, selectedMunicipio);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedMunicipio, canImpersonate]);

  const fetchUsers = async (q, municipioId) => {
    setLoading(true);
    try {
      const res = await axios.get('/impersonate/search', {
        params: {
          q: q || '',
          municipality_id: municipioId || '',
        }
      });
      setResults(res.data || []);
    } catch (err) {
      console.error('Error buscando usuarios:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeImpersonate = (userId) => {
    setImpersonatingId(userId);
    setOpen(false);
    router.post(`/impersonate/${userId}`, {}, {
      onFinish: () => setImpersonatingId(null),
    });
  };

  if (!canImpersonate) {
    return (
      <Input 
        prefix={<SearchOutlined className="text-gray-400" />} 
        placeholder="Buscar..." 
        className="w-32 sm:w-48 md:w-80 rounded-md border-gray-200 hover:border-blue-400 focus:border-blue-500"
      />
    );
  }

  const popoverContent = (
    <div className="w-[320px] sm:w-[420px] max-h-[380px] overflow-y-auto p-1">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
        <span>Usuarios Disponibles</span>
        <span className="text-[10px] text-gray-400">{results.length} resultados</span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <p className="mt-2 text-xs">Buscando usuarios...</p>
        </div>
      ) : results.length === 0 ? (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description={<span className="text-gray-400 text-xs">No se encontraron usuarios</span>} 
          className="my-4"
        />
      ) : (
        <div className="divide-y divide-gray-100">
          {results.map((u) => (
            <div 
              key={u.id}
              className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 rounded-lg transition-colors group cursor-pointer"
              onClick={() => handleTakeImpersonate(u.id)}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Avatar 
                  icon={<UserOutlined />} 
                  className="bg-blue-100 text-blue-600 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800 truncate leading-snug">
                      {u.name}
                    </span>
                    <Tag color={ROLE_COLORS[u.role] || 'default'} className="m-0 text-[10px] px-1.5 py-0 border-none font-medium">
                      {ROLE_NAMES[u.role] || u.role}
                    </Tag>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 truncate mt-0.5">
                    {u.email && <span className="truncate">{u.email}</span>}
                    {u.municipality_name && (
                      <span className="inline-flex items-center gap-0.5 text-gray-500 font-medium">
                        <EnvironmentOutlined className="text-gray-400" />
                        {u.municipality_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="primary"
                size="small"
                icon={<UserSwitchOutlined />}
                loading={impersonatingId === u.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTakeImpersonate(u.id);
                }}
                className="bg-blue-600 hover:bg-blue-700 shadow-none text-xs flex-shrink-0"
              >
                Impersonar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      {/* Filtro de Municipio */}
      <Select
        showSearch
        optionFilterProp="label"
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        placeholder="Todos los Municipios"
        allowClear
        value={selectedMunicipio}
        onChange={(val) => setSelectedMunicipio(val)}
        className="w-36 sm:w-44 hidden sm:block"
        size="middle"
        options={[
          { value: null, label: 'Todos los Municipios' },
          ...municipios.map(m => ({ value: m.id, label: m.nombre }))
        ]}
      />

      {/* Buscador de Usuario con Popover */}
      <Popover
        content={popoverContent}
        trigger="click"
        open={open}
        onOpenChange={(newOpen) => setOpen(newOpen)}
        placement="bottomRight"
        overlayClassName="impersonate-search-popover"
      >
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Impersonar usuario..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-40 sm:w-56 md:w-64 rounded-md border-gray-200 hover:border-blue-400 focus:border-blue-500 shadow-sm"
          allowClear={{ clearIcon: <span onClick={() => setQuery('')}>×</span> }}
        />
      </Popover>
    </div>
  );
}
