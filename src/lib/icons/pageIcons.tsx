import { getLucidePageIconName } from './pageIconText'
import { pageIconOptions } from './pageIconRegistry'

export function PageIcon({
  value,
  size = 18,
  className,
}: {
  value?: string | null
  size?: number
  className?: string
}) {
  const iconName = getLucidePageIconName(value)
  if (iconName) {
    const option = pageIconOptions.find((item) => item.name === iconName)
    if (option) return <option.Icon size={size} className={className} strokeWidth={1.9} />
  }

  return (
    <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
      {value || '□'}
    </span>
  )
}
