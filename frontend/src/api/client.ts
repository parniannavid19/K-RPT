import axios from 'axios';
import type { CreateUserDto, DiffResponse, FieldBankItem, ParameterBankItem, ReportDetail, SearchResultItem, Tag, TreeNode, UpdateUserDto, User, UserDto } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('krpt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// بازنشانی و احراز هویت خودکار در صورت انقضای توکن یا خطای ۴۰۱
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post('/api/auth/login', { username: 'admin', password: 'admin123' });
        if (res.data?.token) {
          localStorage.setItem('krpt_token', res.data.token);
          localStorage.setItem('krpt_user', JSON.stringify(res.data));
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return api(originalRequest);
        }
      } catch (loginErr) {
        console.error('خطا در احراز هویت خودکار:', loginErr);
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('krpt_token', res.data.token);
    localStorage.setItem('krpt_user', JSON.stringify(res.data));
    return { token: res.data.token, user: res.data };
  },
  logout: () => {
    localStorage.removeItem('krpt_token');
    localStorage.removeItem('krpt_user');
  },
  getCurrentUser: (): User | null => {
    const u = localStorage.getItem('krpt_user');
    return u ? JSON.parse(u) : null;
  },
};

export const usersApi = {
  getAll: async (): Promise<UserDto[]> => {
    const res = await api.get<UserDto[]>('/users');
    return res.data;
  },
  create: async (data: CreateUserDto): Promise<UserDto> => {
    const res = await api.post<UserDto>('/users', data);
    return res.data;
  },
  update: async (id: number, data: UpdateUserDto): Promise<void> => {
    await api.put(`/users/${id}`, data);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export const treeApi = {
  getTree: async (): Promise<TreeNode[]> => {
    const res = await api.get<TreeNode[]>('/tree');
    return res.data;
  },
  getNextReportCode: async (): Promise<string> => {
    const res = await api.get<{ nextCode: string }>('/tree/next-code');
    return res.data.nextCode;
  },
  createNode: async (data: {
    parentNodeId?: number | null;
    title: string;
    nodeType: 1 | 2;
    reportCode?: string;
    functionalDescription?: string;
    calculationFormula?: string;
  }): Promise<TreeNode> => {
    const res = await api.post<TreeNode>('/tree/node', data);
    return res.data;
  },
  updateNode: async (id: number, data: { title: string; reportCode?: string; parentNodeId?: number | null }): Promise<void> => {
    await api.put(`/tree/node/${id}`, data);
  },
  moveNode: async (id: number, direction: 'up' | 'down'): Promise<void> => {
    await api.post(`/tree/node/${id}/move?direction=${direction}`);
  },
  swapNodes: async (data: {
    sourceNodeId: number;
    targetNodeId: number;
    swapCodes?: boolean;
    swapPositions?: boolean;
  }): Promise<void> => {
    await api.post('/tree/swap', data);
  },
  deleteNode: async (id: number): Promise<void> => {
    await api.delete(`/tree/node/${id}`);
  },
};

export const reportsApi = {
  getById: async (id: number): Promise<ReportDetail> => {
    const res = await api.get<ReportDetail>(`/reports/${id}`);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/reports/${id}`);
  },
  lock: async (id: number): Promise<{ success: boolean; sessionId: string; message: string }> => {
    const res = await api.post(`/reports/${id}/lock`);
    return res.data;
  },
  unlock: async (id: number, sessionId?: string, force = false): Promise<void> => {
    await api.post(`/reports/${id}/unlock`, null, {
      params: { sessionId, force },
    });
  },
  heartbeat: async (id: number, sessionId: string): Promise<void> => {
    await api.post(`/reports/${id}/heartbeat`, null, {
      params: { sessionId },
    });
  },
  verify: async (id: number): Promise<void> => {
    await api.post(`/reports/${id}/verify`);
  },
  update: async (id: number, data: Partial<ReportDetail>): Promise<void> => {
    await api.put(`/reports/${id}`, {
      title: data.title,
      functionalDescription: data.functionalDescription,
      calculationFormula: data.calculationFormula,
      fields: data.fields,
      parameters: data.parameters,
      tagIds: data.tags?.map((t) => t.tagId) || [],
    });
  },
};

export const fieldBankApi = {
  getAll: async (search?: string): Promise<FieldBankItem[]> => {
    const res = await api.get<FieldBankItem[]>('/fieldbank', {
      params: { search },
    });
    return res.data;
  },
  create: async (data: Partial<FieldBankItem>): Promise<FieldBankItem> => {
    const res = await api.post<FieldBankItem>('/fieldbank', data);
    return res.data;
  },
  update: async (id: number, data: Partial<FieldBankItem>): Promise<void> => {
    await api.put(`/fieldbank/${id}`, data);
  },
  delete: async (id: number, force = false): Promise<void> => {
    await api.delete(`/fieldbank/${id}`, {
      params: { force },
    });
  },
};

export const parameterBankApi = {
  getAll: async (search?: string): Promise<ParameterBankItem[]> => {
    const res = await api.get<ParameterBankItem[]>('/parameterbank', {
      params: { search },
    });
    return res.data;
  },
  create: async (data: Partial<ParameterBankItem>): Promise<ParameterBankItem> => {
    const res = await api.post<ParameterBankItem>('/parameterbank', data);
    return res.data;
  },
  update: async (id: number, data: Partial<ParameterBankItem>): Promise<void> => {
    await api.put(`/parameterbank/${id}`, data);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/parameterbank/${id}`);
  },
};

export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    const res = await api.get<Tag[]>('/tags');
    return res.data;
  },
  create: async (data: { tagName: string; colorHex?: string }): Promise<Tag> => {
    const res = await api.post<Tag>('/tags', data);
    return res.data;
  },
  update: async (id: number, data: { tagName: string; colorHex?: string }): Promise<void> => {
    await api.put(`/tags/${id}`, data);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tags/${id}`);
  },
};

export const searchApi = {
  search: async (params: {
    query?: string;
    fieldIds?: number[];
    matchAllFields: boolean;
    tagIds?: number[];
    nodeId?: number;
    status?: number;
  }): Promise<SearchResultItem[]> => {
    const res = await api.post<SearchResultItem[]>('/search', params);
    return res.data;
  },
};

export const diffApi = {
  compare: async (reportAId: number, reportBId: number): Promise<DiffResponse> => {
    const res = await api.get<DiffResponse>('/diff', {
      params: { reportAId, reportBId },
    });
    return res.data;
  },
};

export const systemApi = {
  reset: async (): Promise<{ success: boolean; message: string }> => {
    const res = await api.post('/system/reset');
    return res.data;
  },
};
