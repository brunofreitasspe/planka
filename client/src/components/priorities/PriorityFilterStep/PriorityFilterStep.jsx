/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Form, Radio } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import {
  CardPriorityBandRanges,
  CardPriorityBands,
  getCardPriorityColor,
} from '../../../constants/CardPriorities';

import styles from './PriorityFilterStep.module.scss';

const BANDS = [
  CardPriorityBands.URGENT,
  CardPriorityBands.VERY_HIGH,
  CardPriorityBands.HIGH,
  CardPriorityBands.MEDIUM,
  CardPriorityBands.LOW,
];

const PriorityFilterStep = React.memo(({ value, onSelect, onClose }) => {
  const [t] = useTranslation();

  const handleAllClick = useCallback(() => {
    onSelect([]);
  }, [onSelect]);

  const handleBandChange = useCallback(
    (_, { value: band, checked }) => {
      const bands = checked ? [...value, band] : value.filter((item) => item !== band);

      onSelect(bands);
    },
    [onSelect, value],
  );

  const handleClearClick = useCallback(() => {
    onSelect([]);
    onClose();
  }, [onClose, onSelect]);

  return (
    <>
      <Popup.Header>{t('common.filterByPriority', { context: 'title' })}</Popup.Header>
      <Popup.Content>
        <Form>
          <Form.Field>
            <Radio
              label={t('common.all')}
              name="priorityFilter"
              checked={value.length === 0}
              onChange={handleAllClick}
            />
          </Form.Field>
          {BANDS.map((band) => {
            const { min, max } = CardPriorityBandRanges[band];

            return (
              <Form.Field key={band}>
                <Checkbox
                  label={
                    <span className={styles.bandLabel}>
                      <span
                        className={styles.bandDot}
                        style={{ '--priority-color': getCardPriorityColor(min) }}
                      />
                      {t(`common.priorityLevels.${band}`)} ({min}–{max})
                    </span>
                  }
                  checked={value.includes(band)}
                  value={band}
                  onChange={handleBandChange}
                />
              </Form.Field>
            );
          })}
          <Button
            negative
            content={t('common.clear')}
            className={styles.clearButton}
            onClick={handleClearClick}
          />
        </Form>
      </Popup.Content>
    </>
  );
});

PriorityFilterStep.propTypes = {
  value: PropTypes.arrayOf(PropTypes.oneOf(BANDS)).isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PriorityFilterStep;
