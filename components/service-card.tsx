"use client"

import { format } from "date-fns"
import { Settings, Image, Phone, Bell } from "lucide-react"
import type { TelegramMessage } from "@/lib/telegram-types"

interface ServiceCardProps {
  message: TelegramMessage
}

function getActionIcon(action?: string) {
  switch (action) {
    case "edit_group_photo":
      return Image
    case "group_call":
      return Phone
    case "create_channel":
      return Bell
    default:
      return Settings
  }
}

function getActionLabel(action?: string) {
  switch (action) {
    case "edit_group_photo":
      return "Channel photo updated"
    case "group_call":
      return "Group call"
    case "create_channel":
      return "Channel created"
    case "pin_message":
      return "Message pinned"
    case "clear_history":
      return "History cleared"
    default:
      return action?.replace(/_/g, " ") || "Service event"
  }
}

export function ServiceCard({ message }: ServiceCardProps) {
  const Icon = getActionIcon(message.action)
  const label = getActionLabel(message.action)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-secondary/20 px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-medium text-foreground/70">
          {label}
        </span>
        <time className="text-[10px] text-muted-foreground font-mono">
          {format(new Date(message.date), "MMM d, yyyy 'at' HH:mm")}
        </time>
      </div>
      {message.title && (
        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">
          {message.title}
        </span>
      )}
    </div>
  )
}
