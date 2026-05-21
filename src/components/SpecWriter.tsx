import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Star,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'segmented'
  | 'multiselect'
  | 'textarea'

interface Field {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
  suffix?: string
  help?: string
  span?: 1 | 2
  showIf?: (s: SpecState) => boolean
}

interface Step {
  id: string
  title: string
  subtitle: string
  fields: Field[]
}

type SpecState = Record<string, string | string[]>

const today = new Date().toISOString().slice(0, 10)

const STEPS: Step[] = [
  {
    id: 'project',
    title: 'Project',
    subtitle: 'Who and where this generator set is for.',
    fields: [
      { key: 'projectName', label: 'Project name', type: 'text', placeholder: 'e.g. Mercy Regional Hospital', span: 2 },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'City, State' },
      { key: 'specNumber', label: 'Spec / Quote #', type: 'text', placeholder: 'BSP-00000' },
      { key: 'engineer', label: 'Specifying engineer / firm', type: 'text', placeholder: 'Consulting engineer' },
      { key: 'contractor', label: 'Contractor', type: 'text', placeholder: 'Electrical contractor' },
      { key: 'rep', label: 'Blue Star representative', type: 'text', placeholder: 'Distributor / rep' },
      { key: 'date', label: 'Date', type: 'date' },
      {
        key: 'application',
        label: 'Application',
        type: 'segmented',
        options: ['Emergency Standby', 'Prime', 'Continuous'],
        span: 2,
      },
    ],
  },
  {
    id: 'rating',
    title: 'Power rating',
    subtitle: 'Core electrical output of the genset.',
    fields: [
      { key: 'model', label: 'Genset model', type: 'text', placeholder: 'e.g. GM60-02' },
      {
        key: 'fuelType',
        label: 'Fuel type',
        type: 'segmented',
        options: ['Diesel', 'Natural Gas', 'LP (Propane)', 'Bi-Fuel'],
        span: 2,
      },
      { key: 'powerKW', label: 'Power output', type: 'number', suffix: 'kW' },
      { key: 'powerKVA', label: 'Apparent power', type: 'number', suffix: 'kVA' },
      { key: 'powerFactor', label: 'Power factor', type: 'select', options: ['0.8', '1.0'] },
      {
        key: 'voltage',
        label: 'Voltage',
        type: 'select',
        options: [
          '120/240 (1Ø)',
          '208Y/120 (3Ø)',
          '240 (3Ø)',
          '480Y/277 (3Ø)',
          '480 (3Ø)',
          '600Y/347 (3Ø)',
          '600 (3Ø)',
          '4160 (3Ø)',
        ],
      },
      { key: 'phase', label: 'Phase', type: 'segmented', options: ['Single (1Ø)', 'Three (3Ø)'] },
      { key: 'frequency', label: 'Frequency', type: 'segmented', options: ['60 Hz', '50 Hz'] },
      { key: 'ratedAmps', label: 'Rated current (optional)', type: 'number', suffix: 'A', help: 'Leave blank to auto-estimate on the spec sheet.' },
    ],
  },
  {
    id: 'engine',
    title: 'Engine & alternator',
    subtitle: 'Prime mover and generator end.',
    fields: [
      { key: 'engineMake', label: 'Engine make', type: 'text', placeholder: 'e.g. Doosan, MTU, PSI' },
      { key: 'engineModel', label: 'Engine model', type: 'text', placeholder: 'Model #' },
      { key: 'governor', label: 'Governor', type: 'select', options: ['Electronic Isochronous', 'Mechanical'] },
      {
        key: 'aspiration',
        label: 'Aspiration',
        type: 'select',
        options: ['Turbocharged & Aftercooled', 'Turbocharged', 'Naturally Aspirated'],
      },
      { key: 'alternatorMake', label: 'Alternator make', type: 'text', placeholder: 'e.g. Marathon, Stamford' },
      { key: 'insulationClass', label: 'Insulation class', type: 'select', options: ['Class H', 'Class F'] },
      {
        key: 'tempRise',
        label: 'Temperature rise',
        type: 'select',
        options: ['80°C', '105°C', '125°C', '130°C'],
      },
      {
        key: 'excitation',
        label: 'Excitation',
        type: 'select',
        options: ['PMG (Permanent Magnet)', 'AREP', 'Shunt'],
      },
      { key: 'voltageReg', label: 'Voltage regulation', type: 'text', placeholder: '±0.25%' },
      { key: 'ambient', label: 'Ambient rating', type: 'select', options: ['40°C', '50°C'] },
    ],
  },
  {
    id: 'enclosure',
    title: 'Enclosure & fuel',
    subtitle: 'Housing, fuel storage, and exhaust.',
    fields: [
      {
        key: 'enclosureType',
        label: 'Enclosure',
        type: 'segmented',
        options: ['Open Set', 'Weather Protective', 'Sound Level 1', 'Sound Level 2'],
        span: 2,
      },
      {
        key: 'enclosureMaterial',
        label: 'Enclosure material',
        type: 'select',
        options: ['Aluminum', 'Steel', 'Galvanneal'],
        showIf: (s) => s.enclosureType !== 'Open Set',
      },
      {
        key: 'soundLevel',
        label: 'Sound level',
        type: 'text',
        suffix: 'dB(A) @ 23 ft',
        showIf: (s) => s.enclosureType === 'Sound Level 1' || s.enclosureType === 'Sound Level 2',
      },
      {
        key: 'fuelTank',
        label: 'Sub-base fuel tank',
        type: 'select',
        options: ['None', 'UL142 Sub-base', 'UL142 Dual-wall'],
        showIf: (s) => s.fuelType === 'Diesel' || s.fuelType === 'Bi-Fuel',
      },
      {
        key: 'fuelCapacity',
        label: 'Tank capacity',
        type: 'number',
        suffix: 'gal',
        showIf: (s) =>
          (s.fuelType === 'Diesel' || s.fuelType === 'Bi-Fuel') && s.fuelTank !== 'None' && !!s.fuelTank,
      },
      {
        key: 'exhaust',
        label: 'Exhaust silencer',
        type: 'select',
        options: ['Industrial', 'Residential', 'Critical', 'Hospital'],
      },
    ],
  },
  {
    id: 'controls',
    title: 'Controls & electrical',
    subtitle: 'Controller, breaker, and accessories.',
    fields: [
      { key: 'controller', label: 'Controller', type: 'text', placeholder: 'e.g. Blue Star DCP-7310' },
      {
        key: 'comms',
        label: 'Communications',
        type: 'multiselect',
        options: ['Modbus RTU', 'Modbus TCP', 'Ethernet', 'SNMP', 'Remote Annunciator'],
        span: 2,
      },
      { key: 'mainBreaker', label: 'Main line circuit breaker', type: 'segmented', options: ['Yes', 'No'] },
      {
        key: 'breakerAmps',
        label: 'Breaker rating',
        type: 'number',
        suffix: 'A',
        showIf: (s) => s.mainBreaker === 'Yes',
      },
      {
        key: 'breakerPoles',
        label: 'Breaker poles',
        type: 'select',
        options: ['2-pole', '3-pole'],
        showIf: (s) => s.mainBreaker === 'Yes',
      },
      { key: 'batteryCharger', label: 'Battery charger', type: 'text', placeholder: '10A float charger' },
      { key: 'jacketHeater', label: 'Jacket water heater', type: 'segmented', options: ['Yes', 'No'] },
      { key: 'battery', label: 'Starting battery', type: 'select', options: ['Lead Acid', 'AGM'] },
    ],
  },
  {
    id: 'compliance',
    title: 'Transfer & compliance',
    subtitle: 'ATS, codes, and warranty.',
    fields: [
      { key: 'ats', label: 'Automatic transfer switch', type: 'segmented', options: ['Yes', 'No'] },
      {
        key: 'atsAmps',
        label: 'ATS rating',
        type: 'number',
        suffix: 'A',
        showIf: (s) => s.ats === 'Yes',
      },
      {
        key: 'atsTransition',
        label: 'ATS transition',
        type: 'select',
        options: ['Open (Break-before-make)', 'Closed (Make-before-break)', 'Delayed'],
        showIf: (s) => s.ats === 'Yes',
      },
      { key: 'nfpa110', label: 'NFPA 110', type: 'select', options: ['Not required', 'Level 1', 'Level 2'] },
      {
        key: 'epaTier',
        label: 'EPA emissions',
        type: 'select',
        options: ['Stationary Emergency', 'Tier 2', 'Tier 3', 'Tier 4 Final', 'Not applicable'],
      },
      {
        key: 'warranty',
        label: 'Warranty',
        type: 'select',
        options: ['2 yr / 1000 hr Standard', '5 yr Limited', '10 yr Extended'],
      },
      {
        key: 'certs',
        label: 'Certifications',
        type: 'multiselect',
        options: ['UL 2200', 'CSA', 'Seismic (IBC)', 'OSHPD'],
        span: 2,
      },
      { key: 'notes', label: 'Additional notes', type: 'textarea', placeholder: 'Special requirements, accessories, exceptions…', span: 2 },
    ],
  },
]

