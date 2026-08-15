/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Draggable } from 'react-beautiful-dnd';
import { Button } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { BoardMembershipRoles } from '../../../constants/Enums';

import styles from './Item.module.scss';
import globalStyles from '../../../styles.module.scss';

const Item = React.memo(
  ({
    id,
    index,
    name,
    color,
    isPersisted,
    isActive,
    isGlobal,
    isDragDisabled,
    onSelect,
    onDeselect,
    onEdit,
    onPromote,
    onDemote,
  }) => {
    const canEdit = useSelector((state) => {
      const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
      return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
    });

    const handleToggleClick = useCallback(() => {
      if (isPersisted) {
        if (isActive) {
          onDeselect(id);
        } else {
          onSelect(id);
        }
      }
    }, [id, isActive, onSelect, onDeselect, isPersisted]);

    const handleEditClick = useCallback(() => {
      onEdit(id);
    }, [id, onEdit]);

    return (
      <Draggable
        draggableId={id}
        index={index}
        isDragDisabled={isDragDisabled || !isPersisted || !canEdit}
      >
        {({ innerRef, draggableProps, dragHandleProps }, { isDragging }) => {
          const contentNode = (
            // eslint-disable-next-line react/jsx-props-no-spreading
            <div {...draggableProps} ref={innerRef} className={styles.wrapper}>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                           jsx-a11y/no-static-element-interactions */}
              <span
                {...dragHandleProps} // eslint-disable-line react/jsx-props-no-spreading
                className={classNames(
                  styles.name,
                  isActive && styles.nameActive,
                  globalStyles[`background${upperFirst(camelCase(color))}`],
                )}
                onClick={handleToggleClick}
              >
                {name}
                {isGlobal && <span className={styles.globe}>🌐</span>}
              </span>
              {onDemote && isGlobal && (
                <Button
                  icon="arrow down"
                  size="small"
                  floated="right"
                  disabled={!isPersisted}
                  className={styles.editButton}
                  onClick={() => onDemote(id)}
                />
              )}
              {onPromote && !isGlobal && (
                <Button
                  icon="arrow up"
                  size="small"
                  floated="right"
                  disabled={!isPersisted}
                  className={styles.editButton}
                  onClick={() => onPromote(id)}
                />
              )}
              {canEdit && !isGlobal && (
                <Button
                  icon="pencil"
                  size="small"
                  floated="right"
                  disabled={!isPersisted}
                  className={styles.editButton}
                  onClick={handleEditClick}
                />
              )}
            </div>
          );

          return isDragging ? ReactDOM.createPortal(contentNode, document.body) : contentNode;
        }}
      </Draggable>
    );
  },
);

Item.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  name: PropTypes.string,
  color: PropTypes.string,
  isPersisted: PropTypes.bool,
  isActive: PropTypes.bool.isRequired,
  isGlobal: PropTypes.bool,
  isDragDisabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onDeselect: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onPromote: PropTypes.func,
  onDemote: PropTypes.func,
};

Item.defaultProps = {
  name: '',
  color: 'berry-red',
  isPersisted: false,
  isGlobal: false,
  isDragDisabled: false,
  onPromote: undefined,
  onDemote: undefined,
};

export default Item;
