/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import entryActions from '../../../entry-actions';
import { useForm } from '../../../hooks';
import LABEL_COLORS from '../../../constants/LabelColors';
import Editor from '../../project-labels/ProjectLabelsStep/Editor';

import styles from './PromoteStep.module.scss';

const PromoteStep = React.memo(({ id, defaultData, onBack }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm(() => ({
    name: '',
    color: LABEL_COLORS[0],
    canBeUsedByMembers: true,
    ...defaultData,
  }));

  const handleSubmit = useCallback(() => {
    const cleanData = {
      ...data,
      name: data.name.trim(),
    };

    if (!cleanData.name) {
      return;
    }

    dispatch(entryActions.promoteLabel(id, cleanData));
    onBack();
  }, [id, onBack, data, dispatch]);

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.promoteLabel', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <div className={styles.hint}>{t('common.promoteLabelHint')}</div>
        <Form onSubmit={handleSubmit}>
          <Editor data={data} onFieldChange={handleFieldChange} />
          <Button positive content={t('common.promoteLabel')} />
        </Form>
      </Popup.Content>
    </>
  );
});

PromoteStep.propTypes = {
  id: PropTypes.string.isRequired,
  defaultData: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onBack: PropTypes.func.isRequired,
};

export default PromoteStep;
