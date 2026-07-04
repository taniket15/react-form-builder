export function affixInputClassName(prefix?: string, suffix?: string): string {
  return `${prefix ? 'rounded-l-none border-l-0' : ''} ${suffix ? 'rounded-r-none border-r-0' : ''}`
}
