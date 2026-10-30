import axiosInstance from './axiosInstance'

/**
 * @typedef {'PENDING' | 'APPROVED' | 'REJECTED'} AccountRequestStatus
 * @typedef {{id: string, name: string, email: string, status: AccountRequestStatus, createdAt: string, reviewedAt: string | null}} AccountRequest
 * @typedef {{content: AccountRequest[], page: {size: number, number: number, totalElements: number, totalPages: number}}} AccountRequestPage
 */

/** Omit `status` to list every request. @returns {Promise<AccountRequestPage>} */
export async function getAccountRequests({ status, page = 0, size = 20 } = {}) {
  const params = { page, size, sort: 'createdAt,desc' }
  if (status) params.status = status
  const { data } = await axiosInstance.get('/api/admin/account-requests', { params })
  return data
}

/** @returns {Promise<AccountRequest>} */
export async function approveAccountRequest(id) {
  const { data } = await axiosInstance.post(`/api/admin/account-requests/${encodeURIComponent(id)}/approve`)
  return data
}

/** @returns {Promise<AccountRequest>} */
export async function rejectAccountRequest(id) {
  const { data } = await axiosInstance.post(`/api/admin/account-requests/${encodeURIComponent(id)}/reject`)
  return data
}
