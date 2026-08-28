/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';

import Config from '../constants/Config';
import selectors from '../selectors';

const useExport = () => {
  const accessToken = useSelector(selectors.selectAccessToken);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const exportBoard = useCallback(
    async (boardId, { format, priority, assigneeId, labelIds, listIds }) => {
      setIsExporting(true);
      setError(null);

      try {
        const payload = {
          format,
          priority,
        };

        // Optional filters: omit when empty — the API's idInput/idsInput
        // validators reject null/empty values (see server/utils/inputs.js).
        if (assigneeId) {
          payload.assigneeId = assigneeId;
        }
        if (labelIds && labelIds.length > 0) {
          payload.labelIds = labelIds.join(',');
        }
        if (listIds && listIds.length > 0) {
          payload.listIds = listIds.join(',');
        }

        const response = await fetch(`${Config.BASE_PATH}/api/boards/${boardId}/export`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include',
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.noCards || body.error || 'Export failed');
        }

        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition') || '';
        const match = /filename="?([^"]+)"?/.exec(disposition);
        const filename = match ? match[1] : `board-export-${format}`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
      } catch (err) {
        setError(err.message || 'Export failed');
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [accessToken],
  );

  return {
    isExporting,
    error,
    exportBoard,
  };
};

export default useExport;
