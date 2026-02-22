"use client"

import { format } from "date-fns"
import {
  X,
  Hash,
  MessageSquare,
  Heart,
  Forward,
  Reply,
  Calendar,
} from "lucide-react"
import type { TelegramMessage } from "@/lib/telegram-types"
import { getMessageText } from "@/lib/telegram-types"

interface HashtagHeaderProps {
  hashtag: string
  messages: TelegramMessage[]
  onClear: () => void
}

export function HashtagHeader({
  hashtag,
  messages,
  onClear,
}: HashtagHeaderProps) {
  const regularMessages = messages.filter((m) => m.type === "message")

  const reactionMap = new Map<string, number>()
  let totalReactions = 0
  for (const msg of regularMessages) {
    if (msg.reactions) {
      for (const r of msg.reactions) {
        reactionMap.set(r.emoji, (reactionMap.get(r.emoji) || 0) + r.count)
        totalReactions += r.count
      }
    }
  }

  const topReactions = Array.from(reactionMap.entries())
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const dates = messages.map((m) => m.date).sort()
  const firstDate = dates[0] ? format(new Date(dates[0]), "MMM d, yyyy") : ""
  const lastDate = dates[dates.length - 1]
    ? format(new Date(dates[dates.length - 1]), "MMM d, yyyy")
    : ""

  const withLinks = regularMessages.filter((m) => {
    const text = getMessageText(m)
    return text.includes("http://") || text.includes("https://")
  }).length

  const withMedia = regularMessages.filter(
    (m) => m.photo || m.file || m.media_type
  ).length

  const forwarded = regularMessages.filter((m) => m.forwarded_from).length
  const replies = regularMessages.filter(
    (m) => m.reply_to_message_id
  ).length

  return (
    <div className="border-b border-primary/20 bg-primary/5 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Hash className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {hashtag}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {firstDate} &mdash; {lastDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 text-xs">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono font-medium text-foreground">
                  {regularMessages.length.toLocaleString()}
                </span>
                <span className="text-muted-foreground">posts</span>
              </div>

              {totalReactions > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 text-xs">
                  <Heart className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono font-medium text-foreground">
                    {totalReactions.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">reactions</span>
                </div>
              )}

              {withLinks > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                  {withLinks} with links
                </div>
              )}

              {withMedia > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                  {withMedia} with media
                </div>
              )}

              {forwarded > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 text-xs">
                  <Forward className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{forwarded}</span>
                </div>
              )}

              {replies > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 text-xs">
                  <Reply className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{replies}</span>
                </div>
              )}

              {topReactions.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border/40" />
                  {topReactions.map((r) => (
                    <span
                      key={r.emoji}
                      className="flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-1 text-xs"
                    >
                      <span>{r.emoji}</span>
                      <span className="font-mono text-muted-foreground">
                        {r.count.toLocaleString()}
                      </span>
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClear}
            className="rounded-lg border border-border bg-secondary/60 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Clear hashtag filter"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
