export function DefaultVisibilityToggle({
  defaultVisible,
  onChange,
}: {
  defaultVisible: boolean
  onChange: (defaultVisible: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-ink">
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={defaultVisible}
        onChange={(e) => onChange(e.target.checked)}
      />
      Visible by default
    </label>
  )
}
