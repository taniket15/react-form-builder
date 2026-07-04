import type { SectionHeaderConfig } from '../types'
import { escapeHtml } from '../utils/escapeHtml'
import { TextField } from '../components/common/TextField'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

// No value at all — required is always false (no toggle in the ConfigPanel below),
// and it's the only field type without formatForDisplay: it defines renderForPdf
// instead, since a section header is a structural heading, not a label/value row.
type Value = null

const SIZE_CLASSES: Record<SectionHeaderConfig['size'], string> = {
  xs: 'text-sm font-semibold text-ink',
  sm: 'text-base font-semibold text-ink',
  md: 'text-lg font-semibold text-ink',
  lg: 'text-xl font-bold text-ink',
  xl: 'text-2xl font-bold text-ink',
}

const PDF_HEADING_TAG: Record<SectionHeaderConfig['size'], string> = {
  xs: 'h5',
  sm: 'h4',
  md: 'h3',
  lg: 'h2',
  xl: 'h1',
}

function createDefaultConfig(): SectionHeaderConfig {
  return {
    type: 'sectionHeader',
    label: 'Section',
    required: false,
    size: 'md',
  }
}

function ConfigPanel({ config, onChange, ctx }: FieldConfigPanelProps<SectionHeaderConfig>) {
  return (
    <div className="space-y-3">
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
        error={ctx.labelError}
      />
      <label className="field-label">
        Size
        <select
          className="field-select mt-1"
          value={config.size}
          onChange={(e) =>
            onChange({ ...config, size: e.target.value as SectionHeaderConfig['size'] })
          }
        >
          <option value="xs">XS</option>
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="xl">XL</option>
        </select>
      </label>
    </div>
  )
}

function FillField({ config }: FieldFillProps<SectionHeaderConfig, Value>) {
  return (
    <h2 className={`border-b border-ink/15 pb-2 ${SIZE_CLASSES[config.size]}`}>{config.label}</h2>
  )
}

function validate(): string | null {
  return null
}

export const sectionHeaderDefinition: FieldDefinition<SectionHeaderConfig, Value> = {
  type: 'sectionHeader',
  label: 'Section Header',
  icon: '📰',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: () => null,
  validate,
  renderForPdf: (config) => {
    const tag = PDF_HEADING_TAG[config.size]
    return `<${tag} class="pdf-section-header pdf-section-header--${config.size}">${escapeHtml(config.label)}</${tag}>`
  },
}

registerField(sectionHeaderDefinition)
