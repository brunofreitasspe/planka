/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import isEmail from 'validator/lib/isEmail';
import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Form, Grid, Header, Message } from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import { isUsername } from '../../../utils/validator';
import Paths from '../../../constants/Paths';

import logo from '../../../assets/images/logo.png';

import styles from './Content.module.scss';

const createMessage = (error) => {
  if (!error) {
    return error;
  }

  switch (error.message) {
    case 'Registration is disabled':
      return {
        type: 'error',
        content: 'common.registrationDisabled',
      };
    case 'Email domain is not allowed to register':
      return {
        type: 'error',
        content: 'common.emailDomainNotAllowed',
      };
    case 'Email already in use':
      return {
        type: 'error',
        content: 'common.emailAlreadyInUse',
      };
    case 'Username already in use':
      return {
        type: 'error',
        content: 'common.usernameAlreadyInUse',
      };
    case 'A previous registration request with this email was rejected':
      return {
        type: 'error',
        content: 'common.previousRegistrationWasRejected',
      };
    case 'Active limit reached':
      return {
        type: 'error',
        content: 'common.registrationActiveLimitReached',
      };
    case 'Too many registration attempts, please try again later':
      return {
        type: 'error',
        content: 'common.tooManyRegistrationAttempts',
      };
    case 'Failed to fetch':
      return {
        type: 'warning',
        content: 'common.noInternetConnection',
      };
    case 'Network request failed':
      return {
        type: 'warning',
        content: 'common.serverConnectionFailed',
      };
    default:
      return {
        type: 'warning',
        content: 'common.unknownError',
      };
  }
};

const Content = React.memo(() => {
  const bootstrap = useSelector(selectors.selectBootstrap);
  const {
    data: defaultData,
    isSubmitting,
    isSubmitted,
    error,
  } = useSelector(selectors.selectRegistrationForm);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm(() => ({
    name: '',
    username: '',
    email: '',
    password: '',
    ...defaultData,
  }));

  const message = useMemo(() => createMessage(error), [error]);

  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');
  const [usernameFieldRef, handleUsernameFieldRef] = useNestedRef('inputRef');
  const [emailFieldRef, handleEmailFieldRef] = useNestedRef('inputRef');
  const [passwordFieldRef, handlePasswordFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    const trimmedUsername = data.username.trim();

    const cleanData = {
      ...data,
      name: data.name.trim(),
      email: data.email.trim(),
    };

    if (trimmedUsername) {
      cleanData.username = trimmedUsername;
    } else {
      delete cleanData.username;
    }

    if (!cleanData.name) {
      nameFieldRef.current.focus();
      return;
    }

    if (cleanData.username && !isUsername(cleanData.username)) {
      usernameFieldRef.current.select();
      return;
    }

    if (!isEmail(cleanData.email)) {
      emailFieldRef.current.select();
      return;
    }

    if (!cleanData.password) {
      passwordFieldRef.current.focus();
      return;
    }

    dispatch(entryActions.register(cleanData));
  }, [dispatch, data, nameFieldRef, usernameFieldRef, emailFieldRef, passwordFieldRef]);

  const handleMessageDismiss = useCallback(() => {
    dispatch(entryActions.clearRegisterError());
  }, [dispatch]);

  return (
    <div className={classNames(styles.wrapper, styles.fullHeight)}>
      <Grid verticalAlign="middle" className={styles.grid}>
        <Grid.Column computer={6} tablet={16} mobile={16} className={styles.gridItem}>
          <div className={styles.register}>
            <div className={styles.form}>
              <div className={styles.logoWrapper}>
                <img src={logo} alt="" className={styles.logo} />
              </div>
              <Header
                as="h1"
                textAlign="center"
                content={bootstrap.instanceName || 'PLANKA'}
                className={styles.formTitle}
              />
              <Header
                as="h2"
                textAlign="center"
                content={t('common.createAccount', {
                  context: 'title',
                })}
                className={styles.formSubtitle}
              />
              {!bootstrap.registrationEnabled && (
                <Message warning visible content={t('common.registrationDisabled')} />
              )}
              {bootstrap.registrationEnabled && isSubmitted && (
                <Message
                  positive
                  visible
                  content={t('common.registrationSubmittedAndAwaitingApproval')}
                />
              )}
              {bootstrap.registrationEnabled && !isSubmitted && (
                <>
                  {message && (
                    <Message
                      {...{
                        [message.type]: true,
                      }}
                      visible
                      content={t(message.content)}
                      onDismiss={handleMessageDismiss}
                    />
                  )}
                  <Form size="large" onSubmit={handleSubmit}>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputLabel}>{t('common.name')}</div>
                      <Input
                        fluid
                        ref={handleNameFieldRef}
                        name="name"
                        value={data.name}
                        maxLength={128}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputLabel}>
                        {t('common.username')} (
                        {t('common.optional', {
                          context: 'inline',
                        })}
                        )
                      </div>
                      <Input
                        fluid
                        ref={handleUsernameFieldRef}
                        name="username"
                        value={data.username}
                        placeholder={t('common.registerUsernamePlaceholder')}
                        maxLength={32}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputLabel}>{t('common.email')}</div>
                      <Input
                        fluid
                        ref={handleEmailFieldRef}
                        name="email"
                        value={data.email}
                        maxLength={256}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputLabel}>{t('common.password')}</div>
                      <Input.Password
                        fluid
                        ref={handlePasswordFieldRef}
                        name="password"
                        value={data.password}
                        maxLength={256}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <Form.Button
                      fluid
                      primary
                      icon="right arrow"
                      labelPosition="right"
                      content={t('action.createAccount')}
                      loading={isSubmitting}
                      disabled={isSubmitting}
                    />
                  </Form>
                </>
              )}
              <div className={styles.backToLoginWrapper}>
                <Link to={Paths.LOGIN}>{t('action.backToLogIn')}</Link>
              </div>
            </div>
          </div>
        </Grid.Column>
        <Grid.Column
          computer={10}
          only="computer"
          className={classNames(styles.gridItem, styles.cover)}
        >
          <div className={styles.coverOverlay} />
        </Grid.Column>
      </Grid>
    </div>
  );
});

export default Content;
