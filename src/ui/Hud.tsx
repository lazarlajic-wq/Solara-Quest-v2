import React from 'react';
import { HudState } from '../game/events';

const KEYS = ['Q', 'E', 'R'];

export function Hud({ hud }: { hud: HudState }): React.ReactElement {
  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100);
  const resPct = Math.max(0, (hud.resource / hud.maxResource) * 100);
  const xpPct = Math.max(0, Math.min(100, (hud.xp / hud.xpNext) * 100));
  return (
    <>
      <div className="sq-hud">
        <div className="row">
          <span className="name">{hud.name}</span>
          <span>Lv {hud.level} · {classLabel(hud.classId)}</span>
        </div>
        <div className="sq-bar hp"><div style={{ width: `${hpPct}%` }} /></div>
        <div className="row"><span>HP</span><span>{hud.hp}/{hud.maxHp}</span></div>
        <div className="sq-bar res"><div style={{ width: `${resPct}%` }} /></div>
        <div className="row"><span>{resLabel(hud.resourceKind)}</span><span>{hud.resource}/{hud.maxResource}</span></div>
        <div className="sq-bar xp"><div style={{ width: `${xpPct}%` }} /></div>
        <div className="row"><span>XP</span><span>{hud.xp}/{hud.xpNext}</span></div>
        <div className="loc">{hud.regionName} — {hud.mapName} · {hud.gold} Gold · Dash {hud.dashReady ? '●' : '○'}</div>
      </div>

      {hud.comboCount > 1 && <div className="sq-combo">{hud.comboCount}x COMBO</div>}

      <div className="sq-skills">
        {hud.skills.slice(0, 3).map((s, i) => (
          <div key={i} className={`sq-skill ${s.ready ? 'ready' : 'cd'}`}>
            <span className="kb">{KEYS[i]}</span>
            <span>{s.name}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function classLabel(id: string): string {
  const map: Record<string, string> = {
    novice: 'Anfänger', assassin: 'Assassine', tank: 'Wächter',
    mage: 'Magier', archer: 'Bogenschütze', swordsman: 'Schwertkämpfer',
  };
  return map[id] ?? id;
}
function resLabel(kind: string): string {
  return kind === 'mana' ? 'Mana' : kind === 'energy' ? 'Energie' : 'Ausdauer';
}
