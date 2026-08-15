import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';

const styles = {
  container: {
    background: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '12px',
    minWidth: '280px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '16px',
  },
  sectionLast: {
    marginBottom: '0',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  itemHover: {
    background: '#f5f5f5',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    flex: '1',
    gap: '8px',
    cursor: 'pointer',
  },
  color: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    background: 'var(--label-color)',
    flexShrink: '0',
  },
  name: {
    fontSize: '14px',
    color: '#333',
    flex: '1',
  },
  globe: {
    fontSize: '12px',
    marginLeft: '4px',
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    fontSize: '12px',
    color: '#666',
    borderRadius: '3px',
    transition: 'background 0.2s',
  },
  actionButtonHover: {
    background: '#e8e8e8',
  },
  createNewButton: {
    width: '100%',
    padding: '8px',
    marginTop: '8px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    background: 'white',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  createNewButtonHover: {
    background: '#f9f9f9',
    borderColor: '#d0d0d0',
  },
};

// Color map for labels
const COLOR_MAP = {
  'berry-red': '#e74c3c',
  'fresh-salad': '#2ecc71',
  'dark-granite': '#34495e',
  'apricot-red': '#e67e22',
  'morning-sky': '#3498db',
  'sunny-grass': '#f1c40f',
  'lagoon-blue': '#1abc9c',
  'muddy-grey': '#95a5a6',
};

function LabelSelector({
  labels = [],
  currentLabels = [],
  onAdd,
  onRemove,
  isProjectManager = false,
  onPromote,
  onDemote,
  onCreateLocal,
}) {
  // Separate and filter labels
  const { projectLabels, boardLabels } = useMemo(() => {
    const project = labels.filter((l) => l.isGlobal);
    const board = labels.filter((l) => !l.isGlobal);

    // Filter globals by permission if not manager
    if (!isProjectManager) {
      return {
        projectLabels: project.filter((l) => l.canBeUsedByMembers !== false),
        boardLabels: board,
      };
    }

    return { projectLabels: project, boardLabels: board };
  }, [labels, isProjectManager]);

  const isSelected = useCallback((labelId) => currentLabels.includes(labelId), [currentLabels]);

  const handleToggle = useCallback(
    (labelId) => {
      if (isSelected(labelId)) {
        onRemove?.(labelId);
      } else {
        onAdd?.(labelId);
      }
    },
    [isSelected, onAdd, onRemove],
  );

  const handleActionButtonHover = useCallback((e) => {
    // eslint-disable-next-line no-param-reassign
    e.currentTarget.style.background = '#e8e8e8';
  }, []);

  const handleActionButtonHoverEnd = useCallback((e) => {
    // eslint-disable-next-line no-param-reassign
    e.currentTarget.style.background = 'none';
  }, []);

  return (
    <div style={styles.container}>
      {/* Project Labels Section */}
      {projectLabels.length > 0 && (
        <div style={projectLabels.length > 0 ? styles.section : styles.sectionLast}>
          <div style={styles.sectionTitle}>Etiquetas do Projeto</div>
          {projectLabels.map((label) => (
            <div key={label.id} style={styles.item}>
              <div
                style={styles.content}
                onClick={() => handleToggle(label.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleToggle(label.id);
                  }
                }}
              >
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={isSelected(label.id)}
                  onChange={() => handleToggle(label.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  style={{
                    ...styles.color,
                    background: COLOR_MAP[label.color] || label.color,
                  }}
                />
                <span style={styles.name}>
                  {label.name}
                  <span style={styles.globe}>🌐</span>
                </span>
              </div>
              {isProjectManager && (
                <div style={styles.actions}>
                  <button
                    type="button"
                    style={styles.actionButton}
                    onMouseEnter={handleActionButtonHover}
                    onMouseLeave={handleActionButtonHoverEnd}
                    onClick={() => onDemote?.(label.id)}
                    title="Rebaixar para local"
                  >
                    ↓ Rebaixar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Board Labels Section */}
      {boardLabels.length > 0 && (
        <div
          style={
            projectLabels.length > 0 && boardLabels.length > 0 ? styles.section : styles.sectionLast
          }
        >
          <div style={styles.sectionTitle}>Etiquetas do Quadro</div>
          {boardLabels.map((label) => (
            <div key={label.id} style={styles.item}>
              <div
                style={styles.content}
                onClick={() => handleToggle(label.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleToggle(label.id);
                  }
                }}
              >
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={isSelected(label.id)}
                  onChange={() => handleToggle(label.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  style={{
                    ...styles.color,
                    background: COLOR_MAP[label.color] || label.color,
                  }}
                />
                <span style={styles.name}>{label.name}</span>
              </div>
              {isProjectManager && (
                <div style={styles.actions}>
                  <button
                    type="button"
                    style={styles.actionButton}
                    onMouseEnter={handleActionButtonHover}
                    onMouseLeave={handleActionButtonHoverEnd}
                    onClick={() => onPromote?.(label.id)}
                    title="Promover para global"
                  >
                    ↑ Promover
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create New Button */}
      {isProjectManager && (
        <button
          type="button"
          style={styles.createNewButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9f9f9';
            e.currentTarget.style.borderColor = '#d0d0d0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#e0e0e0';
          }}
          onClick={() => onCreateLocal?.()}
        >
          + Criar nova etiqueta local
        </button>
      )}
    </div>
  );
}

LabelSelector.propTypes = {
  labels: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
      isGlobal: PropTypes.bool,
      canBeUsedByMembers: PropTypes.bool,
    }),
  ),
  currentLabels: PropTypes.arrayOf(PropTypes.string),
  onAdd: PropTypes.func,
  onRemove: PropTypes.func,
  isProjectManager: PropTypes.bool,
  onPromote: PropTypes.func,
  onDemote: PropTypes.func,
  onCreateLocal: PropTypes.func,
};

LabelSelector.defaultProps = {
  labels: [],
  currentLabels: [],
  onAdd: undefined,
  onRemove: undefined,
  isProjectManager: false,
  onPromote: undefined,
  onDemote: undefined,
  onCreateLocal: undefined,
};

export default LabelSelector;
