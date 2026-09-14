'use client';

import { useMemo, useState } from 'react';
import {
  FileText, MessagesSquare, MousePointerClick, CheckCircle2, ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import type { PerfilContextual } from '@/types/scanx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { GlowButton } from '@/components/ui/glow-button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SectorIndustria } from '@/components/scanx/SectorIndustria';
import { GeoCascade } from '@/components/scanx/GeoCascade';

type Modalidad = 'formulario' | 'texto' | 'entrevista';

type SelectOpt = { value: string; label: string };

const EMPLEADOS: SelectOpt[] = ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '250+'].map((v) => ({ value: v, label: v }));

const INGRESOS: SelectOpt[] = ['Menos de $1M', '$1M–$5M', '$5M–$20M', '$20M–$50M', '$50M–$100M', 'Más de $100M'].map((v) => ({ value: v, label: v }));

const SOCIEDAD: SelectOpt[] = ['Persona física', 'SA de CV', 'S de RL de CV', 'SAPI de CV', 'SAS', 'LLC (EE.UU.)', 'Inc./Corp (EE.UU.)', 'Otra'].map((v) => ({ value: v, label: v }));

const ETAPA: SelectOpt[] = [
  { value: 'startup', label: 'Startup / validando' },
  { value: 'crecimiento', label: 'Crecimiento' },
  { value: 'madurez', label: 'Madurez' },
  { value: 'transformacion', label: 'Transformación' },
  { value: 'crisis', label: 'Crisis' },
];

const MODELO: SelectOpt[] = [
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'b2b2c', label: 'B2B2C' },
  { value: 'mixto', label: 'Mixto' },
];

const CONSEJO: SelectOpt[] = [
  { value: 'activo', label: 'Sí, activo' },
  { value: 'formal', label: 'Formal/inactivo' },
  { value: 'no', label: 'No' },
];

const EXPORTA: SelectOpt[] = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];

const MERCADOS: SelectOpt[] = [
  { value: 'local', label: 'Local' },
  { value: 'regional', label: 'Regional' },
  { value: 'nacional', label: 'Nacional' },
  { value: 'internacional', label: 'Internacional' },
];

const labelCls = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

const MODALIDADES: { id: Modalidad; titulo: string; desc: string; icon: JSX.Element }[] = [
  { id: 'formulario', titulo: 'Formulario', desc: 'Llena los campos directamente', icon: <MousePointerClick className="h-5 w-5" /> },
  { id: 'texto', titulo: 'Texto libre', desc: 'Descríbela con tus palabras', icon: <FileText className="h-5 w-5" /> },
  { id: 'entrevista', titulo: 'Entrevista guiada', desc: 'Te acompañamos paso a paso', icon: <MessagesSquare className="h-5 w-5" /> },
];

