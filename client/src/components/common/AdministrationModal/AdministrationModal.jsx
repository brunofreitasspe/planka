/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Label, Menu, Modal, Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useClosableModal } from '../../../hooks';
import UsersPane from './UsersPane';
import RegistrationPane from './RegistrationPane';
import SmtpPane from './SmtpPane';
import LdapPane from './LdapPane';
import WebhooksPane from './WebhooksPane';

import styles from './AdministrationModal.module.scss';

const AdministrationModal = React.memo(() => {
  const config = useSelector(selectors.selectConfig);
  const pendingApprovalUsersTotal = useSelector(selectors.selectPendingApprovalUsersTotal);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const handleClose = useCallback(() => {
    dispatch(entryActions.closeModal());
  }, [dispatch]);

  const handleTabChange = useCallback((_, { activeIndex }) => {
    setActiveTabIndex(activeIndex);
  }, []);

  const [ClosableModal] = useClosableModal();

  const panes = [
    {
      menuItem: (
        <Menu.Item key="users">
          {t('common.users', {
            context: 'title',
          })}
          {pendingApprovalUsersTotal > 0 && (
            <Label circular color="orange" size="tiny" className={styles.usersTabLabel}>
              {pendingApprovalUsersTotal}
            </Label>
          )}
        </Menu.Item>
      ),
      render: () => <UsersPane />,
    },
    {
      menuItem: t('common.registration', {
        context: 'title',
      }),
      render: () => <RegistrationPane />,
    },
  ];
  if (config.smtpHost !== undefined) {
    panes.push({
      menuItem: t('common.smtp', {
        context: 'title',
      }),
      render: () => <SmtpPane />,
    });
  }
  if (config.ldapEnabled !== undefined) {
    panes.push({
      menuItem: t('common.ldap', {
        context: 'title',
      }),
      render: () => <LdapPane />,
    });
  }
  panes.push({
    menuItem: t('common.webhooks', {
      context: 'title',
    }),
    render: () => <WebhooksPane />,
  });

  const isUsersPaneActive = activeTabIndex === 0;

  return (
    <ClosableModal
      closeIcon
      size={isUsersPaneActive ? 'large' : 'small'}
      centered={false}
      className={classNames(isUsersPaneActive && styles.wrapperUsers)}
      onClose={handleClose}
    >
      <Modal.Content>
        <Tab
          menu={{
            secondary: true,
            pointing: true,
          }}
          panes={panes}
          onTabChange={handleTabChange}
        />
      </Modal.Content>
    </ClosableModal>
  );
});

export default AdministrationModal;
