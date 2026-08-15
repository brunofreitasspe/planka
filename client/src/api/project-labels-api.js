import ky from 'ky';

const baseUrl = process.env.REACT_APP_API_URL || '/api';

export const getProjectLabels = async (projectId) => {
  return ky(`${baseUrl}/projects/${projectId}/labels`).json();
};

export const createProjectLabel = async (projectId, data) => {
  return ky(`${baseUrl}/projects/${projectId}/labels`, {
    method: 'post',
    json: data,
  }).json();
};

export const updateProjectLabel = async (projectId, labelId, data) => {
  return ky(`${baseUrl}/projects/${projectId}/labels/${labelId}`, {
    method: 'patch',
    json: data,
  }).json();
};

export const deleteProjectLabel = async (projectId, labelId) => {
  return ky(`${baseUrl}/projects/${projectId}/labels/${labelId}`, {
    method: 'delete',
  });
};

export const promoteLabel = async (boardId, labelId, data) => {
  return ky(`${baseUrl}/boards/${boardId}/labels/${labelId}/promote`, {
    method: 'post',
    json: data,
  }).json();
};

export const demoteLabel = async (boardId, labelId) => {
  return ky(`${baseUrl}/boards/${boardId}/labels/${labelId}/demote`, {
    method: 'post',
  }).json();
};

export const getBoardLabels = async (boardId) => {
  return ky(`${baseUrl}/boards/${boardId}/labels`).json();
};