const DEFAULTS: SpecState = {
  date: today,
  application: 'Emergency Standby',
  fuelType: 'Diesel',
  powerFactor: '0.8',
  voltage: '480Y/277 (3Ø)',
  phase: 'Three (3Ø)',
  frequency: '60 Hz',
  governor: 'Electronic Isochronous',
  aspiration: 'Turbocharged & Aftercooled',
  insulationClass: 'Class H',
  tempRise: '105°C',
  excitation: 'PMG (Permanent Magnet)',
  voltageReg: '±0.25%',
  ambient: '40°C',
  enclosureType: 'Sound Level 2',
  enclosureMaterial: 'Aluminum',
  exhaust: 'Critical',
  fuelTank: 'UL142 Sub-base',
  mainBreaker: 'Yes',
  breakerPoles: '3-pole',
  batteryCharger: '10A float charger',
  jacketHeater: 'Yes',
  battery: 'Lead Acid',
  ats: 'No',
  nfpa110: 'Level 1',
  epaTier: 'Stationary Emergency',
  warranty: '2 yr / 1000 hr Standard',
  comms: ['Modbus TCP'],
  certs: ['UL 2200'],
}

const STORAGE_KEY = 'bluestar-spec-writer'

/* ------------------------------------------------------------------ */
/*  Field controls                                                     */
/* ------------------------------------------------------------------ */

