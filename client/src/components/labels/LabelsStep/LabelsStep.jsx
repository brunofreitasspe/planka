/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { Button } from 'semantic-ui-react';
import { Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useField, useNestedRef, useSteps } from '../../../hooks';
import DroppableTypes from '../../../constants/DroppableTypes';
import { BoardMembershipRoles } from '../../../constants/Enums';
import Item from './Item';
import AddStep from './AddStep';
import EditStep from './EditStep';
import PromoteStep from '../PromoteStep/PromoteStep';

import styles from './LabelsStep.module.scss';
import globalStyles from '../../../styles.module.scss';

const StepTypes = {
  ADD: 'ADD',
  EDIT: 'EDIT',
  PROMOTE: 'PROMOTE',
};

const LabelsStep = React.memo(
  ({ currentIds, cardId, title, withProjectGlobals, onSelect, onDeselect, onBack }) => {
    const allLabels = useSelector(selectors.selectLabelsForCurrentBoardWithGlobals);
    const labels = withProjectGlobals
      ? allLabels
      : allLabels.filter((label) => !(label.isGlobal && !label.boardId));

    const canAdd = useSelector((state) => {
      const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
      return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
    });

    const isProjectManager = useSelector(selectors.selectIsCurrentUserManagerForCurrentProject);

    const dispatch = useDispatch();
    const [t] = useTranslation();
    const [step, openStep, handleBack] = useSteps();
    const [search, handleSearchChange] = useField('');
    const cleanSearch = useMemo(() => search.trim().toLowerCase(), [search]);

    // Non-managers only see globals their project allows members to use.
    const visibleLabels = useMemo(
      () =>
        isProjectManager
          ? labels
          : labels.filter((label) => !label.isGlobal || label.canBeUsedByMembers !== false),
      [isProjectManager, labels],
    );

    const globalLabels = useMemo(
      () => visibleLabels.filter((label) => label.isGlobal),
      [visibleLabels],
    );
    const localLabels = useMemo(
      () => visibleLabels.filter((label) => !label.isGlobal),
      [visibleLabels],
    );

    const filteredGlobalLabels = useMemo(
      () =>
        globalLabels.filter(
          (label) =>
            (label.name && label.name.toLowerCase().includes(cleanSearch)) ||
            label.color.includes(cleanSearch),
        ),
      [globalLabels, cleanSearch],
    );

    const filteredLocalLabels = useMemo(
      () =>
        localLabels.filter(
          (label) =>
            (label.name && label.name.toLowerCase().includes(cleanSearch)) ||
            label.color.includes(cleanSearch),
        ),
      [localLabels, cleanSearch],
    );

    const [searchFieldRef, handleSearchFieldRef] = useNestedRef('inputRef');

    const handleDragStart = useCallback(() => {
      document.body.classList.add(globalStyles.dragging);
    }, []);

    const handleDragEnd = useCallback(
      ({ draggableId, source, destination }) => {
        document.body.classList.remove(globalStyles.dragging);

        if (!destination || source.index === destination.index) {
          return;
        }

        // The global section is rendered above and is not reorderable, so the
        // section-local destination index must be offset to a board-wide index.
        dispatch(entryActions.moveLabel(draggableId, globalLabels.length + destination.index));
      },
      [dispatch, globalLabels.length],
    );

    const handleAddClick = useCallback(() => {
      openStep(StepTypes.ADD);
    }, [openStep]);

    const handleEdit = useCallback(
      (id) => {
        openStep(StepTypes.EDIT, {
          id,
        });
      },
      [openStep],
    );

    const handlePromote = useCallback(
      (id) => {
        openStep(StepTypes.PROMOTE, {
          id,
        });
      },
      [openStep],
    );

    const handleDemote = useCallback(
      (id) => {
        dispatch(entryActions.demoteLabel(id));
      },
      [dispatch],
    );

    useEffect(() => {
      searchFieldRef.current.focus({
        preventScroll: true,
      });
    }, [searchFieldRef]);

    if (step) {
      switch (step.type) {
        case StepTypes.ADD:
          return (
            <AddStep
              cardId={cardId}
              // TODO: memoize?
              defaultData={{
                name: search,
              }}
              onBack={handleBack}
            />
          );
        case StepTypes.EDIT: {
          const currentLabel = labels.find((label) => label.id === step.params.id);

          if (currentLabel) {
            return <EditStep labelId={currentLabel.id} onBack={handleBack} />;
          }

          openStep(null);

          break;
        }
        case StepTypes.PROMOTE: {
          const currentLabel = labels.find((label) => label.id === step.params.id);

          if (currentLabel) {
            return (
              <PromoteStep
                id={currentLabel.id}
                defaultData={{
                  name: currentLabel.name,
                  color: currentLabel.color,
                }}
                onBack={handleBack}
              />
            );
          }

          openStep(null);

          break;
        }
        default:
      }
    }

    return (
      <>
        <Popup.Header onBack={onBack}>
          {t(title, {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>
          <Input
            fluid
            ref={handleSearchFieldRef}
            value={search}
            placeholder={t('common.searchLabels')}
            maxLength={128}
            icon="search"
            onChange={handleSearchChange}
          />
          {(filteredGlobalLabels.length > 0 || filteredLocalLabels.length > 0) && (
            <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {filteredGlobalLabels.length > 0 && (
                <>
                  <div className={styles.sectionTitle}>{t('common.projectLabels')}</div>
                  <Droppable droppableId="labels:globals" type={DroppableTypes.LABEL}>
                    {({ innerRef, droppableProps, placeholder }) => (
                      <div
                        {...droppableProps} // eslint-disable-line react/jsx-props-no-spreading
                        ref={innerRef}
                        className={styles.items}
                      >
                        {filteredGlobalLabels.map((item, index) => (
                          <Item
                            key={item.id}
                            id={item.id}
                            index={index}
                            name={item.name}
                            color={item.color}
                            isPersisted
                            isActive={currentIds.includes(item.id)}
                            isGlobal
                            isDragDisabled
                            onSelect={onSelect}
                            onDeselect={onDeselect}
                            onEdit={handleEdit}
                            onDemote={isProjectManager && item.boardId ? handleDemote : undefined}
                          />
                        ))}
                        {placeholder}
                      </div>
                    )}
                  </Droppable>
                </>
              )}
              {filteredLocalLabels.length > 0 && (
                <>
                  <div className={styles.sectionTitle}>{t('common.boardLabels')}</div>
                  <Droppable droppableId="labels" type={DroppableTypes.LABEL}>
                    {({ innerRef, droppableProps, placeholder }) => (
                      <div
                        {...droppableProps} // eslint-disable-line react/jsx-props-no-spreading
                        ref={innerRef}
                        className={styles.items}
                      >
                        {filteredLocalLabels.map((item, index) => (
                          <Item
                            key={item.id}
                            id={item.id}
                            index={index}
                            name={item.name}
                            color={item.color}
                            isPersisted
                            isActive={currentIds.includes(item.id)}
                            onSelect={onSelect}
                            onDeselect={onDeselect}
                            onEdit={handleEdit}
                            onPromote={isProjectManager ? handlePromote : undefined}
                          />
                        ))}
                        {placeholder}
                      </div>
                    )}
                  </Droppable>
                  <Droppable droppableId="labels:hack" type={DroppableTypes.LABEL}>
                    {({ innerRef, droppableProps, placeholder }) => (
                      <div
                        {...droppableProps} // eslint-disable-line react/jsx-props-no-spreading
                        ref={innerRef}
                        className={styles.droppableHack}
                      >
                        {placeholder}
                      </div>
                    )}
                  </Droppable>
                </>
              )}
            </DragDropContext>
          )}
          {canAdd && (
            <Button
              fluid
              content={t('action.createNewLabel')}
              className={styles.addButton}
              onClick={handleAddClick}
            />
          )}
        </Popup.Content>
      </>
    );
  },
);

LabelsStep.propTypes = {
  currentIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  cardId: PropTypes.string,
  title: PropTypes.string,
  withProjectGlobals: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onDeselect: PropTypes.func.isRequired,
  onBack: PropTypes.func,
};

LabelsStep.defaultProps = {
  cardId: undefined,
  title: 'common.labels',
  withProjectGlobals: true,
  onBack: undefined,
};

export default LabelsStep;
