export const selectProjectLabels = (state, projectId) => {
  const labels = state.projectLabels?.[projectId] || {};
  return Object.values(labels);
};

export const selectProjectLabelById = (state, projectId, labelId) => {
  return state.projectLabels?.[projectId]?.[labelId];
};

export const selectProjectLabelsSorted = (state, projectId) => {
  const labels = selectProjectLabels(state, projectId);
  return labels.sort((a, b) => (a.position || 0) - (b.position || 0));
};

export const selectUsableProjectLabels = (state, projectId, isManager) => {
  const labels = selectProjectLabels(state, projectId);
  if (isManager) return labels;
  return labels.filter((l) => l.canBeUsedByMembers);
};

export const selectUsableProjectLabelsSorted = (state, projectId, isManager) => {
  const labels = selectUsableProjectLabels(state, projectId, isManager);
  return labels.sort((a, b) => (a.position || 0) - (b.position || 0));
};
