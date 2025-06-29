import * as THREE from "three";

// Camera Configuration
export const CAMERA_CONFIG = {
  PERSPECTIVE: {
    FOV: 50,
    NEAR: 0.1,
    FAR: 100,
    INITIAL_POSITION: { x: 5, y: 2.5, z: 5 }
  },
  ORTHOGRAPHIC: {
    LEFT_MULTIPLIER: -5,
    RIGHT_MULTIPLIER: 5,
    TOP: 5,
    BOTTOM: -5,
    NEAR: 0.1,
    FAR: 100
  }
};

// Grid Configuration
export const GRID_CONFIG = {
  SIZE: 5,
  DIVISIONS: 10,
  CENTER_COLOR: 0x888888,
  GRID_COLOR: 0x444444
};

// Lighting Configuration
export const LIGHTING_CONFIG = {
  AMBIENT: { color: 0xffffff, intensity: 1 },
  DIRECTIONAL: { color: 0xffffff, intensity: 4, position: { x: 1, y: 1, z: 1 } }
};

// Mesh Configuration
export const MESH_CONFIG = {
  MATERIAL: {
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9
  },
  SCALE_FACTOR: 2,
  EXPORT_MATERIAL: { color: 0x00ff00 }
};

// Keyboard Shortcuts Configuration
export const KEYBOARD_SHORTCUTS = {
  TRANSLATE: 'w',
  ROTATE: 'e',
  SCALE: 'r',
  TOGGLE_SPACE: 'q',
  TOGGLE_CAMERA: 'c',
  RANDOM_ZOOM: 'v',
  INCREASE_SIZE: ['+', '='],
  DECREASE_SIZE: ['-', '_'],
  TOGGLE_X: 'x',
  TOGGLE_Y: 'y',
  TOGGLE_Z: 'z',
  TOGGLE_ENABLED: ' ',
  RESET: 'escape',
  SNAP: 'shift'
};

// Snap Values Configuration
export const SNAP_VALUES = {
  TRANSLATION: 1,
  ROTATION: THREE.MathUtils.degToRad(15),
  SCALE: 0.25
};

// Random Zoom Configuration
export const RANDOM_ZOOM_CONFIG = {
  FOV_MULTIPLIER: 160,
  ORTHO_MULTIPLIER: 500,
  ZOOM_MULTIPLIER: 5
}; 