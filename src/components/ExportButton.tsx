import styles from './ExportButton.module.css'

interface ExportButtonProps {
  disabled: boolean
  selectedCount: number
  onClick: () => void
}

export function ExportButton({ disabled, selectedCount, onClick }: ExportButtonProps) {
  return (
    <button
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Select at least one lap to export' : 'Export merged VBO'}
    >
      Export merged.vbo
      {selectedCount > 0 && (
        <span className={styles.badge}>{selectedCount}</span>
      )}
    </button>
  )
}
