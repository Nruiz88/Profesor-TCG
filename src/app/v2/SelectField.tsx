'use client'

import { ChevronDownIcon } from '@/components/icons'
import './SelectField.css'

export default function SelectField({
  value,
  onChange,
  children,
  label
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="v2s-wrap">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="v2s-select"
      >
        {children}
      </select>
      <ChevronDownIcon className="v2s-chevron" />
    </div>
  )
}