import React from 'react';

const Legend = ({ statistics, onZoneFilter, selectedZone }) => {
  const zones = [
    {
      id: 0,
      name: 'High Heat Zone',
      color: '#ef4444',
      icon: '🔥',
      severity: 'Critical',
      count: statistics?.high_heat_zones || 0,
      description: 'Areas with significantly elevated temperatures requiring urgent intervention'
    },
    {
      id: 1,
      name: 'Medium Heat Zone',
      color: '#f97316',
      icon: '⚠️',
      severity: 'Moderate',
      count: statistics?.medium_heat_zones || 0,
      description: 'Areas with moderate temperature elevation needing attention'
    },
    {
      id: 2,
      name: 'Low Heat Zone',
      color: '#22c55e',
      icon: '✓',
      severity: 'Low',
      count: statistics?.low_heat_zones || 0,
      description: 'Areas with normal temperatures - maintenance required'
    }
  ];

  const totalPoints = statistics?.total_points || 1;

  const getPercentage = (count) => {
    return ((count / totalPoints) * 100).toFixed(1);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minWidth: '300px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>🗺️</span>
          Heat Zone Classification
        </h3>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          Click on a zone to filter map markers
        </p>
      </div>

      {/* Zone Items */}
      <div style={{ marginBottom: '20px' }}>
        {zones.map((zone) => {
          const isSelected = selectedZone === zone.id;
          const isAllSelected = selectedZone === 'all';

          return (
            <div
              key={zone.id}
              onClick={() => onZoneFilter && onZoneFilter(isSelected ? 'all' : zone.id)}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${zone.color}40 0%, ${zone.color}20 100%)`
                  : 'rgba(255, 255, 255, 0.03)',
                border: `2px solid ${isSelected ? zone.color : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
                opacity: isAllSelected || isSelected ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${zone.color}20 0%, ${zone.color}10 100%)`;
                  e.currentTarget.style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: zone.color,
                  boxShadow: `0 0 12px ${zone.color}80`,
                  flexShrink: 0
                }}></div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontSize: '14px' }}>{zone.icon}</span>
                    <span style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {zone.name}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    lineHeight: '1.4'
                  }}>
                    {zone.description}
                  </div>
                </div>
              </div>

              {/* Statistics Bar */}
              <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#d1d5db',
                    fontWeight: '500'
                  }}>
                    {zone.count} points
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: zone.color,
                    fontWeight: 'bold'
                  }}>
                    {getPercentage(zone.count)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${getPercentage(zone.count)}%`,
                    height: '100%',
                    backgroundColor: zone.color,
                    borderRadius: '3px',
                    transition: 'width 0.6s ease',
                    boxShadow: `0 0 8px ${zone.color}`
                  }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset Filter Button */}
      {selectedZone !== 'all' && (
        <button
          onClick={() => onZoneFilter && onZoneFilter('all')}
          style={{
            width: '100%',
            padding: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
          }}
        >
          🔄 Show All Zones
        </button>
      )}

      {/* Footer Info */}
      <div style={{
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: '2px solid rgba(255, 255, 255, 0.1)',
        fontSize: '11px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '4px' }}>
          Total Analysis Points: <strong style={{ color: '#9ca3af' }}>{totalPoints}</strong>
        </div>
        <div>
          Algorithm: <strong style={{ color: '#9ca3af' }}>K-Means Clustering</strong>
        </div>
      </div>

      {/* Temperature Scale */}
      {statistics?.temperature && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#9ca3af',
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            🌡️ TEMPERATURE RANGE
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}>
            <span style={{ fontSize: '12px', color: '#3b82f6' }}>
              Min: {statistics.temperature.min_lst}°C
            </span>
            <span style={{ fontSize: '12px', color: '#ef4444' }}>
              Max: {statistics.temperature.max_lst}°C
            </span>
          </div>

          {/* Temperature gradient bar */}
          <div style={{
            height: '8px',
            background: 'linear-gradient(to right, #3b82f6, #22c55e, #eab308, #f97316, #ef4444)',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}></div>

          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#d1d5db',
            textAlign: 'center'
          }}>
            Average: <strong style={{ color: 'white' }}>{statistics.temperature.avg_lst}°C</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default Legend;