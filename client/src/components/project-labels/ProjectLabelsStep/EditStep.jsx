/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { dequal } from 'dequal';
import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useSteps } from '../../../hooks';
import LABEL_COLORS from '../../../constants/LabelColors';
import Editor from './Editor';
import ConfirmationStep from '../../common/ConfirmationStep';

import styles from './EditStep.module.scss';

const StepTypes = {
  DELETE: 'DELETE',
};

const EditStep = React.memo(({ id, onClose }) => {
  const selectProjectLabelById = useMemo(() => selectors.makeSelectProjectLabelById(), []);

  const projectLabel = useSelector((state) => selectProjectLabelById(state, id));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const defaultData = useMemo(
    () => ({
      name: projectLabel?.name ?? '',
      color: projectLabel?.color ?? LABEL_COLORS[0],
      canBeUsedByMembers: projectLabel?.canBeUsedByMembers !== false,
    }),
    [projectLabel],
  );

  const [data, handleFieldChange] = useForm(() => ({
    color: LABEL_COLORS[0],
    ...defaultData,
    name: defaultData.name || '',
  }));

  const [step, openStep, handleBack] = useSteps();

  const handleSubmit = useCallback(() => {
    const cleanData = {
      ...data,
      name: data.name.trim(),
    };

    if (!cleanData.name) {
      return;
    }

    if (!dequal(cleanData, defaultData)) {
      dispatch(entryActions.updateProjectLabel(id, cleanData));
    }

    onClose();
  }, [id, onClose, defaultData, dispatch, data]);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteProjectLabel(id));
  }, [id, dispatch]);

  const handleDeleteClick = useCallback(() => {
    openStep(StepTypes.DELETE);
  }, [openStep]);

  if (!projectLabel) {
    return null;
  }

  if (step && step.type === StepTypes.DELETE) {
    return (
      <ConfirmationStep
        title="common.deleteLabel"
        content="common.areYouSureYouWantToDeleteThisProjectLabel"
        buttonContent="action.deleteLabel"
        onConfirm={handleDeleteConfirm}
        onBack={handleBack}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <Popup.Header onBack={onClose}>
        {t('common.editLabel', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <Editor data={data} onFieldChange={handleFieldChange} />
          <div className={styles.actions}>
            <Button positive content={t('action.save')} />
            <Button
              type="button"
              content={t('action.delete')}
              className={styles.deleteButton}
              onClick={handleDeleteClick}
            />
          </div>
        </Form>
      </Popup.Content>
    </>
  );
});

EditStep.propTypes = {
  id: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EditStep;
