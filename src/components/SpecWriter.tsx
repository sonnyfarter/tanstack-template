import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  Star,
  Upload,
} from 'lucide-react'
import { extractPdfText, parseBlueStarQuote } from '../utils/parseQuote'

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

interface SpecArticle {
  num: string
  title: string
  clauses: string[]
}
interface SpecPart {
  heading: string
  articles: SpecArticle[]
}

const EDITORIAL = (c: string) => /^\[/.test(c) || /^NOTE/.test(c)

/**
 * Build a CSI MasterFormat Section 26 32 13 (Packaged Engine Generators)
 * guide specification from the field values, framed as basis of design.
 * Only states what the values support; inserts bracketed editorial notes
 * where the engineer of record must verify or decide.
 */
function buildSpec(s: SpecState): SpecPart[] {
  const g = (k: string) => (typeof s[k] === 'string' ? (s[k] as string).trim() : '')
  const arr = (k: string) => (Array.isArray(s[k]) ? (s[k] as string[]) : [])
  const fla = (s.ratedAmps as string) || estimateAmps(s)
  const reg = g('voltageReg') || '±0.25%'
  const fuel = g('fuelType') || 'Engine'
  const fuelL = fuel.toLowerCase().replace(' (propane)', '')
  const rpm = g('frequency').includes('50') ? '1500 rpm' : '1800 rpm'
  const ratingType =
    g('application') === 'Prime'
      ? 'prime'
      : g('application') === 'Continuous'
        ? 'continuous'
        : 'emergency standby'
  const ambient = g('ambient') || '40°C'
  const kw = g('powerKW')
  const output = kw
    ? `${kw} kW${g('powerKVA') ? ` (${g('powerKVA')} kVA)` : ''}${
        g('powerFactor') ? ` at ${g('powerFactor')} power factor` : ''
      }`
    : '[POWER RATING — SPECIFIER TO CONFIRM]'
  const cleanVolt = g('voltage')
    ? g('voltage').replace(/\s*\([^)]*\)\s*$/, '').replace(/V?$/, 'V')
    : ''
  const cleanPhase = /Single/.test(g('phase'))
    ? 'single-phase'
    : g('phase')
      ? '3-phase'
      : ''
  const elec = [cleanVolt, cleanPhase, g('frequency')].filter(Boolean).join(', ')

  // Article builder that strips empty clauses and auto-letters.
  const A = (num: string, title: string, clauses: Array<string | false>): SpecArticle => ({
    num,
    title,
    clauses: clauses.filter((c): c is string => Boolean(c)),
  })

  const nfpa = g('nfpa110')
  const nfpaClause =
    nfpa && nfpa !== 'Not required'
      ? `NFPA 110, Standard for Emergency and Standby Power Systems, ${nfpa}.`
      : 'NFPA 110, Standard for Emergency and Standby Power Systems.'

  const certs = arr('certs')
  const standards = [
    'NFPA 70, National Electrical Code.',
    nfpaClause,
    'NFPA 37, Standard for the Installation and Use of Stationary Combustion Engines and Gas Turbines.',
    certs.includes('UL 2200') && 'UL 2200, Stationary Engine Generator Assemblies.',
    g('fuelType') === 'Diesel' &&
      g('fuelTank') &&
      g('fuelTank') !== 'None' &&
      'UL 142, Steel Aboveground Tanks for Flammable and Combustible Liquids.',
    certs.includes('CSA') && 'CSA C22.2, Canadian Standards Association certification.',
    g('epaTier') &&
      g('epaTier') !== 'Not applicable' &&
      `U.S. EPA 40 CFR — stationary compression-ignition emissions (${g('epaTier')}).`,
    'NEMA MG-1, Motors and Generators.',
    'IEEE 446, Emergency and Standby Power Systems (Recommended Practice).',
    'International Building Code (IBC) — seismic and wind requirements.',
  ].filter(Boolean) as string[]

  const subDesc = `Outdoor, packaged, ${fuelL}-fueled engine-generator set, ${output}, ${
    elec || '[ELECTRICAL CHARACTERISTICS]'
  }, for ${ratingType} service.`

  const part1 = {
    heading: 'PART 1 - GENERAL',
    articles: [
      A('1.01', 'BASIS OF DESIGN', [
        `The design of this Section is based on Blue Star Power Systems${
          g('model') ? `, Model ${g('model')}` : ''
        }${g('specNumber') ? `, as represented in Quote No. ${g('specNumber')}` : ''}${
          g('date') ? ` dated ${g('date')}` : ''
        }.`,
        'NOTE TO SPECIFIER: This document is a basis-of-design guide specification generated from a manufacturer quotation. Verify all values, edit bracketed items, and coordinate with project drawings before sealing.',
        g('projectName') && `Project: ${g('projectName')}.`,
        g('location') && `Location: ${g('location')}.`,
      ]),
      A('1.02', 'SECTION INCLUDES', [
        subDesc,
        g('enclosureType') &&
          g('enclosureType') !== 'Open Set' &&
          `${g('enclosureType')} outdoor enclosure${
            g('enclosureMaterial') ? ` of ${g('enclosureMaterial').toLowerCase()} construction` : ''
          }.`,
        g('fuelType') === 'Diesel' &&
          g('fuelTank') &&
          g('fuelTank') !== 'None' &&
          `Integral sub-base fuel storage tank${
            g('fuelCapacity') ? `, ${g('fuelCapacity')} gallon` : ''
          }.`,
        'Generator-mounted engine controls, instrumentation, and protective devices.',
        g('mainBreaker') === 'Yes' && 'Generator-mounted main-line overcurrent protective device.',
        'Starting batteries, battery charger, and ancillary accessories.',
      ]),
      A('1.03', 'RELATED REQUIREMENTS', [
        s.ats === 'Yes'
          ? 'Section 26 36 00 - Transfer Switches.'
          : '[Section 26 36 00 - Transfer Switches, if furnished under a separate Section.]',
        '[Division 23 - Fuel piping and exhaust routing, where applicable.]',
        '[Division 03 - Concrete housekeeping pad / equipment foundation.]',
      ]),
      A('1.04', 'REFERENCES', [
        'Comply with the latest editions of the following, except as modified herein:',
        ...standards,
      ]),
      A('1.05', 'SUBMITTALS', [
        'Product Data: Manufacturer data sheets for the generator set and each major component, including ratings, dimensions, weights, and clearances.',
        'Shop Drawings: Dimensioned plans, elevations, control and power wiring diagrams, and interconnection schedules.',
        'Certified prototype and production test reports.',
        g('enclosureType') &&
          /Sound/.test(g('enclosureType')) &&
          'Sound performance data, dB(A) at rated load and stated distance.',
        'Manufacturer factory test report for the furnished unit.',
        'Operation and Maintenance Manuals.',
        'Manufacturer warranty documentation.',
      ]),
      A('1.06', 'QUALITY ASSURANCE', [
        'Manufacturer: A firm regularly engaged in manufacturing engine-generator sets, with production under a registered ISO 9001 quality system.',
        'Source Responsibility: The engine, alternator, controls, enclosure, and fuel tank shall be furnished and warranted by a single manufacturer as a coordinated package.',
        certs.includes('UL 2200') && 'The complete assembly shall be UL 2200 listed.',
        nfpa &&
          nfpa !== 'Not required' &&
          `The system shall comply with NFPA 110, ${nfpa}.`,
        g('epaTier') &&
          g('epaTier') !== 'Not applicable' &&
          `The engine shall meet applicable U.S. EPA emissions requirements (${g('epaTier')}).`,
      ]),
      A('1.07', 'WARRANTY', [
        g('warranty')
          ? `Manufacturer's warranty: ${g('warranty')}, covering parts and labor from date of startup or beneficial use.`
          : "Provide manufacturer's standard warranty covering parts and labor. [SPECIFIER TO DEFINE TERM.]",
      ]),
    ],
  }

  const part2 = {
    heading: 'PART 2 - PRODUCTS',
    articles: [
      A('2.01', 'MANUFACTURERS', [
        `Basis of Design: Blue Star Power Systems${g('model') ? `, Model ${g('model')}` : ''}.`,
        '[Acceptable manufacturers of equal product, complying with this Section: ____________, ____________.]',
      ]),
      A('2.02', 'RATINGS', [
        `Output: ${output}, ${ratingType} rating.`,
        elec && `Electrical characteristics: ${elec}.`,
        !!fla &&
          `Approximate full-load current: ${fla} amperes${
            s.ratedAmps ? '' : ' (calculated — verify against alternator data)'
          }.`,
        `Suitable for continuous operation in a ${ambient} ambient.`,
        `Frequency regulation: isochronous; voltage regulation: ${reg} steady-state.`,
      ]),
      A('2.03', 'ENGINE', [
        `Type: ${fuelL}-fueled, ${(g('aspiration') || 'turbocharged').toLowerCase()}, rated for ${
          kw ? `${kw} kW` : output
        } at ${rpm}.`,
        (g('engineMake') || g('engineModel')) &&
          `Manufacturer / model: ${[g('engineMake'), g('engineModel')].filter(Boolean).join(' ')}.`,
        `Governor: ${(g('governor') || 'electronic isochronous').toLowerCase()} type.`,
        `Cooling: unit-mounted radiator with engine-driven fan, sized for the ${ambient} ambient.`,
        g('jacketHeater') === 'Yes' &&
          'Jacket-water heater: thermostatically controlled, sized to maintain manufacturer-recommended starting temperature.',
        'Air cleaner: dry-type, replaceable element.',
        'Starting: electric starting from the battery system specified herein.',
      ]),
      A('2.04', 'ALTERNATOR', [
        `Type: synchronous, brushless, ${(g('excitation') || 'PMG (Permanent Magnet)').replace(
          ' (Permanent Magnet)',
          '',
        )}-excited, directly coupled to the engine.`,
        g('alternatorMake') && `Manufacturer: ${g('alternatorMake')}.`,
        `Insulation: ${g('insulationClass') || 'Class H'}, with temperature rise not exceeding ${
          g('tempRise') || '105°C'
        } over a ${ambient} ambient.`,
        `Voltage regulation: solid-state automatic voltage regulator maintaining ${reg} steady-state from no load to full load.`,
        'Construction and performance shall comply with NEMA MG-1.',
      ]),
      A('2.05', 'CONTROL SYSTEM', [
        `Furnish a generator-mounted, microprocessor-based control system${
          g('controller') ? `: ${g('controller')}` : ''
        }.`,
        'Provide automatic engine start/stop, voltage regulation, AC/DC metering, and protective relaying.',
        'Protective shutdowns shall include, at minimum: low oil pressure, high coolant temperature, overspeed, and overcrank.',
        arr('comms').includes('Remote Annunciator') &&
          'Provide a remote annunciator with NFPA 110 alarm and status indication.',
        arr('comms').filter((c) => c !== 'Remote Annunciator').length > 0 &&
          `Communications interfaces: ${arr('comms')
            .filter((c) => c !== 'Remote Annunciator')
            .join(', ')}.`,
      ]),
      A('2.06', 'ENCLOSURE', [
        g('enclosureType') && g('enclosureType') !== 'Open Set'
          ? `Provide a ${g('enclosureType').toLowerCase()} enclosure${
              g('enclosureMaterial') ? ` fabricated of ${g('enclosureMaterial').toLowerCase()}` : ''
            }, with lockable, gasketed access doors.`
          : 'Provide an open (unhoused) generator set on a structural steel base. [Confirm enclosure requirement.]',
        g('soundLevel') &&
          `Sound performance: not to exceed ${g('soundLevel')} dB(A) at 23 feet at rated load.`,
        'Mount the unit on a structural steel base with integral lifting and anchoring provisions; provide vibration isolation between the set and base.',
      ]),
      g('fuelType') === 'Diesel' &&
        g('fuelTank') &&
        g('fuelTank') !== 'None' &&
        A('2.07', 'FUEL SYSTEM', [
          `Sub-base fuel tank: ${g('fuelTank')}${
            g('fuelCapacity') ? `, ${g('fuelCapacity')}-gallon usable capacity` : ''
          }, double-wall with integral secondary containment, UL 142 listed.`,
          'Provide fuel level gauge, low-fuel and rupture-basin (leak) alarms, supply and return connections, fill, and vent.',
        ]),
      A('2.08', 'EXHAUST SYSTEM', [
        g('exhaust')
          ? `Provide a ${g('exhaust').toLowerCase()}-grade exhaust silencer with companion flanges, flexible connector, and condensate drain.`
          : 'Provide an exhaust silencer with companion flanges and flexible connector. [Specify silencer grade.]',
      ]),
      g('mainBreaker') === 'Yes' &&
        A('2.09', 'OVERCURRENT PROTECTION', [
          `Generator-mounted main-line circuit breaker${
            g('breakerAmps') ? `, ${g('breakerAmps')} amperes` : ''
          }${g('breakerPoles') ? `, ${g('breakerPoles')}` : ''}, 100% rated, in a generator-mounted enclosure.`,
          'Breaker shall be sized and rated for the generator output and available fault current. [Coordinate with short-circuit study.]',
        ]),
      A('2.10', 'ACCESSORIES', [
        `Starting battery system: ${g('battery') || 'lead-acid'}, with rack and cables.`,
        g('batteryCharger') &&
          `Battery charger: ${g('batteryCharger')}, with float/equalize control and AC-failure and low-DC alarms.`,
        'Provide oil and coolant drain extensions, and all manufacturer-standard accessories required for a complete and operable system.',
      ]),
    ].filter((a): a is SpecArticle => Boolean(a)),
  }

  const part3 = {
    heading: 'PART 3 - EXECUTION',
    articles: [
      A('3.01', 'EXAMINATION', [
        'Verify that the foundation/pad, conduit, fuel piping, and exhaust provisions are complete and correct before setting the unit.',
      ]),
      A('3.02', 'INSTALLATION', [
        'Install in accordance with the manufacturer instructions, NFPA 110, NFPA 37, and the National Electrical Code.',
        certs.length > 0 || nfpa
          ? 'Anchor and brace the unit for the applicable seismic and wind loads per the IBC and project structural documents.'
          : '[Anchor/brace for seismic and wind loads per IBC and structural documents.]',
        'Provide clearances for airflow, service, and code compliance as shown and as required by the manufacturer.',
      ]),
      A('3.03', 'FIELD QUALITY CONTROL', [
        'Startup shall be performed by a factory-authorized service representative.',
        `Field test shall verify all protective shutdowns and alarms, voltage and frequency settings, and load performance, including a load-bank test at rated ${
          g('powerFactor') || '0.8'
        } power factor.`,
        'Provide a written field test report.',
      ]),
      A('3.04', 'DEMONSTRATION', [
        'Provide on-site instruction to the Owner in the operation and maintenance of the system.',
      ]),
    ],
  }

  const parts = [part1, part2, part3]

  // Append any imported notes that did not map to a clause.
  if (g('notes')) {
    parts[1].articles.push(
      A('2.11', 'ADDITIONAL FURNISHED ITEMS (PER BASIS OF DESIGN)', [
        'The following items are included in the basis-of-design quotation:',
        ...g('notes')
          .split('\n')
          .map((n) => n.trim())
          .filter(Boolean)
          .filter((n) => !/^Imported from/i.test(n)),
      ]),
    )
  }

  return parts
}

