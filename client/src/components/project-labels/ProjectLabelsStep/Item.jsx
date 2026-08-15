/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';

import styles from './Item.module.scss';
import globalStyles from '../../../styles.module.scss';

const Item = React.memo(({ id, EditStepPopup }) => {
  const selectProjectLabelById = useMemo(() => selectors.makeSelectProjectLabelById(), []);

  const projectLabel = useSelector((state) => selectProjectLabelById(state, id));

  const [t] = useTranslation();

  if (!projectLabel) {
    return null;
  }

  const hasUsageStats = projectLabel.linkedLabelCount !== undefined;

  return (
    <div className={styles.item}>
      <span
        title={projectLabel.name}
        className={classNames(
          styles.name,
          globalStyles[`background${upperFirst(camelCase(projectLabel.color))}`],
        )}
      >
        {projectLabel.name}
      </span>
      <div className={styles.meta}>
        <div className={styles.permission}>
          {t(
            projectLabel.canBeUsedByMembers
              ? 'common.labelPermissionMembers'
              : 'common.labelPermissionManagers',
          )}
        </div>
        {hasUsageStats && (
          <div className={styles.usage}>
            {t('common.usedInBoardsCards', {
              boards: projectLabel.usedInBoardCount ?? 0,
              cards: projectLabel.linkedLabelCount,
            })}
          </div>
        )}
      </div>
      <EditStepPopup id={id}>
        <Button type="button" content={t('action.edit')} className={styles.editButton} />
      </EditStepPopup>
    </div>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  EditStepPopup: PropTypes.elementType.isRequired,
};

export default Item;
