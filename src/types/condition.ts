export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan'
  | 'withinRange'
  | 'containsAnyOf'
  | 'containsAllOf'
  | 'containsNoneOf'
  | 'isBefore'
  | 'isAfter'

export type ConditionEffect = 'show' | 'hide' | 'require' | 'unrequire'

export interface RangeValue {
  min: number
  max: number
}

export interface Condition {
  id: string
  targetFieldId: string
  operator: ConditionOperator
  value: unknown
  effect: ConditionEffect
}
