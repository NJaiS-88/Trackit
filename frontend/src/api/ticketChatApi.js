import axiosInstance from './axiosInstance'

/**
 * @typedef {{id: string, authorId: string, authorName: string | null, authorRole: 'REPORTER' | 'ASSIGNEE', body: string, createdAt: string}} TicketMessage
 * @typedef {{canPost: boolean, postingDisabledReason: string | null, messages: TicketMessage[]}} TicketChat
 */

const messagesPath = (incidentId) => `/api/incidents/${encodeURIComponent(incidentId)}/messages`

/** The ticket's conversation, oldest first. @returns {Promise<TicketChat>} */
export async function getTicketChat(incidentId) {
  const { data } = await axiosInstance.get(messagesPath(incidentId))
  return data
}

/** @returns {Promise<TicketMessage>} */
export async function sendTicketMessage(incidentId, body) {
  const { data } = await axiosInstance.post(messagesPath(incidentId), { body })
  return data
}