function buildSpecText(s: SpecState): string {
  const parts = buildSpec(s)
  const out: string[] = [
    'SECTION 26 32 13',
    'PACKAGED ENGINE GENERATORS',
    '',
  ]
  for (const part of parts) {
    out.push(part.heading, '')
    for (const art of part.articles) {
      out.push(`${art.num}  ${art.title}`)
      art.clauses.forEach((c, i) => {
        const letter = String.fromCharCode(65 + i)
        out.push(`    ${letter}.  ${c}`)
      })
      out.push('')
    }
  }
  out.push('END OF SECTION 26 32 13')
  return out.join('\n')
}

function SpecDocument({ state }: { state: SpecState }) {
  const parts = buildSpec(state)
  return (
    <div className="spec-document rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div>
          <div className="text-[17px] font-semibold text-gray-900">Section 26 32 13</div>
          <div className="text-[13px] text-gray-500">
            Packaged Engine Generators — Guide Specification (Basis of Design)
          </div>
        </div>
      </div>

      <div className="font-serif text-[13.5px] leading-relaxed text-gray-900">
        {parts.map((part) => (
          <div key={part.heading} className="mb-6">
            <h3 className="mb-3 text-[14px] font-bold tracking-wide text-gray-900">
              {part.heading}
            </h3>
            {part.articles.map((art) => (
              <div key={art.num} className="mb-4">
                <div className="mb-1 font-bold text-gray-900">
                  {art.num}&ensp;{art.title}
                </div>
                <div className="space-y-1.5">
                  {art.clauses.map((c, i) => (
                    <div key={i} className="flex gap-2 pl-4">
                      <span className="shrink-0 text-gray-500">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <span className={EDITORIAL(c) ? 'italic text-amber-700' : ''}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="mt-6 border-t border-gray-100 pt-3 text-[12px] font-bold tracking-wide text-gray-500">
          END OF SECTION 26 32 13
        </div>
      </div>
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
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleQuoteFile = async (file: File | undefined | null) => {
    if (!file) return
    setImporting(true)
    setImportError(null)
    setImportMsg(null)
    try {
      const isPdf =
        file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) throw new Error('Please upload the Blue Star quote as a PDF.')

      const text = await extractPdfText(file)
      const parsed = parseBlueStarQuote(text)
      const count = Number(parsed.__count || 0)
      delete parsed.__count

      if (count === 0) {
        throw new Error(
          "Couldn't recognize this as a Blue Star quote. You can still fill the spec out manually.",
        )
      }

      setState((s) => ({ ...s, ...parsed }))
      setImportMsg(
        `Imported ${count} field${count === 1 ? '' : 's'}${
          parsed.specNumber ? ` from quote ${parsed.specNumber}` : ''
        }. Review every value before issuing.`,
      )
      go(STEPS.length)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Failed to import quote.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Import quote
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-gray-500 transition hover:bg-gray-200/60 hover:text-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
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
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleQuoteFile(e.target.files?.[0])}
        />

        {importMsg && (
          <div className="no-print mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[14px] text-green-800">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{importMsg}</span>
          </div>
        )}
        {importError && (
          <div className="no-print mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
            {importError}
          </div>
        )}

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
              <h1 className="text-[28px] font-semibold tracking-tight">Engineering specification</h1>
              <p className="mt-1 text-[15px] text-gray-500">
                A CSI Section 26 32 13 guide spec generated from your basis of design. Verify every
                value and edit bracketed items before sealing, then print, copy, or download.
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
            {step === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  handleQuoteFile(e.dataTransfer.files?.[0])
                }}
                className={
                  'no-print mb-7 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-7 text-center transition ' +
                  (dragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/40')
                }
              >
                {importing ? (
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-blue-600" />
                ) : (
                  <Upload className="mb-2 h-6 w-6 text-blue-600" />
                )}
                <div className="text-[15px] font-medium text-gray-900">
                  {importing ? 'Reading quote…' : 'Start from a Blue Star quote'}
                </div>
                <div className="mt-0.5 text-[13px] text-gray-500">
                  Drop the sales-quote PDF here or click to upload — we'll pre-fill the spec as the basis of design.
                </div>
              </div>
            )}

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
