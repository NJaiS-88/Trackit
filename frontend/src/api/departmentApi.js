import axiosInstance from './axiosInstance'

/**
 * @typedef {{id: string, name: string, description: string | null, createdAt: string}} Department
 * @typedef {{content: Department[], page: {size: number, number: number, totalElements: number, totalPages: number}}} DepartmentPage
 */

/** @returns {Promise<DepartmentPage>} */
export async function getDepartments({ page = 0, size = 20, sort = 'name,asc' } = {}) {
  const { data } = await axiosInstance.get('/api/admin/departments', { params: { page, size, sort } })
  return data
}

/** Every department, A to Z, across all pages. @returns {Promise<Department[]>} */
export async function getAllDepartments() {
  const departments = []
  for (let page = 0; ; page += 1) {
    // The API caps page size at 100
    const data = await getDepartments({ page, size: 100 })
    departments.push(...data.content)
    if (page + 1 >= data.page.totalPages) return departments
  }
}

/** @returns {Promise<Department>} */
export async function createDepartment(data) {
  const { data: department } = await axiosInstance.post('/api/admin/departments', data)
  return department
}
