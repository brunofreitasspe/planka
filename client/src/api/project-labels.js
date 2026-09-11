/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

/* Actions */

const fetchProjectLabels = (projectId, headers) =>
  socket.get(`/projects/${projectId}/labels?includeUsageStats=true`, undefined, headers);

const createProjectLabel = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/labels`, data, headers);

const updateProjectLabel = (projectId, id, data, headers) =>
  socket.patch(`/projects/${projectId}/labels/${id}`, data, headers);

const deleteProjectLabel = (projectId, id, headers) =>
  socket.delete(`/projects/${projectId}/labels/${id}`, undefined, headers);

export default {
  fetchProjectLabels,
  createProjectLabel,
  updateProjectLabel,
  deleteProjectLabel,
};
