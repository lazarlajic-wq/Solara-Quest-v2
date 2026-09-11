import React from 'react';

export function PortalMenu(props: {
  dests: { mapId: string; label: string }[];
  onTravel: (mapId: string) => void;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="sq-modal-bg">
      <div className="sq-modal" style={{ maxWidth: 480 }}>
        <h2>Stadtportal</h2>
        <p style={{ color: '#b8c8d4', marginTop: 0 }}>
          Reise zu einer freigeschalteten Stadt. Nur besiegte Regionen erscheinen hier.
        </p>
        <div className="sq-portal-list">
          {props.dests.length === 0 && <span>Noch keine weiteren Ziele freigeschaltet.</span>}
          {props.dests.map((d) => (
            <button key={d.mapId} className="sq-btn secondary" onClick={() => props.onTravel(d.mapId)}>
              {d.label}
            </button>
          ))}
        </div>
        <button className="sq-btn sq-close" onClick={props.onClose}>Schließen</button>
      </div>
    </div>
  );
}
