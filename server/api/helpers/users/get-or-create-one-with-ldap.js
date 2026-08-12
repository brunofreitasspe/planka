/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const {
  bind,
  search,
  escapeFilterValue,
  getEntryAttributeMap,
  getFirstAttributeValue,
} = require('../../../utils/ldap');

const ISSUER = 'ldap';

module.exports = {
  inputs: {
    emailOrUsername: {
      type: 'string',
      required: true,
    },
    password: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    invalidLdapConfiguration: {},
    invalidCredentials: {},
    missingValues: {},
    emailAlreadyInUse: {},
    usernameAlreadyInUse: {},
    activeLimitReached: {},
  },

  async fn(inputs) {
    if (!inputs.password) {
      throw 'invalidCredentials';
    }

    let ldapClient;
    try {
      ldapClient = await sails.helpers.utils.makeLdapClient();
    } catch (error) {
      sails.log.warn(`Error while connecting to LDAP: ${error}`);
      throw 'invalidLdapConfiguration';
    }

    const { config, client, close } = ldapClient;

    if (!client) {
      throw 'invalidLdapConfiguration';
    }

    try {
      const usernameAttribute = config.ldapUsernameAttribute || 'uid';
      const nameAttribute = config.ldapNameAttribute || 'cn';
      const emailAttribute = config.ldapEmailAttribute || 'mail';
      const { ldapRolesAttribute: rolesAttribute } = config;

      const attributes = [usernameAttribute, nameAttribute, emailAttribute];
      if (rolesAttribute) {
        attributes.push(rolesAttribute);
      }

      const resolveEntry = async (filter) => {
        let entries;
        try {
          entries = await search(client, config.ldapBaseDn, {
            filter,
            scope: 'sub',
            attributes,
          });
        } catch (error) {
          sails.log.warn(`Error while searching LDAP: ${error}`);
          return null;
        }

        if (entries.length !== 1) {
          return null;
        }

        const [entry] = entries;
        const entryDn = entry.pojo.objectName;

        try {
          await bind(client, entryDn, inputs.password);
        } catch (error) {
          return false;
        }

        return { entry, entryDn };
      };

      // Try to find and authenticate the LDAP entry by username first, then by email.
      const escapedIdentifier = escapeFilterValue(inputs.emailOrUsername);
      const usernameFilter = (
        config.ldapUserFilter || `(${usernameAttribute}={{username}})`
      ).replace(/{{username}}/g, escapedIdentifier);
      const emailFilter = `(${emailAttribute}=${escapedIdentifier})`;

      let resolved = await resolveEntry(usernameFilter);

      if (resolved === null) {
        resolved = await resolveEntry(emailFilter);
      }

      if (resolved === false || resolved === null) {
        throw 'invalidCredentials';
      }

      const { entry, entryDn } = resolved;
      const attributeMap = getEntryAttributeMap(entry);

      const email = getFirstAttributeValue(attributeMap, emailAttribute);
      const name = getFirstAttributeValue(attributeMap, nameAttribute);
      const username = getFirstAttributeValue(attributeMap, usernameAttribute);

      if (!email || !name) {
        throw 'missingValues';
      }

      let role = User.Roles.BOARD_USER;
      if (rolesAttribute) {
        const entryRoles = attributeMap[rolesAttribute.toLowerCase()] || [];
        // Use a Set here to avoid quadratic time complexity
        const entryRolesSet = new Set(entryRoles);

        const foundRole = [User.Roles.ADMIN, User.Roles.PROJECT_OWNER, User.Roles.BOARD_USER].find(
          (roleItem) => {
            const configRoles = config[`ldap${_.upperFirst(roleItem)}Roles`];
            return configRoles.some((configRole) => entryRolesSet.has(configRole));
          },
        );

        if (foundRole) {
          role = foundRole;
        }
      }

      const values = {
        email,
        role,
        name,
        // Planka usernames are lowercase-only, so normalize what comes from LDAP.
        username: username ? username.toLowerCase() : username,
        isLdapUser: true,
      };

      // This whole block technically needs to be executed in a transaction
      // with SERIALIZABLE isolation level (but Waterline does not support
      // that), so this will result in errors if for example users are deleted
      // concurrently with logging in via LDAP.
      let identityProviderUser = await IdentityProviderUser.qm.getOneByIssuerAndSub(
        ISSUER,
        entryDn,
      );

      let user;
      let isCreated = false;

      if (identityProviderUser) {
        user = await User.qm.getOneById(identityProviderUser.userId);
      } else {
        // If no IDP/User mapping exists, search for the user by username first, then by email.
        if (values.username) {
          user = await User.qm.getOneByUsername(values.username);
        }

        if (!user) {
          user = await User.qm.getOneByEmail(values.email);
        }

        // Otherwise, create a new user.
        if (!user) {
          user = await sails.helpers.users.createOne
            .with({
              values,
              actorUser: User.LDAP,
            })
            .intercept('usernameAlreadyInUse', 'usernameAlreadyInUse')
            .intercept('activeLimitReached', 'activeLimitReached');

          isCreated = true;
        }

        identityProviderUser = await IdentityProviderUser.qm.createOne({
          userId: user.id,
          issuer: ISSUER,
          sub: entryDn,
        });
      }

      if (!isCreated) {
        values.isDeactivated = false;

        const updateFieldKeys = [
          'email',
          'name',
          'username',
          'role',
          'isLdapUser',
          'isDeactivated',
        ];

        const updateValues = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const k of updateFieldKeys) {
          if (values[k] !== user[k]) updateValues[k] = values[k];
        }

        if (Object.keys(updateValues).length > 0) {
          user = await sails.helpers.users.updateOne
            .with({
              record: user,
              values: updateValues,
              actorUser: User.LDAP,
            })
            .intercept('emailAlreadyInUse', 'emailAlreadyInUse')
            .intercept('usernameAlreadyInUse', 'usernameAlreadyInUse')
            .intercept('activeLimitReached', 'activeLimitReached');
        }
      }

      return user;
    } finally {
      await close();
    }
  },
};
