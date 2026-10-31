import axiosInstance from './axiosInstance'

/**
 * @typedef {{start: string, days: number, created: number, resolved: number}} TrendPoint
 * @typedef {{
 *   rangeDays: number, departmentId: string | null, departmentName: string | null, generatedAt: string,
 *   incidents: {open: number, openBreached: number, createdInRange: number, resolvedInRange: number,
 *     slaMetInRange: number, slaBreachedInRange: number, slaCompliancePercent: number | null,
 *     avgResolutionHours: number | null, openByPriority: Record<'P1' | 'P2' | 'P3' | 'P4', number>},
 *   trend: TrendPoint[],
 *   work: {assigned: number, inProgress: number, declined: number, overdue: number,
 *     assignedInRange: number, completedInRange: number, onTimePercent: number | null},
 *   projects: {active: number, onHold: number, completed: number},
 *   people: {employees: number, leads: number, admins: number, inactive: number, pendingRequests: number},
 *   departments: {id: string, name: string, leads: string[], employees: number, openTickets: number,
 *     activeProjects: number, openWork: number, overdueWork: number, completedInRange: number,
 *     onTimePercent: number | null}[]
 * }} Analytics
 */

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * @typedef {{id: string, name: string, projectName: string | null, assigned: number, inProgress: number,
 *   overdue: number, declined: number, completedInRange: number, onTimePercent: number | null,
 *   avgCompletionHours: number | null}} EmployeeStats
 * @typedef {{id: string, name: string, status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED', members: number, tasks: number,
 *   completed: number, open: number, overdue: number, completionPercent: number | null,
 *   nextDeadline: string | null}} ProjectProgress
 * @typedef {{overview: Analytics, employees: EmployeeStats[], projects: ProjectProgress[]}} TeamAnalytics
 */

/** The signed-in Lead's own department. @returns {Promise<TeamAnalytics>} */
export async function getTeamAnalytics(days) {
  const { data } = await axiosInstance.get('/api/team/analytics', { params: { days, tz: timeZone() } })
  return data
}

/**
 * Days are counted in the browser's time zone. Omit `departmentId` for all departments.
 * @returns {Promise<Analytics>}
 */
export async function getAnalytics(days, departmentId) {
  const params = { days, tz: timeZone() }
  if (departmentId) params.departmentId = departmentId
  const { data } = await axiosInstance.get('/api/admin/analytics', { params })
  return data
}
