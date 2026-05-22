/* Parses a Blue Star Power Systems "Sales Quote" PDF into spec-writer fields. */

type SpecValues = Record<string, string | string[]>

// Known section/label markers, used as boundaries when slicing values.
const BOUNDARIES = [
  'Prepared For:',
  'Project Title:',
  'By:',
  'Quote Number:',
  'Quote Date:',
  'Version:',
  'PROJECT OVERVIEW',
  'Unit Model:',
  'Standby / Prime:',
  'kWe Rating:',
  'Fuel:',
  'UL 2200 Listed:',
  'CSA Approved:',
  'EPA:',
  'Paint Color:',
  'GENSET SPECIFICATIONS',
  'Engine Model:',
  'Voltage Regulator:',
  'Voltage:',
  'Gen Model:',
  'Control Panel Options:',
  'Control Panel:',
  'Remote Annunciator:',
  'Unit Color:',
  'Enclosure Accessories:',
  'Enclosure:',
  'Cooling:',
  'Oil Drain Extension:',
  'Mainline Breaker:',
  'Jacket Water Heater:',
  'Air Cleaner:',
  'Silencer:',
  'Battery:',
  'Charger:',
  'Fuel Tank:',
  'Factory Test:',
  "Owner's Manual:",
  'Warranty:',
  'PRICING INFORMATION',
  'Unit Price',
  'Total Price',
  'Payment Terms',
  'Lead Time',
]