/** Un campo Select reutilizable ligado a un key del perfil. */
function PerfilSelect({
  id, label, placeholder, value, options, onChange,
}: {
  id: string; label: string; placeholder: string; value?: string; options: SelectOpt[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={labelCls}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PerfilDX21({ perfil, onChange, onComplete }: {
  perfil: PerfilContextual;
  onChange: (patch: Partial<PerfilContextual>) => void;
  onComplete: () => void;
}): JSX.Element {
  const [modalidad, setModalidad] = useState<Modalidad>('formulario');
  const [textoLibre, setTextoLibre] = useState('');
  const [paso, setPaso] = useState(0);

  // ── Campos individuales del formulario (declarativo, reusado por formulario y entrevista) ──
  const campos = useMemo(() => ({
    nombre: (
      <div className="space-y-1.5">
        <Label htmlFor="pdx-nombre" className={labelCls}>Nombre de la empresa *</Label>
        <Input
          id="pdx-nombre"
          value={perfil.nombreEmpresa ?? ''}
          onChange={(e) => onChange({ nombreEmpresa: e.target.value })}
          placeholder="Razón social o nombre comercial"
        />
      </div>
    ),
    anio: (
      <div className="space-y-1.5">
        <Label htmlFor="pdx-anio" className={labelCls}>Antigüedad / año de fundación</Label>
        <Input
          id="pdx-anio"
          inputMode="numeric"
          value={perfil.anioFundacion ?? ''}
          onChange={(e) => onChange({ anioFundacion: e.target.value.replace(/[^0-9]/g, '') })}
          placeholder="Ej. 2015"
        />
      </div>
    ),
    sectorIndustria: (
      <SectorIndustria
        value={{ sector: perfil.sector, sectorCode: perfil.sectorCode, industria: perfil.industria, industriaCode: perfil.industriaCode }}
        paisIso2={perfil.paisIso2}
        onChange={(patch) => onChange(patch)}
      />
    ),
    geo: (
      <GeoCascade
        value={{ pais: perfil.pais, paisIso2: perfil.paisIso2, estado: perfil.estado, ciudad: perfil.ciudad }}
        onChange={(patch) => onChange(patch)}
      />
    ),
    empleados: (
      <PerfilSelect id="pdx-empleados" label="Nº de empleados *" placeholder="Selecciona un rango"
        value={perfil.empleados} options={EMPLEADOS} onChange={(v) => onChange({ empleados: v })} />
    ),
    ingresos: (
      <PerfilSelect id="pdx-ingresos" label="Ingresos anuales aproximados" placeholder="Selecciona un rango"
        value={perfil.ingresosRango} options={INGRESOS} onChange={(v) => onChange({ ingresosRango: v })} />
    ),
    sucursales: (
      <div className="space-y-1.5">
        <Label htmlFor="pdx-sucursales" className={labelCls}>Nº de sucursales/locaciones</Label>
        <Input
          id="pdx-sucursales"
          inputMode="numeric"
          value={perfil.sucursalesVenta ?? ''}
          onChange={(e) => onChange({ sucursalesVenta: e.target.value.replace(/[^0-9]/g, '') })}
          placeholder="Ej. 3"
        />
      </div>
    ),
    sociedad: (
      <PerfilSelect id="pdx-sociedad" label="Estructura societaria" placeholder="Selecciona"
        value={perfil.tipoSociedad} options={SOCIEDAD} onChange={(v) => onChange({ tipoSociedad: v })} />
    ),
    etapa: (
      <PerfilSelect id="pdx-etapa" label="Etapa de vida" placeholder="Selecciona"
        value={perfil.etapaVida} options={ETAPA} onChange={(v) => onChange({ etapaVida: v })} />
    ),
    modelo: (
      <PerfilSelect id="pdx-modelo" label="Modelo de negocio" placeholder="Selecciona"
        value={perfil.modeloNegocio} options={MODELO} onChange={(v) => onChange({ modeloNegocio: v })} />
    ),
    consejo: (
      <PerfilSelect id="pdx-consejo" label="¿Tiene consejo directivo?" placeholder="Selecciona"
        value={perfil.consejoAdmin} options={CONSEJO} onChange={(v) => onChange({ consejoAdmin: v })} />
    ),
    exporta: (
      <PerfilSelect id="pdx-exporta" label="¿Exporta?" placeholder="Selecciona"
        value={perfil.exporta} options={EXPORTA} onChange={(v) => onChange({ exporta: v })} />
    ),
    mercados: (
      <PerfilSelect id="pdx-mercados" label="Mercados que atiende" placeholder="Selecciona"
        value={perfil.mercados} options={MERCADOS} onChange={(v) => onChange({ mercados: v })} />
    ),
  }), [perfil, onChange]);

  // ── Validación de requeridos ──
  const faltantes: string[] = [];
  if (!perfil.nombreEmpresa?.trim()) faltantes.push('Nombre de la empresa');
  if (!perfil.sectorCode) faltantes.push('Sector');
  if (!perfil.paisIso2) faltantes.push('País');
  if (!perfil.empleados) faltantes.push('Nº de empleados');
  const valido = faltantes.length === 0;

  // ── Pasos de la entrevista guiada (mismos campos, uno a la vez) ──
  const pasos: { prompt: string; nodo: JSX.Element; span?: boolean }[] = [
    { prompt: 'Empecemos por lo básico: ¿cómo se llama tu empresa?', nodo: campos.nombre },
    { prompt: '¿En qué año nació? Nos ayuda a leer tu madurez.', nodo: campos.anio },
    { prompt: '¿A qué se dedica? Elige tu sector e industria (o deja que la IA lo detecte).', nodo: <div className="grid gap-4 sm:grid-cols-2">{campos.sectorIndustria}</div>, span: true },
    { prompt: '¿Dónde opera? Ubícanos país, estado y ciudad.', nodo: <div className="grid gap-4 sm:grid-cols-3">{campos.geo}</div>, span: true },
    { prompt: '¿Qué tan grande es el equipo hoy?', nodo: campos.empleados },
    { prompt: 'A grandes rasgos, ¿en qué rango están tus ingresos anuales?', nodo: campos.ingresos },
    { prompt: '¿Cuántas sucursales o locaciones tienes?', nodo: campos.sucursales },
    { prompt: '¿Cómo está constituida legalmente?', nodo: campos.sociedad },
    { prompt: '¿En qué etapa de vida sientes que está la empresa?', nodo: campos.etapa },
    { prompt: '¿Cuál es tu modelo de negocio principal?', nodo: campos.modelo },
    { prompt: '¿Cuentan con un consejo directivo?', nodo: campos.consejo },
    { prompt: '¿Exportan productos o servicios?', nodo: campos.exporta },
    { prompt: '¿Qué mercados atiendes?', nodo: campos.mercados },
  ];
  const pasoActual = pasos[Math.min(paso, pasos.length - 1)];
  const esUltimo = paso >= pasos.length - 1;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="space-y-1">
        <h2 className="bg-gradient-to-r from-[#1aab99] to-[#3533cd] bg-clip-text text-xl font-bold text-transparent">
          Perfil de tu empresa
        </h2>
        <p className="text-sm text-muted-foreground">
          Elige cómo prefieres capturarlo. Con este contexto adaptamos el diagnóstico a tu realidad.
        </p>
      </div>

      {/* Selector de modalidad */}
      <div className="grid gap-3 sm:grid-cols-3">
        {MODALIDADES.map((m) => {
          const activa = modalidad === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { setModalidad(m.id); setPaso(0); }}
              className={[
                'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                activa
                  ? 'border-[#1aab99] bg-[#1aab99]/5 ring-1 ring-[#1aab99]'
                  : 'border-border bg-card hover:bg-muted',
              ].join(' ')}
            >
              <span className={activa ? 'text-[#1aab99]' : 'text-muted-foreground'}>{m.icon}</span>
              <span className="space-y-0.5">
                <span className="block text-sm font-semibold text-foreground">{m.titulo}</span>
                <span className="block text-xs text-muted-foreground">{m.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenido según modalidad */}
      <Card className="rounded-xl">
        <CardContent className="p-5">
          {modalidad === 'formulario' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {campos.nombre}
              {campos.anio}
              {campos.sectorIndustria}
              {campos.geo}
              {campos.empleados}
              {campos.ingresos}
              {campos.sucursales}
              {campos.sociedad}
              {campos.etapa}
              {campos.modelo}
              {campos.consejo}
              {campos.exporta}
              {campos.mercados}
            </div>
          )}

          {modalidad === 'texto' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pdx-texto" className={labelCls}>Cuéntanos de tu empresa</Label>
                <Textarea
                  id="pdx-texto"
                  rows={8}
                  value={textoLibre}
                  onChange={(e) => setTextoLibre(e.target.value)}
                  placeholder="Cuéntanos de tu empresa como quieras: a qué se dedica, tamaño, dónde opera, cómo está estructurada… (puedes pegar texto de cualquier fuente)"
                />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-[#1aab99]" />
                  Con este texto el asistente puede estructurar tu perfil automáticamente (próximamente).
                </p>
              </div>

              <div className="rounded-lg border border-dashed p-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Mientras tanto, confirma los datos mínimos para comenzar el diagnóstico:
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {campos.nombre}
                  {campos.empleados}
                  {campos.sectorIndustria}
                  {campos.geo}
                </div>
              </div>
            </div>
          )}

          {modalidad === 'entrevista' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Paso {paso + 1} de {pasos.length}
                </span>
                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd] transition-all"
                    style={{ width: `${((paso + 1) / pasos.length) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-base font-medium text-foreground">{pasoActual.prompt}</p>

              <div className={pasoActual.span ? '' : 'max-w-md'}>{pasoActual.nodo}</div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPaso((p) => Math.max(0, p - 1))}
                  disabled={paso === 0}
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>

                {esUltimo ? (
                  <GlowButton
                    onClick={() => valido && onComplete()}
                    disabled={!valido}
                    icon={<CheckCircle2 size={16} className="ml-0.5" />}
                  >
                    Listo
                  </GlowButton>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPaso((p) => Math.min(pasos.length - 1, p + 1))}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/70"
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de confirmación (formulario y texto libre) */}
      {modalidad !== 'entrevista' && (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {valido ? (
              <span className="flex items-center gap-1.5 text-[#1aab99]">
                <CheckCircle2 className="h-4 w-4" /> Perfil listo para comenzar el diagnóstico.
              </span>
            ) : (
              <span>Faltan datos requeridos: <b className="text-foreground">{faltantes.join(', ')}</b></span>
            )}
          </div>
          <GlowButton
            onClick={() => valido && onComplete()}
            disabled={!valido}
            icon={<CheckCircle2 size={16} className="ml-0.5" />}
          >
            Confirmar perfil y comenzar
          </GlowButton>
        </div>
      )}
    </div>
  );
}
