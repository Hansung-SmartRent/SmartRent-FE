const BASE_URL = 'https://hansung-smartrent.duckdns.org';

async function request(path, { method = 'GET', token, body, params } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.message || `요청에 실패했습니다. (${res.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

export const adminApi = {
  // 대시보드 · 대여 조회
  getSummary: (token) => request('/api/v1/admin/summary', { token }),
  getRentals: (token, params) => request('/api/v1/admin/rentals', { token, params }),
  lookupPickups: (token, params) => request('/api/v1/admin/pickups/lookup', { token, params }),
  lookupReturns: (token, params) => request('/api/v1/admin/returns/lookup', { token, params }),

  // 수령 · 반납 · 취소 · 정정
  pickupRental: (token, id, body) =>
    request(`/api/v1/admin/rentals/${id}/pickup`, { method: 'POST', token, body }),
  returnRental: (token, id, body) =>
    request(`/api/v1/admin/rentals/${id}/return`, { method: 'POST', token, body }),
  cancelRental: (token, id, body) =>
    request(`/api/v1/admin/rentals/${id}/cancel`, { method: 'POST', token, body }),
  markDamageDiscovered: (token, id, body) =>
    request(`/api/v1/admin/rentals/${id}/damage-discovered`, { method: 'POST', token, body }),
  correctReturn: (token, id, body) =>
    request(`/api/v1/admin/rentals/${id}/correct-return`, { method: 'POST', token, body }),
  correctNoShow: (token, id, body) =>
    request(`/api/v1/admin/rentals/${id}/correct-no-show`, { method: 'POST', token, body }),

  // 현장 대여 (Walk-in)
  getWalkInOptions: (token, params) =>
    request('/api/v1/admin/walk-ins/options', { token, params }),
  createWalkIn: (token, body) =>
    request('/api/v1/admin/walk-ins', { method: 'POST', token, body }),

  // 학생 관리 · 경고
  getStudents: (token, params) => request('/api/v1/admin/students', { token, params }),
  getStudentDetail: (token, id) => request(`/api/v1/admin/students/${id}`, { token }),
  updateStudent: (token, id, body) =>
    request(`/api/v1/admin/students/${id}`, { method: 'PATCH', token, body }),
  approveStudent: (token, id) =>
    request(`/api/v1/admin/students/${id}/approve`, { method: 'POST', token }),
  rejectStudent: (token, id, body) =>
    request(`/api/v1/admin/students/${id}/reject`, { method: 'POST', token, body }),
  revokeWarning: (token, id, body) =>
    request(`/api/v1/admin/warnings/${id}/revoke`, { method: 'POST', token, body }),

  // 기자재 모델 · 기기 관리
  getModelDetail: (token, id) => request(`/api/v1/admin/models/${id}`, { token }),
  createModel: (token, body) =>
    request('/api/v1/admin/models', { method: 'POST', token, body }),
  updateModel: (token, id, body) =>
    request(`/api/v1/admin/models/${id}`, { method: 'PUT', token, body }),
  uploadModelImages: (token, id, formData) =>
    request(`/api/v1/admin/models/${id}/images`, { method: 'POST', token, body: formData }),
  archiveModel: (token, id) =>
    request(`/api/v1/admin/models/${id}/archive`, { method: 'POST', token }),
  createUnit: (token, modelId, body) =>
    request(`/api/v1/admin/models/${modelId}/units`, { method: 'POST', token, body }),
  updateUnit: (token, unitId, body) =>
    request(`/api/v1/admin/units/${unitId}`, { method: 'PATCH', token, body }),
  deleteUnit: (token, unitId) =>
    request(`/api/v1/admin/units/${unitId}`, { method: 'DELETE', token }),

  // 운영 시간 · 휴무일
  getModelHours: (token, modelId) => request(`/api/v1/admin/models/${modelId}/hours`, { token }),
  updateModelHours: (token, modelId, body) =>
    request(`/api/v1/admin/models/${modelId}/hours`, { method: 'PUT', token, body }),
  resetModelHours: (token, modelId, date) =>
    request(`/api/v1/admin/models/${modelId}/hours/${date}`, { method: 'DELETE', token }),
  addHoliday: (token, body) =>
    request('/api/v1/admin/holidays', { method: 'POST', token, body }),
  openHoliday: (token, date, body) =>
    request(`/api/v1/admin/holidays/${date}/open`, { method: 'POST', token, body }),
  deleteHoliday: (token, date) =>
    request(`/api/v1/admin/holidays/${date}`, { method: 'DELETE', token }),

  // 공지사항
  createNotice: (token, body) =>
    request('/api/v1/admin/notices', { method: 'POST', token, body }),
  updateNotice: (token, id, body) =>
    request(`/api/v1/admin/notices/${id}`, { method: 'PUT', token, body }),
  deleteNotice: (token, id) =>
    request(`/api/v1/admin/notices/${id}`, { method: 'DELETE', token }),

  // 문의 · 구매 요청
  getInquiries: (token, params) => request('/api/v1/admin/inquiries', { token, params }),
  answerInquiry: (token, id, body) =>
    request(`/api/v1/admin/inquiries/${id}/answer`, { method: 'POST', token, body }),
  getPurchaseRequests: (token, params) =>
    request('/api/v1/admin/purchase-requests', { token, params }),
  answerPurchaseRequest: (token, id, body) =>
    request(`/api/v1/admin/purchase-requests/${id}/answer`, { method: 'POST', token, body }),

  // 통계 · 기록
  getStats: (token, params) => request('/api/v1/admin/stats', { token, params }),
  getAuditLogs: (token, params) => request('/api/v1/admin/audit-logs', { token, params }),
};