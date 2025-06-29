const KEYBOARD_CONTROLS = {
  transform: [
    "W - translate | E - rotate | R - scale",
    "+/- - adjust control size",
  ],
  transformOptions: [
    "Q - toggle world/local space",
    "Shift - snap to grid (hold)",
    "X/Y/Z - toggle axis visibility",
    "Spacebar - toggle controls enabled",
    "Esc - reset current transform",
  ],
  camera: ["C - toggle perspective/orthographic camera", "V - random zoom"],
} as const;

const CONTROLS_STYLES = {
  container:
    "absolute top-0 left-0 text-gray-400 font-mono p-2.5 select-none pointer-events-none z-10 whitespace-pre-line text-xs max-w-xs bg-black/40",
  text: "leading-relaxed",
} as const;

export const ControlsInfo = () => {
  const controlsText = [
    ...KEYBOARD_CONTROLS.transform,
    ...KEYBOARD_CONTROLS.transformOptions,
    ...KEYBOARD_CONTROLS.camera,
  ].join("\n");

  return (
    <div className={CONTROLS_STYLES.container}>
      <div className={CONTROLS_STYLES.text}>{controlsText}</div>
    </div>
  );
};
