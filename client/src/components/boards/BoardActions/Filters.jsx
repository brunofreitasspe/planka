/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import debounce from 'lodash/debounce';
import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { useDidUpdate } from '../../../lib/hooks';
import { usePopup } from '../../../lib/popup';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useNestedRef } from '../../../hooks';
import UserAvatar from '../../users/UserAvatar';
import BoardMembershipsStep from '../../board-memberships/BoardMembershipsStep';
import LabelChip from '../../labels/LabelChip';
import LabelsStep from '../../labels/LabelsStep';
import PriorityFilterStep from '../../priorities/PriorityFilterStep';
import { CardPriorityBandRanges, getCardPriorityColor } from '../../../constants/CardPriorities';

import styles from './Filters.module.scss';

const Filters = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const userIds = useSelector(selectors.selectFilterUserIdsForCurrentBoard);
  const labelIds = useSelector(selectors.selectFilterLabelIdsForCurrentBoard);
  const priorityBands = useSelector(selectors.selectFilterPriorityBandsForCurrentBoard);
  const currentUserId = useSelector(selectors.selectCurrentUserId);

  const withCurrentUserSelector = useSelector(
    (state) => !!selectors.selectCurrentUserMembershipForCurrentBoard(state),
  );

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [search, setSearch] = useState(board.search);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const debouncedSearch = useMemo(
    () =>
      debounce((nextSearch) => {
        dispatch(entryActions.searchInCurrentBoard(nextSearch));
      }, 400),
    [dispatch],
  );

  const [searchFieldRef, handleSearchFieldRef] = useNestedRef('inputRef');

  const cancelSearch = useCallback(() => {
    debouncedSearch.cancel();
    setSearch('');
    dispatch(entryActions.searchInCurrentBoard(''));
    searchFieldRef.current.blur();
  }, [dispatch, debouncedSearch, searchFieldRef]);

  const handleUserSelect = useCallback(
    (userId) => {
      dispatch(entryActions.addUserToFilterInCurrentBoard(userId));
    },
    [dispatch],
  );

  const handleCurrentUserSelect = useCallback(() => {
    dispatch(entryActions.addUserToFilterInCurrentBoard(currentUserId));
  }, [currentUserId, dispatch]);

  const handleUserDeselect = useCallback(
    (userId) => {
      dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
    },
    [dispatch],
  );

  const handleUserClick = useCallback(
    ({
      currentTarget: {
        dataset: { id: userId },
      },
    }) => {
      dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
    },
    [dispatch],
  );

  const handleLabelSelect = useCallback(
    (labelId) => {
      dispatch(entryActions.addLabelToFilterInCurrentBoard(labelId));
    },
    [dispatch],
  );

  const handleLabelDeselect = useCallback(
    (labelId) => {
      dispatch(entryActions.removeLabelFromFilterInCurrentBoard(labelId));
    },
    [dispatch],
  );

  const handleLabelClick = useCallback(
    ({
      currentTarget: {
        dataset: { id: labelId },
      },
    }) => {
      dispatch(entryActions.removeLabelFromFilterInCurrentBoard(labelId));
    },
    [dispatch],
  );

  const handlePriorityBandSelect = useCallback(
    (bands) => {
      dispatch(entryActions.updatePriorityFilterInCurrentBoard(bands));
    },
    [dispatch],
  );

  const handlePriorityBandRemove = useCallback(
    ({
      currentTarget: {
        dataset: { band },
      },
    }) => {
      const bands = priorityBands.filter((item) => item !== band);
      dispatch(entryActions.updatePriorityFilterInCurrentBoard(bands));
    },
    [dispatch, priorityBands],
  );

  const handleSearchChange = useCallback(
    (_, { value }) => {
      setSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        cancelSearch();
      }
    },
    [cancelSearch],
  );

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  const handleCancelSearchClick = useCallback(() => {
    cancelSearch();
  }, [cancelSearch]);

  useDidUpdate(() => {
    setSearch(board.search);
  }, [board.search]);

  const BoardMembershipsPopup = usePopup(BoardMembershipsStep);
  const LabelsPopup = usePopup(LabelsStep);
  const PriorityPopup = usePopup(PriorityFilterStep);

  const isSearchActive = search || isSearchFocused;

  return (
    <>
      <span className={styles.filter}>
        <BoardMembershipsPopup
          currentUserIds={userIds}
          title="common.filterByMembers"
          onUserSelect={handleUserSelect}
          onUserDeselect={handleUserDeselect}
        >
          <button type="button" className={styles.filterButton}>
            <span className={styles.filterTitle}>{`${t('common.members')}:`}</span>
            {userIds.length === 0 && <span className={styles.filterLabel}>{t('common.all')}</span>}
          </button>
        </BoardMembershipsPopup>
        {userIds.length === 0 && withCurrentUserSelector && (
          <button type="button" className={styles.filterButton} onClick={handleCurrentUserSelect}>
            <span className={styles.filterLabel}>
              <Icon fitted name="target" className={styles.filterLabelIcon} />
            </span>
          </button>
        )}
        {userIds.map((userId) => (
          <span key={userId} className={styles.filterItem}>
            <UserAvatar id={userId} size="tiny" onClick={handleUserClick} />
          </span>
        ))}
      </span>
      <span className={styles.filter}>
        <LabelsPopup
          currentIds={labelIds}
          title="common.filterByLabels"
          withProjectGlobals={false}
          onSelect={handleLabelSelect}
          onDeselect={handleLabelDeselect}
        >
          <button type="button" className={styles.filterButton}>
            <span className={styles.filterTitle}>{`${t('common.labels')}:`}</span>
            {labelIds.length === 0 && <span className={styles.filterLabel}>{t('common.all')}</span>}
          </button>
        </LabelsPopup>
        {labelIds.map((labelId) => (
          <span key={labelId} className={styles.filterItem}>
            <LabelChip id={labelId} size="small" onClick={handleLabelClick} />
          </span>
        ))}
      </span>
      <span className={styles.filter}>
        <PriorityPopup value={priorityBands} onSelect={handlePriorityBandSelect}>
          <button type="button" className={styles.filterButton}>
            <span className={styles.filterTitle}>{`${t('common.priority')}:`}</span>
            {priorityBands.length === 0 && (
              <span className={styles.filterLabel}>{t('common.all')}</span>
            )}
          </button>
        </PriorityPopup>
        {priorityBands.map((band) => (
          <span key={band} className={styles.filterItem}>
            <button
              type="button"
              className={styles.priorityBandChip}
              data-band={band}
              style={{ '--priority-color': getCardPriorityColor(CardPriorityBandRanges[band].min) }}
              onClick={handlePriorityBandRemove}
            >
              {t(`common.priorityLevels.${band}`)}
            </button>
          </span>
        ))}
      </span>
      <span className={styles.filter}>
        <Input
          ref={handleSearchFieldRef}
          value={search}
          placeholder={t('common.searchCards')}
          maxLength={128}
          icon={
            isSearchActive ? (
              <Icon link name="cancel" onClick={handleCancelSearchClick} />
            ) : (
              'search'
            )
          }
          className={classNames(styles.search, !isSearchActive && styles.searchInactive)}
          onFocus={handleSearchFocus}
          onKeyDown={handleSearchKeyDown}
          onChange={handleSearchChange}
          onBlur={handleSearchBlur}
        />
      </span>
    </>
  );
});

export default Filters;
