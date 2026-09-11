import React, { useState } from 'react';
import { CLASS_DEFS, MAIN_CLASSES, ClassId } from '../core/classes';

/**
 * The staged class-selection screen for level 5: character/weapon description,
 * playstyle, the first three skills, and an explicit confirm step (not a bare
 * dropdown), as the design requires.
 */
export function ClassSelect({ onChoose }: { onChoose: (c: ClassId) => void }): React.ReactElement {
  const [sel, setSel] = useState<ClassId | null>(null);
  const cls = sel ? CLASS_DEFS[sel] : null;

  return (
    <div className="sq-modal-bg">
      <div className="sq-modal">
        <h2>Der Weg des Kämpfers — Wähle deine Klasse</h2>
        <p style={{ color: '#b8c8d4', marginTop: 0 }}>
          Teste die fünf Meister und wähle deine Hauptklasse. Danach erhältst du sofort deine
          Region-1-Ausrüstung, Waffe und die ersten Skills.
        </p>
        <div className="sq-classgrid">
          {MAIN_CLASSES.map((id) => {
            const c = CLASS_DEFS[id];
            return (
              <div key={id} className={`sq-class ${sel === id ? 'sel' : ''}`} onClick={() => setSel(id)}>
                <h3>{c.name}</h3>
                <p>{c.playstyle}</p>
                <div className="stat">HP {c.stats.maxHp} · Def {c.stats.defense} · Crit {(c.stats.critChance * 100) | 0}%</div>
                <div className="stat">Dash: {c.dash.style}</div>
                <ul>
                  {c.skills.slice(0, 3).map((s) => (
                    <li key={s.id}><b>{s.name}</b> — {s.description}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        {cls && (
          <div className="sq-row" style={{ alignItems: 'center' }}>
            <span style={{ color: '#ffe9b0' }}>
              Gewählt: <b>{cls.name}</b>. Diese Wahl ist endgültig.
            </span>
            <button className="sq-btn" onClick={() => onChoose(cls.id)}>Klasse bestätigen</button>
            <button className="sq-btn secondary" onClick={() => setSel(null)}>Zurück</button>
          </div>
        )}
      </div>
    </div>
  );
}