/** Extract text from a PDF, reconstructing reading order from glyph positions. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default

  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  const lines: string[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const items = content.items
      .filter((it: any) => typeof it.str === 'string' && it.str.trim() !== '')
      .map((it: any) => ({ x: it.transform[4], y: it.transform[5], s: it.str }))
      .sort((a: any, b: any) => b.y - a.y || a.x - b.x)

    let lineY: number | null = null
    let cur: string[] = []
    for (const it of items) {
      if (lineY === null || Math.abs(it.y - lineY) <= 4) {
        cur.push(it.s)
        if (lineY === null) lineY = it.y
      } else {
        lines.push(cur.join(' '))
        cur = [it.s]
        lineY = it.y
      }
    }
    if (cur.length) lines.push(cur.join(' '))
  }

  return lines.join('\n')
}

/** Slice the text between `label` and the next boundary marker that follows it. */
function field(text: string, label: string): string {
  const start = text.indexOf(label)
  if (start === -1) return ''
  const from = start + label.length
  let end = text.length
  for (const b of BOUNDARIES) {
    if (b === label) continue
    const idx = text.indexOf(b, from)
    if (idx !== -1 && idx < end) end = idx
  }
  return text
    .slice(from, end)
    .replace(/^[:\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const num = (s: string): string => {
  const m = s.replace(/,/g, '').match(/[\d.]+/)
  return m ? m[0] : ''
}

/**
 * Lead time for the generator set. Quotes can list a separate ATS lead time;
 * this picks the genset/overall lead time from the pricing block and skips any
 * line scoped to the ATS so we never report the ATS lead time by mistake.
 * Line-scoped so it returns just "32 Weeks (…)" rather than spilling into the
 * Terms & Conditions that follow it.
 */
function generatorLeadTime(text: string): string {
  const leadLines = text.split('\n').filter((l) => /lead\s*time/i.test(l))
  if (!leadLines.length) return ''
  const nonAts = leadLines.filter((l) => !/\bats\b/i.test(l))
  const pick = nonAts[0] ?? leadLines[0]
  return pick
    .replace(/.*?lead\s*time[:\s]*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapVoltage(v: string): string {
  const s = v.replace(/\s/g, '')
  if (/480.*277|277.*480/.test(s)) return '480Y/277 (3Ø)'
  if (/208.*120|120.*208/.test(s)) return '208Y/120 (3Ø)'
  if (/600.*347|347.*600/.test(s)) return '600Y/347 (3Ø)'
  if (/120\/240|240\/120/.test(s)) return '120/240 (1Ø)'
  if (/4160/.test(s)) return '4160 (3Ø)'
  if (/600/.test(s)) return '600 (3Ø)'
  if (/480/.test(s)) return '480 (3Ø)'
  if (/240/.test(s)) return '240 (3Ø)'
  return ''
}

/**
 * Parse a Blue Star quote into spec-writer field values. Returns only the
 * fields it could confidently extract, plus a `__count` of how many.
 */
export function parseBlueStarQuote(text: string): SpecValues {
  const out: SpecValues = {}
  const set = (k: string, v: string | string[]) => {
    if (v && (typeof v === 'string' ? v.trim() : v.length)) out[k] = v
  }

  // --- Project ---
  set('projectName', field(text, 'Project Title:'))
  set('specNumber', field(text, 'Quote Number:'))
  set('contractor', field(text, 'Prepared For:'))
  set('rep', field(text, 'By:'))

  const rawDate = field(text, 'Quote Date:')
  const dm = rawDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dm) {
    const [, mo, d, y] = dm
    set('date', `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`)
  }

  const app = field(text, 'Standby / Prime:')
  if (/continuous/i.test(app)) set('application', 'Continuous')
  else if (/prime/i.test(app)) set('application', 'Prime')
  else if (/standby/i.test(app)) set('application', 'Emergency Standby')

  // --- Power rating ---
  set('model', field(text, 'Unit Model:'))

  const fuel = field(text, 'Fuel:')
  if (/bi.?fuel/i.test(fuel)) set('fuelType', 'Bi-Fuel')
  else if (/lp|propane/i.test(fuel)) set('fuelType', 'LP (Propane)')
  else if (/natural|gas/i.test(fuel)) set('fuelType', 'Natural Gas')
  else if (/diesel/i.test(fuel)) set('fuelType', 'Diesel')

  const kw = num(field(text, 'kWe Rating:'))
  if (kw) set('powerKW', kw)

  const voltLine = field(text, 'Voltage:')
  const pf = voltLine.match(/([\d.]+)\s*PF/i)
  if (pf) set('powerFactor', pf[1])
  if (kw && pf) set('powerKVA', String(Math.round(Number(kw) / Number(pf[1]))))
  const hz = voltLine.match(/(\d{2})\s*Hz/i)
  if (hz) set('frequency', `${hz[1]} Hz`)
  const ph = voltLine.match(/(\d)\s*Phase/i)
  if (ph) set('phase', ph[1] === '1' ? 'Single (1Ø)' : 'Three (3Ø)')
  const mv = mapVoltage(voltLine)
  if (mv) set('voltage', mv)

  // --- Engine & alternator ---
  const engine = field(text, 'Engine Model:')
  if (engine) {
    const parts = engine.split(/\s+/)
    set('engineMake', parts[0])
    if (parts[1]) set('engineModel', parts[1])
    if (/isochronous/i.test(engine)) set('governor', 'Electronic Isochronous')
    else if (/mechanical/i.test(engine)) set('governor', 'Mechanical')
  }

  const gen = field(text, 'Gen Model:')
  if (gen) {
    set('alternatorMake', gen.split(/\s+/)[0])
    const rise = gen.match(/(\d{2,3})[^\d]{0,5}Rise/i)
    if (rise) {
      const r = rise[1]
      const opt = ['80', '105', '125', '130'].includes(r) ? `${r}°C` : ''
      if (opt) set('tempRise', opt)
    }
    const amb = gen.match(/Over\s*(\d{2,3})/i)
    if (amb) set('ambient', amb[1] === '50' ? '50°C' : '40°C')
  }

  const vr = field(text, 'Voltage Regulator:')
  if (/pmg/i.test(vr)) set('excitation', 'PMG (Permanent Magnet)')
  else if (/arep/i.test(vr)) set('excitation', 'AREP')
  else if (/shunt/i.test(vr)) set('excitation', 'Shunt')

  // --- Enclosure & fuel ---
  const encl = field(text, 'Enclosure:')
  if (encl) {
    if (/level\s*2|sound|attenuat/i.test(encl)) set('enclosureType', 'Sound Level 2')
    else if (/level\s*1|weather/i.test(encl)) set('enclosureType', 'Weather Protective')
    else if (/open/i.test(encl)) set('enclosureType', 'Open Set')
    if (/aluminum/i.test(encl)) set('enclosureMaterial', 'Aluminum')
    else if (/galvann/i.test(encl)) set('enclosureMaterial', 'Galvanneal')
    else if (/steel/i.test(encl)) set('enclosureMaterial', 'Steel')
  }

  const tank = field(text, 'Fuel Tank:')
  if (tank) {
    const gal = tank.match(/(\d{2,5})\s*Gallon/i)
    if (gal) set('fuelCapacity', gal[1])
    if (/double\s*wall|dual/i.test(tank)) set('fuelTank', 'UL142 Dual-wall')
    else if (/sub.?base|ul\s*142/i.test(tank)) set('fuelTank', 'UL142 Sub-base')
    else if (/none/i.test(tank)) set('fuelTank', 'None')
  }

  const sil = field(text, 'Silencer:')
  if (/hospital/i.test(sil)) set('exhaust', 'Hospital')
  else if (/critical/i.test(sil)) set('exhaust', 'Critical')
  else if (/residential/i.test(sil)) set('exhaust', 'Residential')
  else if (/industrial/i.test(sil)) set('exhaust', 'Industrial')

  // --- Controls & electrical ---
  const cp = field(text, 'Control Panel:')
  if (cp) {
    const ctrl = cp.split(/microprocessor|micro-processor/i)[0].trim()
    set('controller', ctrl || cp.split(/\s+/).slice(0, 3).join(' '))
  }

  const comms: string[] = []
  if (field(text, 'Remote Annunciator:')) comms.push('Remote Annunciator')
  if (/modbus\s*tcp/i.test(text)) comms.push('Modbus TCP')
  else if (/modbus/i.test(text)) comms.push('Modbus RTU')
  if (/ethernet/i.test(text)) comms.push('Ethernet')
  if (comms.length) set('comms', comms)

  const breaker = field(text, 'Mainline Breaker:')
  if (breaker && !/none|not included/i.test(breaker)) {
    set('mainBreaker', 'Yes')
    const amps = breaker.match(/(\d{2,4})\s*Amp/i)
    if (amps) set('breakerAmps', amps[1])
    const poles = breaker.match(/(\d)\s*Pole/i)
    if (poles) set('breakerPoles', `${poles[1]}-pole`)
  }

  const charger = field(text, 'Charger:')
  if (charger) set('batteryCharger', charger.split(/mounted/i)[0].trim() || charger)

  if (/none|not included/i.test(field(text, 'Jacket Water Heater:')) === false &&
    field(text, 'Jacket Water Heater:')) {
    set('jacketHeater', 'Yes')
  }

  // --- Compliance ---
  const epa = field(text, 'EPA:')
  if (/tier\s*4/i.test(epa)) set('epaTier', 'Tier 4 Final')
  else if (/tier\s*3/i.test(epa)) set('epaTier', 'Tier 3')
  else if (/tier\s*2/i.test(epa)) set('epaTier', 'Tier 2')
  else if (/emergency|stationary/i.test(epa)) set('epaTier', 'Stationary Emergency')

  const warr = field(text, 'Warranty:')
  if (/10\s*year/i.test(warr)) set('warranty', '10 yr Extended')
  else if (/5\s*year/i.test(warr)) set('warranty', '5 yr Limited')
  else if (/2\s*year/i.test(warr)) set('warranty', '2 yr / 1000 hr Standard')

  const certs: string[] = []
  if (/yes/i.test(field(text, 'UL 2200 Listed:'))) certs.push('UL 2200')
  if (/yes/i.test(field(text, 'CSA Approved:'))) certs.push('CSA')
  if (certs.length) set('certs', certs)

  // --- Notes: capture items that don't map to a dedicated field ---
  const extras: string[] = []
  const add = (label: string, prefix: string) => {
    const v = field(text, label)
    if (v) extras.push(`${prefix}: ${v}`)
  }
  if (out.specNumber) extras.push(`Imported from Blue Star quote ${out.specNumber}`)
  add('Voltage Regulator:', 'AVR')
  add('Remote Annunciator:', 'Annunciator')
  add('Control Panel Options:', 'Control panel options')
  add('Cooling:', 'Cooling')
  add('Air Cleaner:', 'Air cleaner')
  add('Silencer:', 'Silencer')
  add('Oil Drain Extension:', 'Oil drain')
  add('Enclosure Accessories:', 'Enclosure accessories')
  add('Battery:', 'Battery')
  add('Paint Color:', 'Paint')
  const lead = generatorLeadTime(text)
  if (lead) extras.push(`Generator lead time: ${lead}`)
  add('Total Price', 'Total price')
  if (extras.length) set('notes', extras.join('\n'))

  out.__count = String(
    Object.keys(out).filter((k) => k !== '__count' && k !== 'notes').length,
  )
  return out
}
