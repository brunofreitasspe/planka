/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { dequal } from 'dequal';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Form, Tab, TextArea } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm } from '../../../hooks';

import styles from './RegistrationPane.module.scss';

const parseDomains = (value) =>
  value
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

const RegistrationPane = React.memo(() => {
  const config = useSelector(selectors.selectConfig);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const defaultData = useMemo(
    () => ({
      registrationEnabled: config.registrationEnabled,
      registrationAllowedDomains: config.registrationAllowedDomains,
    }),
    [config],
  );

  const [data, handleFieldChange] = useForm(() => ({
    ...defaultData,
    registrationAllowedDomainsText: defaultData.registrationAllowedDomains.join(', '),
  }));

  const cleanData = useMemo(
    () => ({
      registrationEnabled: data.registrationEnabled,
      registrationAllowedDomains: parseDomains(data.registrationAllowedDomainsText),
    }),
    [data],
  );

  const isModified = useMemo(() => !dequal(cleanData, defaultData), [cleanData, defaultData]);

  const handleSubmit = useCallback(() => {
    dispatch(entryActions.updateConfig(cleanData));
  }, [dispatch, cleanData]);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <Form onSubmit={handleSubmit}>
        <Checkbox
          name="registrationEnabled"
          checked={data.registrationEnabled}
          label={t('common.allowSelfRegistration')}
          className={styles.checkbox}
          onChange={handleFieldChange}
        />
        <div className={styles.text}>
          {t('common.allowedEmailDomains')} (
          {t('common.optional', {
            context: 'inline',
          })}
          )
        </div>
        <TextArea
          name="registrationAllowedDomainsText"
          value={data.registrationAllowedDomainsText}
          placeholder={t('common.allowedEmailDomainsPlaceholder')}
          rows={3}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <div className={styles.controls}>
          <Button positive disabled={!isModified} content={t('action.save')} />
        </div>
      </Form>
    </Tab.Pane>
  );
});

export default RegistrationPane;
