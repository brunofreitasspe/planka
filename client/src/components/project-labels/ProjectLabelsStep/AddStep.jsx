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
import Editor from './Editor';

import styles from './AddStep.module.scss';

const AddStep = React.memo(({ onClose }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm(() => ({
    name: '',
    color: LABEL_COLORS[0],
    canBeUsedByMembers: true,
  }));

  const handleSubmit = useCallback(() => {
    const cleanData = {
      ...data,
      name: data.name.trim(),
    };

    dispatch(entryActions.createProjectLabelInCurrentProject(cleanData));
    onClose();
  }, [onClose, dispatch, data]);

  return (
    <>
      <Popup.Header>
        {t('common.createLabel', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <Editor data={data} onFieldChange={handleFieldChange} />
          <Button positive content={t('action.createProjectLabel')} />
        </Form>
      </Popup.Content>
    </>
  );
});

AddStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AddStep;
