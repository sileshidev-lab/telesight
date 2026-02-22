"use client"

import { useState } from "react"
import { UploadScreen } from "@/components/upload-screen"
import { ChannelViewer } from "@/components/channel-viewer"
import type { TelegramExport } from "@/lib/telegram-types"

export default function Home() {
  const [data, setData] = useState<TelegramExport | null>(null)
  const [mediaRoot, setMediaRoot] = useState<FileSystemDirectoryHandle | null>(null)

  if (!data) {
    return <UploadScreen onDataLoaded={setData} onMediaRootSelected={setMediaRoot} mediaRoot={mediaRoot} />
  }

  return (
    <ChannelViewer
      data={data}
      onReset={() => {
        setData(null)
        setMediaRoot(null)
      }}
      mediaRoot={mediaRoot}
      onMediaRootSelected={setMediaRoot}
    />
  )
}
