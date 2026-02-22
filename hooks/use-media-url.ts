"use client"

import { useState, useEffect } from "react"

const urlCache = new Map<string, string>()

export function useMediaUrl(
  mediaRoot: FileSystemDirectoryHandle | null,
  relativePath: string | undefined | null
): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!mediaRoot || !relativePath) {
      setUrl(null)
      return
    }

    // Skip placeholder strings from Telegram
    if (relativePath.startsWith("(File not included")) {
      setUrl(null)
      return
    }

    const cacheKey = `${mediaRoot.name}:${relativePath}`
    if (urlCache.has(cacheKey)) {
      setUrl(urlCache.get(cacheKey)!)
      return
    }

    let cancelled = false

    async function resolve() {
      try {
        // Path is like "photos/photo_123@30-04-2024_11-49-39.jpg"
        const parts = relativePath!.split("/")
        let current: FileSystemDirectoryHandle = mediaRoot!

        // Navigate to subdirectories
        for (let i = 0; i < parts.length - 1; i++) {
          current = await current.getDirectoryHandle(parts[i])
        }

        // Get the file
        const fileHandle = await current.getFileHandle(parts[parts.length - 1])
        const file = await fileHandle.getFile()
        const objectUrl = URL.createObjectURL(file)

        if (!cancelled) {
          urlCache.set(cacheKey, objectUrl)
          setUrl(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setUrl(null)
        }
      }
    }

    resolve()

    return () => {
      cancelled = true
    }
  }, [mediaRoot, relativePath])

  return url
}
