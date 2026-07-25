/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Label, Table } from 'semantic-ui-react';
import { useEventCallback } from '../../../../lib/hooks';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import { UserRoleIcons } from '../../../../constants/Icons';
import ActionsStep from './ActionsStep';
import ConfirmationStep from '../../ConfirmationStep';
import UserAvatar from '../../../users/UserAvatar';

import styles from './Item.module.scss';

const Item = React.memo(({ id }) => {
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

  const user = useSelector((state) => selectUserById(state, id));
  const currentUserId = useSelector(selectors.selectCurrentUserId);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleActionsPopupClose = useEventCallback(() => {
    if (user.apiKeyState.value) {
      dispatch(entryActions.clearUserApiKeyValue(id));
    }
  }, [id, user.apiKeyState.value, dispatch]);

  const ActionsPopup = usePopupInClosableContext(ActionsStep, {
    onClose: handleActionsPopupClose,
  });

  const handleApproveConfirm = useCallback(() => {
    dispatch(entryActions.approveUser(id));
  }, [id, dispatch]);

  const handleRejectConfirm = useCallback(() => {
    dispatch(entryActions.rejectUser(id));
  }, [id, dispatch]);

  const ApprovePopup = usePopupInClosableContext(ConfirmationStep, {
    title: 'common.approveRegistration',
    content: 'common.areYouSureYouWantToApproveThisRegistration',
    buttonType: 'positive',
    buttonContent: 'action.approve',
    onConfirm: handleApproveConfirm,
  });

  const RejectPopup = usePopupInClosableContext(ConfirmationStep, {
    title: 'common.rejectRegistration',
    content: 'common.areYouSureYouWantToRejectThisRegistration',
    buttonContent: 'action.reject',
    onConfirm: handleRejectConfirm,
  });

  return (
    <Table.Row
      className={classNames(styles.wrapper, user.isDeactivated && styles.wrapperDeactivated)}
    >
      <Table.Cell>
        <div className={styles.user}>
          <UserAvatar id={id} />
          <div>
            {user.name}
            {user.id === currentUserId && (
              <div className={styles.note}>{t('common.currentUser')}</div>
            )}
          </div>
        </div>
      </Table.Cell>
      <Table.Cell>
        {user.email}
        {user.username && <div className={styles.note}>@{user.username}</div>}
      </Table.Cell>
      <Table.Cell>
        {user.phone && (
          <div className={styles.information}>
            <Icon name="phone" className={styles.icon} />
            {user.phone}
          </div>
        )}
        {user.organization && (
          <div className={styles.information}>
            <Icon name="building" className={styles.icon} />
            {user.organization}
          </div>
        )}
        {user.apiKeyPrefix && (
          <div className={classNames(styles.information, styles.informationApiKey)}>
            <Icon name="key" className={styles.icon} />
            {user.apiKeyPrefix}_...
          </div>
        )}
      </Table.Cell>
      <Table.Cell className={styles.roleCell}>
        <Icon name={UserRoleIcons[user.role]} className={styles.icon} />
        {t(`common.${user.role}`)}
        {user.isPendingApproval && (
          <Label color="orange" size="tiny" className={styles.statusLabel}>
            {t('common.pendingApproval')}
          </Label>
        )}
        {user.rejectedAt && (
          <Label size="tiny" className={styles.statusLabel}>
            {t('common.registrationRejected')}
          </Label>
        )}
      </Table.Cell>
      <Table.Cell textAlign="right">
        {user.isPendingApproval && (
          <>
            <ApprovePopup>
              <Button positive className={styles.button}>
                <Icon fitted name="checkmark" />
              </Button>
            </ApprovePopup>
            <RejectPopup>
              <Button negative className={styles.button}>
                <Icon fitted name="close" />
              </Button>
            </RejectPopup>
          </>
        )}
        <ActionsPopup userId={id}>
          <Button className={styles.button}>
            <Icon fitted name="pencil" />
          </Button>
        </ActionsPopup>
      </Table.Cell>
    </Table.Row>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
};

export default Item;
