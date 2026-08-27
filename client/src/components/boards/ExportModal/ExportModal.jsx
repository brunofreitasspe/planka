/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Dropdown } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useClosableModal, useExport } from '../../../hooks';
import { CardPriorityBands } from '../../../constants/CardPriorities';

import styles from './ExportModal.module.scss';

const BAND_ORDER = [
  CardPriorityBands.URGENT,
  CardPriorityBands.VERY_HIGH,
  CardPriorityBands.HIGH,
  CardPriorityBands.MEDIUM,
  CardPriorityBands.LOW,
];

const ExportModal = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const labels = useSelector(selectors.selectLabelsForCurrentBoard);
  const memberships = useSelector(selectors.selectMembershipsForCurrentBoard);
  const lists = useSelector(selectors.selectAvailableListsForCurrentBoard);

  const [format, setFormat] = useState('pdf');
  const [priorityBands, setPriorityBands] = useState([]);
  const [labelIds, setLabelIds] = useState([]);
  const [listIds, setListIds] = useState([]);
  const [assigneeId, setAssigneeId] = useState(null);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [ClosableModal] = useClosableModal();
  const { isExporting, error, exportBoard } = useExport();

  const handleClose = useCallback(() => {
    dispatch(entryActions.closeModal());
  }, [dispatch]);

  const formatOptions = useMemo(
    () => [
      { key: 'pdf', value: 'pdf', text: t('common.pdf') },
      { key: 'csv', value: 'csv', text: t('common.csv') },
      { key: 'both', value: 'both', text: t('common.both') },
    ],
    [t],
  );

  const memberOptions = useMemo(
    () =>
      memberships.map((membership) => ({
        key: membership.user.id,
        value: membership.user.id,
        text: membership.user.name,
      })),
    [memberships],
  );

  const labelOptions = useMemo(
    () =>
      labels.map((label) => ({
        key: label.id,
        value: label.id,
        text: label.name,
      })),
    [labels],
  );

  const listOptions = useMemo(
    () =>
      lists.map((list) => ({
        key: list.id,
        value: list.id,
        text: list.name,
      })),
    [lists],
  );

  const togglePriorityBand = useCallback((band) => {
    setPriorityBands((current) =>
      current.includes(band) ? current.filter((item) => item !== band) : [...current, band],
    );
  }, []);

  const handleExportClick = useCallback(async () => {
    const filters = {
      priority: priorityBands,
      assigneeId,
      labelIds,
      listIds,
    };

    if (format === 'both') {
      const pdfOk = await exportBoard(board.id, { format: 'pdf', ...filters });
      const csvOk = await exportBoard(board.id, { format: 'csv', ...filters });

      if (pdfOk && csvOk) {
        dispatch(entryActions.closeModal());
      }
    } else {
      const ok = await exportBoard(board.id, { format, ...filters });

      if (ok) {
        dispatch(entryActions.closeModal());
      }
    }
  }, [assigneeId, board.id, dispatch, exportBoard, format, labelIds, listIds, priorityBands]);

  return (
    <ClosableModal closeIcon size="small" centered={false} onClose={handleClose}>
      <ClosableModal.Header>
        {t('common.exportCards', {
          context: 'title',
        })}
      </ClosableModal.Header>
      <ClosableModal.Content>
        <div className={styles.form}>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.format')}</div>
            <Dropdown
              fluid
              selection
              options={formatOptions}
              value={format}
              onChange={(_, { value }) => setFormat(value)}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.priority')}</div>
            <div className={styles.priorityBands}>
              {BAND_ORDER.map((band) => (
                <Checkbox
                  key={band}
                  className={styles.priorityCheckbox}
                  label={t(`common.priorityLevels.${band}`)}
                  checked={priorityBands.includes(band)}
                  onChange={() => togglePriorityBand(band)}
                />
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.members')}</div>
            <Dropdown
              fluid
              clearable
              selection
              placeholder={t('common.all')}
              options={memberOptions}
              value={assigneeId || undefined}
              onChange={(_, { value }) => setAssigneeId(value || null)}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.labels')}</div>
            <Dropdown
              fluid
              multiple
              selection
              placeholder={t('common.all')}
              options={labelOptions}
              value={labelIds}
              onChange={(_, { value }) => setLabelIds(value)}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.lists')}</div>
            <Dropdown
              fluid
              multiple
              selection
              placeholder={t('common.all')}
              options={listOptions}
              value={listIds}
              onChange={(_, { value }) => setListIds(value)}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <Button
              positive
              loading={isExporting}
              disabled={isExporting}
              content={isExporting ? undefined : t('action.exportNow')}
              onClick={handleExportClick}
            />
          </div>
        </div>
      </ClosableModal.Content>
    </ClosableModal>
  );
});

export default ExportModal;
