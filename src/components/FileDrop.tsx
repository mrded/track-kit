import { useCallback } from 'react'
import styles from './FileDrop.module.css'

interface FileDropProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function FileDrop({ onFiles, disabled = false }: FileDropProps) {
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const vboFiles = Array.from(files).filter((f) =>
        f.name.toLowerCase().endsWith('.vbo'),
      )
      if (vboFiles.length > 0) {
        onFiles(vboFiles)
      }
    },
    [onFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input so same file can be re-added
      e.target.value = ''
    },
    [handleFiles],
  )

  return (
    <div
      className={`${styles.dropZone} ${disabled ? styles.disabled : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      aria-label="Drop VBO files here"
    >
      <p className={styles.label}>Drag &amp; drop VBO files here</p>
      <label className={styles.button}>
        Browse files
        <input
          type="file"
          accept=".vbo"
          multiple
          className={styles.hiddenInput}
          onChange={handleChange}
          disabled={disabled}
        />
      </label>
    </div>
  )
}
