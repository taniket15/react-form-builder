const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/** e.g. "4th July 2026, 01:59 am" — used for template "last modified" and
 * response submission timestamps throughout the app (and later, the PDF export). */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const day = date.getDate()
  const month = MONTH_NAMES[date.getMonth()] ?? ''
  const year = date.getFullYear()

  let hours = date.getHours()
  const period = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  if (hours === 0) hours = 12

  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(date.getMinutes()).padStart(2, '0')

  return `${day}${ordinalSuffix(day)} ${month} ${year}, ${hoursStr}:${minutesStr} ${period}`
}
