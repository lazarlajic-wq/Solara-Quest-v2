import React, { useEffect, useRef, useState, useCallback } from 'react';
import type Phaser from 'phaser';
import { createGame } from '../game/SolaraGame';
import { gameBus, HudState, ToastMsg } from '../game/events';
import { session } from '../game/session';
import { hasSave } from '../core/save';
import { Hud } from './Hud';
import { Toasts } from './Toasts';
import { ClassSelect } from './ClassSelect';
import { PortalMenu } from './PortalMenu';
import { Dialog } from './Dialog';
import type { ClassId } from '../core/classes';

type Screen = 'menu' | 'game';

interface Menus {
  classSelect: boolean;
  portal: { mapId: string; label: string }[] | null;
  dialog: { name: string; lines: string[] } | null;
}

export function App(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>('menu');
  const [hud, setHud] = useState<HudState | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: ToastMsg }[]>([]);
  const [menus, setMenus] = useState<Menus>({ classSelect: false, portal: null, dialog: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    const onHud = (s: HudState) => setHud(s);
    const onToast = (t: ToastMsg) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev, { id, msg: t }].slice(-4));
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
    };
    const onClass = () => setMenus((m) => ({ ...m, classSelect: true }));
    const onPortal = (p: { dests: { mapId: string; label: string }[] }) =>
      setMenus((m) => ({ ...m, portal: p.dests }));
    const onDialog = (d: { name: string; lines: string[] }) =>
      setMenus((m) => ({ ...m, dialog: d }));
    const onClose = () => setMenus({ classSelect: false, portal: null, dialog: null });

    gameBus.onTyped('hud', onHud);
    gameBus.onTyped('toast', onToast);
    gameBus.onTyped('openClassSelect', onClass);
    gameBus.onTyped('openPortal', onPortal);
    gameBus.onTyped('openDialog', onDialog);
    gameBus.onTyped('closeMenus', onClose);
    return () => {
      gameBus.offTyped('hud', onHud);
      gameBus.offTyped('toast', onToast);
      gameBus.offTyped('openClassSelect', onClass);
      gameBus.offTyped('openPortal', onPortal);
      gameBus.offTyped('openDialog', onDialog);
      gameBus.offTyped('closeMenus', onClose);
    };
  }, []);

  useEffect(() => {
    if (screen === 'game' && containerRef.current && !gameRef.current) {
      gameRef.current = createGame(containerRef.current);
    }
    return () => {
      if (screen !== 'game' && gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [screen]);

  const startNew = useCallback(() => {
    session.reset();
    setScreen('game');
  }, []);
  const startContinue = useCallback(() => setScreen('game'), []);
  const chooseClass = useCallback((c: ClassId) => {
    gameBus.emitTyped('chooseClass', c);
    setMenus((m) => ({ ...m, classSelect: false }));
  }, []);
  const travel = useCallback((mapId: string) => {
    gameBus.emitTyped('travelTo', mapId);
    setMenus((m) => ({ ...m, portal: null }));
  }, []);

  if (screen === 'menu') {
    return (
      <div className="sq-root">
        <div className="sq-menu">
          <h1 className="sq-title">SOLARA QUEST</h1>
          <p className="sq-sub">
            Ein schnelles Top-down Pixel-Art Action-MMORPG. Fünf Regionen, acht Bewegungsrichtungen,
            Dash mit Shift, Combos und Klassenwahl auf Level 5. WASD bewegen · Maus/Linksklick angreifen ·
            Shift dashen · Space interagieren · Q/E/R Skills.
          </p>
          <button className="sq-btn" onClick={startNew}>Neues Spiel</button>
          <button className="sq-btn secondary" onClick={startContinue} disabled={!hasSave(session.store)}>
            Fortsetzen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sq-root">
      <div className="sq-canvas" ref={containerRef} />
      <div className="sq-overlay">
        {hud && <Hud hud={hud} />}
        <Toasts toasts={toasts} />
        <div className="sq-help">
          WASD bewegen · Shift Dash · Linksklick Angriff · Q/E/R Skills · Space Interagieren
        </div>
        {menus.classSelect && <ClassSelect onChoose={chooseClass} />}
        {menus.portal && (
          <PortalMenu dests={menus.portal} onTravel={travel} onClose={() => setMenus((m) => ({ ...m, portal: null }))} />
        )}
        {menus.dialog && (
          <Dialog data={menus.dialog} onClose={() => setMenus((m) => ({ ...m, dialog: null }))} />
        )}
      </div>
    </div>
  );
}
