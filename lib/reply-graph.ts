import type { TelegramMessage } from "./telegram-types"
import { getMessageText } from "./telegram-types"

export interface GraphNode {
  id: number
  message: TelegramMessage
  text: string
  date: Date
  reactionCount: number
  hasMedia: boolean
  isForwardedReply: boolean
  // d3-force simulation fields
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  // visual
  radius: number
  chainId: number
}

export interface GraphEdge {
  source: number
  sourceNode?: GraphNode
  targetNode?: GraphNode
  target: number
}

export interface ReplyChain {
  id: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  rootId: number
  depth: number
}

export interface ReplyGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  chains: ReplyChain[]
  selfReplyCount: number
  crossChannelReplyCount: number
}

/**
 * Build a reply graph from messages.
 * selfOnly = true: only show messages replying to another message in the same channel
 * selfOnly = false: also include replies referencing messages not found in this export (cross-channel)
 */
export function buildReplyGraph(
  messages: TelegramMessage[],
  includeCrossChannel: boolean
): ReplyGraphData {
  const messageMap = new Map<number, TelegramMessage>()
  for (const msg of messages) {
    messageMap.set(msg.id, msg)
  }

  // Find all reply relationships
  const replyMessages = messages.filter(
    (m) => m.type === "message" && m.reply_to_message_id != null
  )

  let selfReplyCount = 0
  let crossChannelReplyCount = 0

  const nodeIds = new Set<number>()
  const edges: GraphEdge[] = []

  for (const msg of replyMessages) {
    const targetId = msg.reply_to_message_id!
    const targetExists = messageMap.has(targetId)

    if (targetExists) {
      selfReplyCount++
      nodeIds.add(msg.id)
      nodeIds.add(targetId)
      edges.push({ source: targetId, target: msg.id })
    } else {
      crossChannelReplyCount++
      if (includeCrossChannel) {
        nodeIds.add(msg.id)
        // Create a phantom node for the missing target
        nodeIds.add(targetId)
        edges.push({ source: targetId, target: msg.id })
      }
    }
  }

  // Build nodes
  const nodes: GraphNode[] = []
  for (const id of nodeIds) {
    const msg = messageMap.get(id)
    const text = msg ? getMessageText(msg) : "[External message]"
    const reactionCount = msg?.reactions?.reduce((s, r) => s + r.count, 0) || 0
    const hasMedia = !!(msg?.photo || msg?.file || msg?.media_type)

    nodes.push({
      id,
      message: msg || createPhantomMessage(id),
      text: text.slice(0, 120),
      date: msg ? new Date(msg.date) : new Date(0),
      reactionCount,
      hasMedia,
      isForwardedReply: !messageMap.has(id),
      radius: Math.max(6, Math.min(20, 6 + Math.sqrt(reactionCount) * 1.5)),
      chainId: 0,
    })
  }

  // Build adjacency list to find connected components (chains)
  const adj = new Map<number, number[]>()
  for (const id of nodeIds) {
    adj.set(id, [])
  }
  for (const edge of edges) {
    adj.get(edge.source)!.push(edge.target)
    adj.get(edge.target)!.push(edge.source)
  }

  // BFS to find chains
  const visited = new Set<number>()
  const chains: ReplyChain[] = []
  let chainId = 0

  const nodeMap = new Map<number, GraphNode>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  for (const startId of nodeIds) {
    if (visited.has(startId)) continue
    chainId++

    const queue = [startId]
    visited.add(startId)
    const chainNodeIds: number[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      chainNodeIds.push(current)
      const node = nodeMap.get(current)
      if (node) node.chainId = chainId

      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }

    // Compute depth: find the root (node with no incoming edge in this chain)
    const chainEdges = edges.filter(
      (e) => chainNodeIds.includes(e.source) && chainNodeIds.includes(e.target)
    )
    const hasIncoming = new Set(chainEdges.map((e) => e.target))
    const roots = chainNodeIds.filter((id) => !hasIncoming.has(id))
    const rootId = roots[0] || chainNodeIds[0]

    // BFS depth from root
    let maxDepth = 0
    const depthQueue: [number, number][] = [[rootId, 0]]
    const depthVisited = new Set<number>([rootId])
    while (depthQueue.length > 0) {
      const [cid, depth] = depthQueue.shift()!
      maxDepth = Math.max(maxDepth, depth)
      for (const e of chainEdges) {
        if (e.source === cid && !depthVisited.has(e.target)) {
          depthVisited.add(e.target)
          depthQueue.push([e.target, depth + 1])
        }
      }
    }

    chains.push({
      id: chainId,
      nodes: chainNodeIds.map((id) => nodeMap.get(id)!),
      edges: chainEdges,
      rootId,
      depth: maxDepth,
    })
  }

  // Sort chains: biggest first
  chains.sort((a, b) => b.nodes.length - a.nodes.length)

  return {
    nodes,
    edges,
    chains,
    selfReplyCount,
    crossChannelReplyCount,
  }
}

function createPhantomMessage(id: number): TelegramMessage {
  return {
    id,
    type: "message",
    date: "1970-01-01T00:00:00",
    date_unixtime: "0",
    text: "[External / missing message]",
    text_entities: [],
  }
}
