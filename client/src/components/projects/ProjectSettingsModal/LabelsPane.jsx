/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { usePopupInClosableContext } from '../../../hooks';
import { AddStep, EditStep, Item } from '../../project-labels/ProjectLabelsStep';

import styles from './LabelsPane.module.scss';

const LabelsPane = React.memo(() => {
  const projectLabels = useSelector(selectors.selectProjectLabelsForCurrentProject) || [];

  const dispatch = useDispatch();
  const [t] = useTranslation();

  useEffect(() => {
    dispatch(entryActions.fetchProjectLabelsInCurrentProject());
  }, [dispatch]);

  const AddProjectLabelPopup = usePopupInClosableContext(AddStep);
  const EditProjectLabelPopup = usePopupInClosableContext(EditStep);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <div className={styles.header}>
        <AddProjectLabelPopup>
          <button type="button" className={styles.addButton}>
            <Icon name="plus" size="small" className={styles.addButtonIcon} />
            {t('action.createProjectLabel')}
          </button>
        </AddProjectLabelPopup>
      </div>
      {projectLabels.length > 0 && (
        <div className={styles.items}>
          {projectLabels.map((projectLabel) => (
            <Item
              key={projectLabel.id}
              id={projectLabel.id}
              EditStepPopup={EditProjectLabelPopup}
            />
          ))}
        </div>
      )}
    </Tab.Pane>
  );
});

export default LabelsPane;
