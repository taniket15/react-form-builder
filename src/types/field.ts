import type { Condition } from './condition'

export type FieldType =
  | 'singleLineText'
  | 'multiLineText'
  | 'number'
  | 'date'
  | 'singleSelect'
  | 'multiSelect'
  | 'fileUpload'
  | 'sectionHeader'
  | 'calculation'

/**
 * Every config carries `required`, even Section Header / Calculation (always `false`,
 * no toggle in their ConfigPanel). This keeps `required` a total property across the
 * whole FieldConfig union so generic engine code (resolveFieldState) can read
 * `field.config.required` without narrowing on `type` first.
 */
export interface BaseConfig {
  label: string
  required: boolean
}

export interface SelectOption {
  id: string
  label: string
}

export interface FileMeta {
  name: string
  size: number
  type: string
}

export interface SingleLineTextConfig extends BaseConfig {
  type: 'singleLineText'
  placeholder?: string
  minLength?: number
  maxLength?: number
  prefix?: string
  suffix?: string
}

export interface MultiLineTextConfig extends BaseConfig {
  type: 'multiLineText'
  placeholder?: string
  minLength?: number
  maxLength?: number
  rows: number
}

export interface NumberConfig extends BaseConfig {
  type: 'number'
  min?: number
  max?: number
  decimalPlaces: number
  prefix?: string
  suffix?: string
}

export interface DateConfig extends BaseConfig {
  type: 'date'
  prefillToday: boolean
  minDate?: string
  maxDate?: string
}

export interface SingleSelectConfig extends BaseConfig {
  type: 'singleSelect'
  options: SelectOption[]
  displayType: 'radio' | 'dropdown' | 'tiles'
}

export interface MultiSelectConfig extends BaseConfig {
  type: 'multiSelect'
  options: SelectOption[]
  minSelections?: number
  maxSelections?: number
}

export interface FileUploadConfig extends BaseConfig {
  type: 'fileUpload'
  allowedTypes?: string
  maxFiles?: number
}

export interface SectionHeaderConfig extends BaseConfig {
  type: 'sectionHeader'
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export interface CalculationConfig extends BaseConfig {
  type: 'calculation'
  sourceFieldIds: string[]
  aggregation: 'sum' | 'average' | 'min' | 'max'
  decimalPlaces: number
}

export type FieldConfig =
  | SingleLineTextConfig
  | MultiLineTextConfig
  | NumberConfig
  | DateConfig
  | SingleSelectConfig
  | MultiSelectConfig
  | FileUploadConfig
  | SectionHeaderConfig
  | CalculationConfig

/**
 * `config.type` is the sole discriminant — there is no separate top-level `type` on
 * FormField, to avoid two sources of truth for the same tag disagreeing with each other.
 */
export interface FormField {
  id: string
  config: FieldConfig
  conditions: Condition[]
  defaultVisible: boolean
}
