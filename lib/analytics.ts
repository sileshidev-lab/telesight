import type { TelegramMessage } from "./telegram-types"
import { getMessageText } from "./telegram-types"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HourDistribution {
  hour: number
  label: string
  count: number
}

export interface DayOfWeekDistribution {
  day: number
  label: string
  count: number
}

export interface MonthDistribution {
  month: number
  year: number
  label: string
  count: number
}

export interface YearDistribution {
  year: number
  count: number
}

export interface HashtagStat {
  tag: string
  count: number
  totalReactions: number
  firstUsed: string
  lastUsed: string
  topReaction: { emoji: string; count: number } | null
}

export interface TimeInsights {
  hourly: HourDistribution[]
  dayOfWeek: DayOfWeekDistribution[]
  monthly: MonthDistribution[]
  yearly: YearDistribution[]
  peakHour: HourDistribution
  quietHour: HourDistribution
  peakDay: DayOfWeekDistribution
  quietDay: DayOfWeekDistribution
  peakMonth: MonthDistribution
  avgPerDay: number
  avgPerWeek: number
  avgPerMonth: number
  longestStreak: number
  longestGap: number
  longestStreakStart: string
  longestGapStart: string
}

export interface ContentInsights {
  avgLength: number
  medianLength: number
  longestMessage: TelegramMessage | null
  shortestMessage: TelegramMessage | null
  totalCharacters: number
  totalWords: number
  avgWordsPerPost: number
  postsWithMedia: number
  postsWithLinks: number
  postsWithReactions: number
  postsForwarded: number
  postsWithReplies: number
  topForwardedFrom: { name: string; count: number }[]
  mostReactedPost: TelegramMessage | null
  totalReactions: number
}

export interface OverviewInsights {
  time: TimeInsights
  content: ContentInsights
  years: number[]
}

// ─── Day names and Hour labels ──────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function hourLabel(h: number): string {
  if (h === 0) return "12 AM"
  if (h < 12) return `${h} AM`
  if (h === 12) return "12 PM"
  return `${h - 12} PM`
}

// ─── Main compute function ──────────────────────────────────────────────────

export function computeAnalytics(
  messages: TelegramMessage[],
  filterYear?: number,
  filterMonth?: number
): OverviewInsights {
  // Determine years available
  const yearsSet = new Set<number>()
  for (const m of messages) {
    if (m.type === "message") {
      yearsSet.add(new Date(m.date).getFullYear())
    }
  }
  const years = Array.from(yearsSet).sort()

  // Filter messages
  let filtered = messages.filter((m) => m.type === "message")
  if (filterYear !== undefined) {
    filtered = filtered.filter((m) => new Date(m.date).getFullYear() === filterYear)
  }
  if (filterMonth !== undefined) {
    filtered = filtered.filter((m) => new Date(m.date).getMonth() === filterMonth)
  }

  return {
    time: computeTimeInsights(filtered),
    content: computeContentInsights(filtered),
    years,
  }
}

// ─── Time Insights ──────────────────────────────────────────────────────────

function computeTimeInsights(messages: TelegramMessage[]): TimeInsights {
  // Hourly distribution
  const hourCounts = Array(24).fill(0)
  const dayCounts = Array(7).fill(0)
  const monthMap = new Map<string, { month: number; year: number; count: number }>()
  const yearMap = new Map<number, number>()
  const daySet = new Set<string>()

  for (const msg of messages) {
    const d = new Date(msg.date)
    hourCounts[d.getHours()]++
    dayCounts[d.getDay()]++

    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (!monthMap.has(ym)) {
      monthMap.set(ym, { month: d.getMonth(), year: d.getFullYear(), count: 0 })
    }
    monthMap.get(ym)!.count++

    yearMap.set(d.getFullYear(), (yearMap.get(d.getFullYear()) || 0) + 1)
    daySet.add(d.toISOString().split("T")[0])
  }

  const hourly: HourDistribution[] = hourCounts.map((count, i) => ({
    hour: i,
    label: hourLabel(i),
    count,
  }))

  const dayOfWeek: DayOfWeekDistribution[] = dayCounts.map((count, i) => ({
    day: i,
    label: DAY_SHORT[i],
    count,
  }))

  const monthly: MonthDistribution[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      ...val,
      label: new Date(val.year, val.month).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
    }))

  const yearly: YearDistribution[] = Array.from(yearMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year, count }))

  // Peaks
  const peakHour = hourly.reduce((a, b) => (b.count > a.count ? b : a), hourly[0])
  const quietHour = hourly.reduce((a, b) => (b.count < a.count ? b : a), hourly[0])
  const peakDay = dayOfWeek.reduce((a, b) => (b.count > a.count ? b : a), dayOfWeek[0])
  const quietDay = dayOfWeek.reduce((a, b) => (b.count < a.count ? b : a), dayOfWeek[0])
  const peakMonth = monthly.length > 0
    ? monthly.reduce((a, b) => (b.count > a.count ? b : a), monthly[0])
    : { month: 0, year: 0, label: "-", count: 0 }

  // Date range
  const sortedDays = Array.from(daySet).sort()
  const totalDays = sortedDays.length || 1
  const totalWeeks = Math.max(1, totalDays / 7)
  const totalMonths = Math.max(1, monthMap.size)

  // Streak calculation
  let longestStreak = 0
  let longestGap = 0
  let currentStreak = 1
  let longestStreakStart = sortedDays[0] || ""
  let longestGapStart = ""
  let streakStart = sortedDays[0] || ""

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1])
    const curr = new Date(sortedDays[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)

    if (diffDays === 1) {
      currentStreak++
    } else {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
        longestStreakStart = streakStart
      }
      if (diffDays > longestGap) {
        longestGap = diffDays
        longestGapStart = sortedDays[i - 1]
      }
      currentStreak = 1
      streakStart = sortedDays[i]
    }
  }
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
    longestStreakStart = streakStart
  }

  return {
    hourly,
    dayOfWeek,
    monthly,
    yearly,
    peakHour,
    quietHour,
    peakDay,
    quietDay,
    peakMonth,
    avgPerDay: Math.round(messages.length / totalDays * 10) / 10,
    avgPerWeek: Math.round(messages.length / totalWeeks * 10) / 10,
    avgPerMonth: Math.round(messages.length / totalMonths * 10) / 10,
    longestStreak,
    longestGap,
    longestStreakStart,
    longestGapStart,
  }
}

