import { handleActions } from 'redux-actions';
import * as actions from '../actions/project-label-actions';

const initialState = {};

export default handleActions(
  {
    [actions.setProjectLabels]: (state, { payload: { projectId, labels } }) => ({
      ...state,
      [projectId]: labels,
    }),

    [actions.addProjectLabel]: (state, { payload: { projectId, label } }) => ({
      ...state,
      [projectId]: {
        ...(state[projectId] || {}),
        [label.id]: label,
      },
    }),

    [actions.updateProjectLabel]: (state, { payload: { projectId, label } }) => ({
      ...state,
      [projectId]: {
        ...(state[projectId] || {}),
        [label.id]: {
          ...state[projectId]?.[label.id],
          ...label,
        },
      },
    }),

    [actions.deleteProjectLabel]: (state, { payload: { projectId, labelId } }) => {
      const { [labelId]: _, ...remaining } = state[projectId] || {};
      return {
        ...state,
        [projectId]: remaining,
      };
    },
  },
  initialState
);
