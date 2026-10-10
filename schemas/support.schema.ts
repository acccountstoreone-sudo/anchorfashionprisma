import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const optionalUuid = z.preprocess((val) => {
  if (typeof val === "string" && UUID_REGEX.test(val.trim())) {
    return val.trim();
  }
  return undefined;
}, z.string().uuid().optional());

export const ticketPriorityEnum = z.preprocess((val) => {
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "urgent") return "critical";
    return lower;
  }
  return val;
}, z.enum(["low", "medium", "high", "critical"]));

export const ticketStatusEnum = z.preprocess((val) => {
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "assigned") return "in_progress";
    if (lower === "escalated") return "in_progress";
    return lower;
  }
  return val;
}, z.enum([
  "open",
  "pending",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed",
  "reopened",
]));

export const agentStatusEnum = z.preprocess((val) => {
  if (typeof val === "string") return val.toLowerCase().trim();
  return val;
}, z.enum(["online", "busy", "offline"]));

export const senderTypeEnum = z.preprocess((val) => {
  if (typeof val === "string") return val.toUpperCase().trim();
  return val;
}, z.enum(["CUSTOMER", "AGENT", "SYSTEM", "AI"]));

export const createSupportTicketSchema = z.object({
  profile_id: optionalUuid,
  customer_id: optionalUuid,
  assigned_agent_id: optionalUuid,
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  priority: ticketPriorityEnum.default("medium"),
  status: ticketStatusEnum.optional().default("open"),
  department_id: optionalUuid,
  order_id: z.string().optional(),
});

export const updateSupportTicketSchema = z.object({
  status: ticketStatusEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  department_id: optionalUuid,
  assigned_agent_id: optionalUuid,
  profile_id: optionalUuid,
  customer_id: optionalUuid,
  subject: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const createTicketMessageSchema = z
  .object({
    ticket_id: z.string().uuid(),
    message: z.string().optional(),
    body: z.string().optional(),
    is_internal_note: z.boolean().optional().default(false),
    is_internal: z.boolean().optional(),
    sender_type: senderTypeEnum.default("AGENT"),
    sender_id: optionalUuid,
  })
  .refine((data) => !!(data.message?.trim() || data.body?.trim()), {
    message: "Message is required",
    path: ["message"],
  });

export const createTicketAttachmentSchema = z
  .object({
    ticket_id: optionalUuid,
    message_id: optionalUuid,
    file_name: z.string().min(1, "File name is required"),
    file_url: z.string().url(),
    file_type: z.string().optional(),
    file_size_bytes: z.number().int().optional(),
  })
  .refine((data) => data.ticket_id || data.message_id, {
    message: "Either ticket_id or message_id must be provided",
    path: ["ticket_id"],
  });

export const createKnowledgeBaseArticleSchema = z.object({
  category_id: optionalUuid,
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  is_published: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const updateKnowledgeBaseArticleSchema =
  createKnowledgeBaseArticleSchema.partial();
