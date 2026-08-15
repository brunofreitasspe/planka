/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'ProjectLabel';

  static fields = {
    id: attr(),
    position: attr(),
    name: attr(),
    color: attr(),
    canBeUsedByMembers: attr(),
    projectId: fk({
      to: 'Project',
      as: 'project',
      relatedName: 'globalLabels',
    }),
  };

  static reducer({ type, payload }, ProjectLabel) {
    switch (type) {
      case ActionTypes.CORE_INITIALIZE:
      case ActionTypes.PROJECT_CREATE_HANDLE:
      case ActionTypes.PROJECT_UPDATE_HANDLE:
      case ActionTypes.PROJECT_MANAGER_CREATE_HANDLE:
      case ActionTypes.BOARD_MEMBERSHIP_CREATE_HANDLE:
        if (payload.globalLabels) {
          payload.globalLabels.forEach((projectLabel) => {
            ProjectLabel.upsert(projectLabel);
          });
        }

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        ProjectLabel.all().delete();

        if (payload.globalLabels) {
          payload.globalLabels.forEach((projectLabel) => {
            ProjectLabel.upsert(projectLabel);
          });
        }

        break;
      case ActionTypes.PROJECT_LABELS_FETCH__SUCCESS:
        payload.labels.forEach((projectLabel) => {
          ProjectLabel.upsert(projectLabel);
        });

        break;
      case ActionTypes.LABEL_PROMOTE__SUCCESS:
        ProjectLabel.upsert(payload.projectLabel);

        break;
      case ActionTypes.PROJECT_LABEL_CREATE:
      case ActionTypes.PROJECT_LABEL_CREATE_HANDLE:
      case ActionTypes.PROJECT_LABEL_UPDATE__SUCCESS:
      case ActionTypes.PROJECT_LABEL_UPDATE_HANDLE:
        ProjectLabel.upsert(payload.projectLabel);

        break;
      case ActionTypes.PROJECT_LABEL_CREATE__SUCCESS:
        ProjectLabel.withId(payload.localId).delete();
        ProjectLabel.upsert(payload.projectLabel);

        break;
      case ActionTypes.PROJECT_LABEL_CREATE__FAILURE:
        ProjectLabel.withId(payload.localId).delete();

        break;
      case ActionTypes.PROJECT_LABEL_UPDATE:
        ProjectLabel.withId(payload.id).update(payload.data);

        break;
      case ActionTypes.PROJECT_LABEL_DELETE:
        ProjectLabel.withId(payload.id).deleteWithRelated();

        break;
      case ActionTypes.PROJECT_LABEL_DELETE__SUCCESS:
      case ActionTypes.PROJECT_LABEL_DELETE_HANDLE: {
        const projectLabelModel = ProjectLabel.withId(payload.projectLabel.id);

        if (projectLabelModel) {
          projectLabelModel.deleteWithRelated();
        }

        break;
      }
      default:
    }
  }

  deleteRelated() {
    // Reconvert linked labels back to local (matching server behavior)
    this.project.boards.toModelArray().forEach((boardModel) => {
      boardModel.labels.toModelArray().forEach((labelModel) => {
        if (labelModel.projectLabelId === this.id) {
          labelModel.update({
            projectLabelId: null,
          });
        }
      });
    });
  }

  deleteWithRelated() {
    this.deleteRelated();
    this.delete();
  }
}
