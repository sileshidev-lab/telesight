"use client"

import { ExternalLink } from "lucide-react"
import useSWR from "swr"

interface LinkPreviewData {
  url: string
  domain: string
  title: string | null
  description: string | null
  image: string | null
  favicon: string | null
  siteName: string | null
}

const fetcher = async (url: string): Promise<LinkPreviewData | null> => {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

interface LinkPreviewProps {
  url: string
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const { data, isLoading } = useSWR<LinkPreviewData | null>(
    `/api/link-preview?url=${encodeURIComponent(url)}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60 * 60 * 1000, // 1 hour
      errorRetryCount: 1,
    }
  )

  if (isLoading) {
    return (
      <div className="mt-2 rounded-lg border border-border/60 bg-secondary/20 p-3 animate-pulse">
        <div className="flex gap-3">
          <div className="h-16 w-16 shrink-0 rounded-md bg-secondary/60" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="h-3 w-3/4 rounded bg-secondary/60" />
            <div className="h-2.5 w-full rounded bg-secondary/40" />
            <div className="h-2.5 w-1/2 rounded bg-secondary/40" />
          </div>
        </div>
      </div>
    )
  }

  if (!data || (!data.title && !data.description && !data.image)) {
    return null
  }

  const domain = data.domain?.replace(/^www\./, "")

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex rounded-lg border border-border/60 bg-secondary/20 overflow-hidden transition-colors hover:bg-secondary/40 hover:border-border group/link"
    >
      {data.image && (
        <div className="shrink-0 w-[120px] min-h-[80px] bg-secondary/30 relative overflow-hidden">
          <img
            src={data.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            crossOrigin="anonymous"
            onError={(e) => {
              ;(e.currentTarget.parentElement as HTMLElement).style.display =
                "none"
            }}
          />
        </div>
      )}
      <div className="flex flex-col gap-1 p-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {data.favicon && (
            <img
              src={data.favicon}
              alt=""
              className="h-3.5 w-3.5 rounded-sm shrink-0"
              loading="lazy"
              onError={(e) => {
                ;(e.currentTarget as HTMLElement).style.display = "none"
              }}
            />
          )}
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium truncate">
            {data.siteName || domain}
          </span>
        </div>
        {data.title && (
          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover/link:text-primary transition-colors">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {data.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground/50 truncate">
            {data.url}
          </span>
        </div>
      </div>
    </a>
  )
}
