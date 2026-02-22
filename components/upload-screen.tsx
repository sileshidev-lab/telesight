"use client"

import { useCallback } from "react"
import { Upload, FolderOpen, Check } from "lucide-react"
import type { TelegramExport } from "@/lib/telegram-types"

interface UploadScreenProps {
  onDataLoaded: (data: TelegramExport) => void
  onMediaRootSelected: (handle: FileSystemDirectoryHandle) => void
  mediaRoot: FileSystemDirectoryHandle | null
}

export function UploadScreen({ onDataLoaded, onMediaRootSelected, mediaRoot }: UploadScreenProps) {
  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          if (json.messages && Array.isArray(json.messages)) {
            onDataLoaded(json as TelegramExport)
          } else {
            alert("Invalid Telegram export file. Missing 'messages' array.")
          }
        } catch {
          alert("Failed to parse JSON file.")
        }
      }
      reader.readAsText(file)
    },
    [onDataLoaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith(".json")) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 max-w-lg text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <div className="h-3 w-3 rounded-sm bg-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Telegrid
            </h1>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            Import your Telegram channel export to visualize messages in a
            beautiful masonry grid.
          </p>
        </div>

        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="group relative flex w-full cursor-pointer flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 transition-all hover:border-primary/50 hover:bg-card"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/10">
            <Upload className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-foreground">
              Drop your JSON file here
            </span>
            <span className="text-xs text-muted-foreground">
              or click to browse
            </span>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Upload Telegram export JSON file"
          />
        </label>

        <div className="flex flex-col items-center gap-3 w-full">
          <div className="h-px w-full max-w-[200px] bg-border/50" />
          <p className="text-xs text-muted-foreground/60">Optional: set export folder to view media</p>
          <button
            onClick={async () => {
              try {
                const handle = await window.showDirectoryPicker({ mode: "read" })
                onMediaRootSelected(handle)
              } catch {
                // User cancelled
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/30 px-4 py-2.5 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
          >
            {mediaRoot ? (
              <>
                <Check className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{mediaRoot.name}</span>
                <span className="text-xs text-muted-foreground/60">selected</span>
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4" />
                <span>Select export folder</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Export from Telegram Desktop: Settings &rarr; Advanced &rarr; Export
          Telegram Data
        </p>
      </div>
    </main>
  )
}