// ─── Content Insights ───────────────────────────────────────────────────────

function computeContentInsights(messages: TelegramMessage[]): ContentInsights {
  const lengths: number[] = []
  let totalChars = 0
  let totalWords = 0
  let postsWithMedia = 0
  let postsWithLinks = 0
  let postsWithReactions = 0
  let postsForwarded = 0
  let postsWithReplies = 0
  let totalReactions = 0
  let longestMessage: TelegramMessage | null = null
  let shortestMessage: TelegramMessage | null = null
  let mostReactedPost: TelegramMessage | null = null
  let maxReactions = 0
  let maxLen = 0
  let minLen = Infinity

  const forwardMap = new Map<string, number>()

  for (const msg of messages) {
    const text = getMessageText(msg)
    const len = text.length
    lengths.push(len)
    totalChars += len
    totalWords += text.split(/\s+/).filter(Boolean).length

    if (len > maxLen) {
      maxLen = len
      longestMessage = msg
    }
    if (len < minLen && len > 0) {
      minLen = len
      shortestMessage = msg
    }

    if (msg.photo || msg.file || msg.media_type) postsWithMedia++
    if (text.includes("http://") || text.includes("https://")) postsWithLinks++
    if (msg.reactions && msg.reactions.length > 0) {
      postsWithReactions++
      const total = msg.reactions.reduce((s, r) => s + r.count, 0)
      totalReactions += total
      if (total > maxReactions) {
        maxReactions = total
        mostReactedPost = msg
      }
    }
    if (msg.forwarded_from) {
      postsForwarded++
      forwardMap.set(msg.forwarded_from, (forwardMap.get(msg.forwarded_from) || 0) + 1)
    }
    if (msg.reply_to_message_id) postsWithReplies++
  }

  lengths.sort((a, b) => a - b)
  const medianLength = lengths.length > 0 ? lengths[Math.floor(lengths.length / 2)] : 0

  const topForwardedFrom = Array.from(forwardMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    avgLength: messages.length > 0 ? Math.round(totalChars / messages.length) : 0,
    medianLength,
    longestMessage,
    shortestMessage,
    totalCharacters: totalChars,
    totalWords,
    avgWordsPerPost: messages.length > 0 ? Math.round(totalWords / messages.length) : 0,
    postsWithMedia,
    postsWithLinks,
    postsWithReactions,
    postsForwarded,
    postsWithReplies,
    topForwardedFrom,
    mostReactedPost,
    totalReactions,
  }
}

// ─── Hashtag Analytics ──────────────────────────────────────────────────────

export function computeHashtagAnalytics(messages: TelegramMessage[]): HashtagStat[] {
  const map = new Map<
    string,
    {
      count: number
      totalReactions: number
      firstUsed: string
      lastUsed: string
      reactionMap: Map<string, number>
    }
  >()

  const filtered = messages.filter((m) => m.type === "message")

  for (const msg of filtered) {
    const text = getMessageText(msg)
    const hashtags = text.match(/#[\w\u0400-\u04FF]+/gi)
    if (!hashtags) continue

    const unique = new Set(hashtags.map((h) => h.toLowerCase()))
    for (const tag of unique) {
      if (!map.has(tag)) {
        map.set(tag, {
          count: 0,
          totalReactions: 0,
          firstUsed: msg.date,
          lastUsed: msg.date,
          reactionMap: new Map(),
        })
      }
      const entry = map.get(tag)!
      entry.count++
      if (msg.date < entry.firstUsed) entry.firstUsed = msg.date
      if (msg.date > entry.lastUsed) entry.lastUsed = msg.date

      if (msg.reactions) {
        for (const r of msg.reactions) {
          entry.totalReactions += r.count
          entry.reactionMap.set(r.emoji, (entry.reactionMap.get(r.emoji) || 0) + r.count)
        }
      }
    }
  }

  return Array.from(map.entries())
    .map(([tag, data]) => {
      let topReaction: { emoji: string; count: number } | null = null
      let maxR = 0
      for (const [emoji, count] of data.reactionMap) {
        if (count > maxR) {
          maxR = count
          topReaction = { emoji, count }
        }
      }
      return {
        tag,
        count: data.count,
        totalReactions: data.totalReactions,
        firstUsed: data.firstUsed,
        lastUsed: data.lastUsed,
        topReaction,
      }
    })
    .sort((a, b) => b.count - a.count)
}
