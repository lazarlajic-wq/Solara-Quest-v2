import React from 'react';
import { ToastMsg } from '../game/events';

export function Toasts({ toasts }: { toasts: { id: number; msg: ToastMsg }[] }): React.ReactElement {
  return (
    <div className="sq-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`sq-toast ${t.msg.kind}`}>{t.msg.text}</div>
      ))}
    </div>
  );
}