const labelCls = 'block text-[13px] font-medium text-gray-500 mb-1.5'
const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-300'

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field
  value: string | string[]
  onChange: (v: string | string[]) => void
}) {
  if (field.type === 'segmented') {
    return (
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {field.options!.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={
                'rounded-lg px-3.5 py-1.5 text-[14px] font-medium transition ' +
                (active
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800')
              }
            >
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === 'multiselect') {
    const arr = Array.isArray(value) ? value : []
    return (
      <div className="flex flex-wrap gap-2">
        {field.options!.map((opt) => {
          const active = arr.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(active ? arr.filter((x) => x !== opt) : [...arr, opt])
              }
              className={
                'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-medium transition ' +
                (active
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')
              }
            >
              {active && <Check className="h-3.5 w-3.5" />}
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <select
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + ' appearance-none bg-[length:1rem] pr-9'}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239ca3af'%3E%3Cpath d='M5.5 7.5L10 12l4.5-4.5'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
        }}
      >
        <option value="">Select…</option>
        {field.options!.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className={inputCls + ' resize-none'}
      />
    )
  }

  return (
    <div className="relative">
      <input
        type={field.type === 'number' ? 'number' : field.type}
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputCls + (field.suffix ? ' pr-14' : '')}
      />
      {field.suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-gray-400">
          {field.suffix}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Spec document                                                      */
/* ------------------------------------------------------------------ */

function estimateAmps(s: SpecState): string | null {
  const kva = parseFloat(s.powerKVA as string)
  if (!kva) return null
  const v = parseFloat(((s.voltage as string) || '').replace(/[^0-9.].*$/, '').replace(/Y.*/, ''))
  if (!v) return null
  const threePhase = s.phase === 'Three (3Ø)'
  const amps = threePhase ? (kva * 1000) / (Math.sqrt(3) * v) : (kva * 1000) / v
  return amps.toFixed(0)
}

function buildSpecText(s: SpecState): string {
  const fla = (s.ratedAmps as string) || estimateAmps(s)
  const line = (label: string, val?: string | string[]) => {
    const v = Array.isArray(val) ? val.join(', ') : val
    return v ? `${label.padEnd(26)} ${v}` : ''
  }
  const sections: Array<[string, string[]]> = [
    [
      'PROJECT',
      [
        line('Project', s.projectName),
        line('Location', s.location),
        line('Spec / Quote #', s.specNumber),
        line('Date', s.date),
        line('Engineer', s.engineer),
        line('Contractor', s.contractor),
        line('Representative', s.rep),
        line('Application', s.application),
      ],
    ],
    [
      'GENERATOR SET',
      [
        line('Model', s.model),
        line('Fuel', s.fuelType),
        line('Output', s.powerKW ? `${s.powerKW} kW / ${s.powerKVA || '—'} kVA @ ${s.powerFactor} PF` : ''),
        line('Voltage', s.voltage),
        line('Phase / Frequency', `${s.phase} · ${s.frequency}`),
        line('Rated current', fla ? `${fla} A${s.ratedAmps ? '' : ' (est.)'}` : ''),
      ],
    ],
    [
      'ENGINE & ALTERNATOR',
      [
        line('Engine', [s.engineMake, s.engineModel].filter(Boolean).join(' ')),
        line('Governor', s.governor),
        line('Aspiration', s.aspiration),
        line('Alternator', s.alternatorMake),
        line('Insulation', s.insulationClass),
        line('Temp rise', s.tempRise),
        line('Excitation', s.excitation),
        line('Voltage regulation', s.voltageReg),
        line('Ambient rating', s.ambient),
      ],
    ],
    [
      'ENCLOSURE & FUEL',
      [
        line('Enclosure', s.enclosureType),
        line('Material', s.enclosureMaterial),
        line('Sound level', s.soundLevel ? `${s.soundLevel} dB(A) @ 23 ft` : ''),
        line('Fuel tank', s.fuelTank),
        line('Tank capacity', s.fuelCapacity ? `${s.fuelCapacity} gal` : ''),
        line('Exhaust silencer', s.exhaust),
      ],
    ],
    [
      'CONTROLS & ELECTRICAL',
      [
        line('Controller', s.controller),
        line('Communications', s.comms),
        line('Main breaker', s.mainBreaker === 'Yes' ? [s.breakerAmps && `${s.breakerAmps}A`, s.breakerPoles].filter(Boolean).join(' ') || 'Yes' : 'None'),
        line('Battery charger', s.batteryCharger),
        line('Jacket water heater', s.jacketHeater),
        line('Starting battery', s.battery),
      ],
    ],
    [
      'TRANSFER & COMPLIANCE',
      [
        line('Transfer switch', s.ats === 'Yes' ? [s.atsAmps && `${s.atsAmps}A`, s.atsTransition].filter(Boolean).join(' · ') || 'Yes' : 'None'),
        line('NFPA 110', s.nfpa110),
        line('EPA emissions', s.epaTier),
        line('Warranty', s.warranty),
        line('Certifications', s.certs),
        line('Notes', s.notes),
      ],
    ],
  ]

  const out: string[] = ['BLUE STAR POWER SYSTEMS — GENERATOR SET SPECIFICATION', '']
  for (const [title, lines] of sections) {
    const filled = lines.filter(Boolean)
    if (!filled.length) continue
    out.push(title, '─'.repeat(52), ...filled, '')
  }
  return out.join('\n')
}

function SpecDocument({ state }: { state: SpecState }) {
  const fla = (state.ratedAmps as string) || estimateAmps(state)
  const Row = ({ label, value }: { label: string; value?: string | string[] }) => {
    const v = Array.isArray(value) ? value.join(', ') : value
    if (!v) return null
    return (
      <div className="flex gap-4 border-b border-gray-100 py-2 text-[14px]">
        <span className="w-44 shrink-0 text-gray-500">{label}</span>
        <span className="font-medium text-gray-900">{v}</span>
      </div>
    )
  }
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-blue-600">{title}</h3>
      <div>{children}</div>
    </div>
  )
  return (
    <div className="spec-document rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div>
          <div className="text-[17px] font-semibold text-gray-900">Blue Star Power Systems</div>
          <div className="text-[13px] text-gray-500">Generator Set Specification</div>
        </div>
      </div>

      <Section title="Project">
        <Row label="Project" value={state.projectName} />
        <Row label="Location" value={state.location} />
        <Row label="Spec / Quote #" value={state.specNumber} />
        <Row label="Date" value={state.date} />
        <Row label="Engineer" value={state.engineer} />
        <Row label="Contractor" value={state.contractor} />
        <Row label="Representative" value={state.rep} />
        <Row label="Application" value={state.application} />
      </Section>

      <Section title="Generator Set">
        <Row label="Model" value={state.model} />
        <Row label="Fuel" value={state.fuelType} />
        <Row
          label="Output"
          value={state.powerKW ? `${state.powerKW} kW / ${state.powerKVA || '—'} kVA @ ${state.powerFactor} PF` : ''}
        />
        <Row label="Voltage" value={state.voltage} />
        <Row label="Phase / Frequency" value={`${state.phase} · ${state.frequency}`} />
        <Row label="Rated current" value={fla ? `${fla} A${state.ratedAmps ? '' : ' (est.)'}` : ''} />
      </Section>

      <Section title="Engine & Alternator">
        <Row label="Engine" value={[state.engineMake, state.engineModel].filter(Boolean).join(' ')} />
        <Row label="Governor" value={state.governor} />
        <Row label="Aspiration" value={state.aspiration} />
        <Row label="Alternator" value={state.alternatorMake} />
        <Row label="Insulation" value={state.insulationClass} />
        <Row label="Temp rise" value={state.tempRise} />
        <Row label="Excitation" value={state.excitation} />
        <Row label="Voltage regulation" value={state.voltageReg} />
        <Row label="Ambient rating" value={state.ambient} />
      </Section>

      <Section title="Enclosure & Fuel">
        <Row label="Enclosure" value={state.enclosureType} />
        <Row label="Material" value={state.enclosureMaterial} />
        <Row label="Sound level" value={state.soundLevel ? `${state.soundLevel} dB(A) @ 23 ft` : ''} />
        <Row label="Fuel tank" value={state.fuelTank} />
        <Row label="Tank capacity" value={state.fuelCapacity ? `${state.fuelCapacity} gal` : ''} />
        <Row label="Exhaust silencer" value={state.exhaust} />
      </Section>

      <Section title="Controls & Electrical">
        <Row label="Controller" value={state.controller} />
        <Row label="Communications" value={state.comms} />
        <Row
          label="Main breaker"
          value={
            state.mainBreaker === 'Yes'
              ? [state.breakerAmps && `${state.breakerAmps}A`, state.breakerPoles].filter(Boolean).join(' ') || 'Yes'
              : 'None'
          }
        />
        <Row label="Battery charger" value={state.batteryCharger} />
        <Row label="Jacket water heater" value={state.jacketHeater} />
        <Row label="Starting battery" value={state.battery} />
      </Section>

      <Section title="Transfer & Compliance">
        <Row
          label="Transfer switch"
          value={
            state.ats === 'Yes'
              ? [state.atsAmps && `${state.atsAmps}A`, state.atsTransition].filter(Boolean).join(' · ') || 'Yes'
              : 'None'
          }
        />
        <Row label="NFPA 110" value={state.nfpa110} />
        <Row label="EPA emissions" value={state.epaTier} />
        <Row label="Warranty" value={state.warranty} />
        <Row label="Certifications" value={state.certs} />
        <Row label="Notes" value={state.notes} />
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function SpecWriter() {
  const [state, setState] = useState<SpecState>(DEFAULTS)
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  // Load persisted draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setState({ ...DEFAULTS, ...JSON.parse(saved) })
    } catch {
      /* ignore */
    }
  }, [])

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const isReview = step === STEPS.length
  const totalSteps = STEPS.length
  const progress = Math.round((step / totalSteps) * 100)

  const set = (key: string, value: string | string[]) =>
    setState((s) => ({ ...s, [key]: value }))

  const go = (next: number) => {
    setStep(next)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const specText = useMemo(() => buildSpecText(state), [state])

  const copy = async () => {
    await navigator.clipboard.writeText(specText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const download = () => {
    const blob = new Blob([specText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(state.projectName as string) || 'generator'}-spec.txt`.replace(/\s+/g, '-').toLowerCase()
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    if (confirm('Clear all fields and start over?')) {
      setState(DEFAULTS)
      setStep(0)
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900">
      <div ref={topRef} />

      {/* Header */}
      <header className="no-print sticky top-0 z-10 border-b border-gray-200/70 bg-[#f5f5f7]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Star className="h-4 w-4 fill-current" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">Blue Star Power Systems</div>
              <div className="text-[12px] text-gray-500">Generator Set Spec Writer</div>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-gray-500 transition hover:bg-gray-200/60 hover:text-gray-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${isReview ? 100 : progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {/* Step pills */}
        <div className="no-print mb-7 flex flex-wrap gap-2">
          {STEPS.map((st, i) => (
            <button
              key={st.id}
              onClick={() => go(i)}
              className={
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition ' +
                (i === step
                  ? 'bg-blue-600 text-white'
                  : i < step || isReview
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200/70 text-gray-500 hover:bg-gray-200')
              }
            >
              {(i < step || isReview) && <Check className="h-3 w-3" />}
              {st.title}
            </button>
          ))}
          <button
            onClick={() => go(totalSteps)}
            className={
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition ' +
              (isReview ? 'bg-blue-600 text-white' : 'bg-gray-200/70 text-gray-500 hover:bg-gray-200')
            }
          >
            <FileText className="h-3 w-3" />
            Review
          </button>
        </div>

        {isReview ? (
          <>
            <div className="no-print mb-6">
              <h1 className="text-[28px] font-semibold tracking-tight">Review & export</h1>
              <p className="mt-1 text-[15px] text-gray-500">
                Check the specification, then print, copy, or download it.
              </p>
            </div>

            <SpecDocument state={state} />

            <div className="no-print mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-[15px] font-medium text-white transition hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </button>
              <button
                onClick={copy}
                className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-[15px] font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy text'}
              </button>
              <button
                onClick={download}
                className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-[15px] font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>

            <div className="no-print mt-6">
              <button
                onClick={() => go(totalSteps - 1)}
                className="flex items-center gap-1.5 text-[15px] font-medium text-blue-600 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to editing
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-7">
              <div className="text-[13px] font-medium text-blue-600">
                Step {step + 1} of {totalSteps}
              </div>
              <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{STEPS[step].title}</h1>
              <p className="mt-1 text-[15px] text-gray-500">{STEPS[step].subtitle}</p>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
              {STEPS[step].fields
                .filter((f) => !f.showIf || f.showIf(state))
                .map((field) => (
                  <div key={field.key} className={field.span === 2 ? 'sm:col-span-2' : ''}>
                    <label className={labelCls}>{field.label}</label>
                    <FieldControl
                      field={field}
                      value={state[field.key] ?? (field.type === 'multiselect' ? [] : '')}
                      onChange={(v) => set(field.key, v)}
                    />
                    {field.help && <p className="mt-1.5 text-[12px] text-gray-400">{field.help}</p>}
                  </div>
                ))}
            </div>

            {/* Nav */}
            <div className="mt-9 flex items-center justify-between border-t border-gray-200 pt-5">
              <button
                onClick={() => go(Math.max(0, step - 1))}
                disabled={step === 0}
                className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[15px] font-medium text-gray-600 transition hover:bg-gray-200/60 disabled:opacity-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => go(step + 1)}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-blue-700"
              >
                {step === totalSteps - 1 ? 'Review spec' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
