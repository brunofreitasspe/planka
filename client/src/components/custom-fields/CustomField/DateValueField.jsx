/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';

import {
  formatCustomFieldDate,
  isValidCustomFieldDate,
  parseCustomFieldDate,
} from '../../../utils/custom-field-date';

import styles from './DateValueField.module.scss';

const DateValueField = React.memo(({ defaultValue, onUpdate }) => {
  const [t] = useTranslation();

  const handleChange = useCallback(
    (date) => {
      if (date === null) {
        onUpdate(null);
        return;
      }

      // react-datepicker hands back an Invalid Date while the user is mid-typing.
      // Reporting that upstream would persist the string 'NaN-NaN-NaN'.
      if (!isValidCustomFieldDate(date)) {
        return;
      }

      onUpdate(formatCustomFieldDate(date));
    },
    [onUpdate],
  );

  return (
    <DatePicker
      isClearable
      className={styles.field}
      dateFormat={t('format:date')}
      selected={parseCustomFieldDate(defaultValue)}
      onChange={handleChange}
    />
  );
});

DateValueField.propTypes = {
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
};

DateValueField.defaultProps = {
  defaultValue: undefined,
};

export default DateValueField;
