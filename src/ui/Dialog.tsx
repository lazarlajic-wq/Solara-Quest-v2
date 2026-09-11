import React from 'react';

export function Dialog(props: {
  data: { name: string; lines: string[] };
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="sq-dialog">
      <div className="dn">{props.data.name}</div>
      {props.data.lines.map((l, i) => (
        <div key={i} className="dl">{l}</div>
      ))}
      <button className="sq-btn secondary sq-close" onClick={props.onClose}>Weiter</button>
    </div>
  );
}
