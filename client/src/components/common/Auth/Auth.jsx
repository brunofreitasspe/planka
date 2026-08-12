/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import { Loader } from 'semantic-ui-react';

import history from '../../../history';
import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import AccessTokenSteps from '../../../constants/AccessTokenSteps';
import LoginContent from '../Login/Content';
import RegisterContent from '../Register/Content';
import TermsModal from '../Login/TermsModal';

import styles from './Auth.module.scss';

const Auth = React.memo(() => {
  const location = useLocation();
  const isInitializing = useSelector(selectors.selectIsInitializing);
  const { step } = useSelector(selectors.selectAuthenticateForm);

  const [t] = useTranslation();
  const [isSignUpMode, setIsSignUpMode] = useState(location.pathname === Paths.REGISTER);

  useEffect(() => {
    setIsSignUpMode(location.pathname === Paths.REGISTER);
  }, [location.pathname]);

  const handleShowRegister = useCallback(() => {
    setIsSignUpMode(true);
    history.push(Paths.REGISTER);
  }, []);

  const handleShowLogin = useCallback(() => {
    setIsSignUpMode(false);
    history.push(Paths.LOGIN);
  }, []);

  if (isInitializing) {
    return <Loader active size="massive" />;
  }

  return (
    <div className={styles.wrapper}>
      <div className={classNames(styles.container, isSignUpMode && styles.signUpMode)}>
        <div className={classNames(styles.formContainer, styles.signInContainer)}>
          <LoginContent onShowRegister={handleShowRegister} />
        </div>
        <div className={classNames(styles.formContainer, styles.signUpContainer)}>
          <RegisterContent onShowLogin={handleShowLogin} />
        </div>
        <div className={styles.overlayContainer}>
          <div className={styles.overlay}>
            <div className={classNames(styles.overlayPanel, styles.overlayLeft)}>
              <h2 className={styles.overlayTitle}>{t('common.alreadyHaveAccount')}</h2>
              <p className={styles.overlayText}>{t('common.alreadyHaveAccountDescription')}</p>
              <button type="button" className={styles.overlayButton} onClick={handleShowLogin}>
                {t('action.logIn')}
              </button>
            </div>
            <div className={classNames(styles.overlayPanel, styles.overlayRight)}>
              <h2 className={styles.overlayTitle}>{t('common.createAccount_title')}</h2>
              <p className={styles.overlayText}>{t('common.createAccountDescription')}</p>
              <button type="button" className={styles.overlayButton} onClick={handleShowRegister}>
                {t('action.createAccount')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.poweredBy}>
        <p>
          <Trans i18nKey="common.poweredByPlanka">
            {'Powered by '}
            <a href="https://github.com/plankanban/planka" target="_blank" rel="noreferrer">
              PLANKA
            </a>
          </Trans>
        </p>
      </div>
      {step === AccessTokenSteps.ACCEPT_TERMS && <TermsModal />}
    </div>
  );
});

export default Auth;
