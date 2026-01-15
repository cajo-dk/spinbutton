export const CARD_TYPE = 'spinbutton-card';
export const CARD_NAME = 'Spinbutton';
export const CARD_VERSION = '1.0.0';

export const LAYOUT_OPTIONS = [
  'icon_name_h',
  'icon_name_state',
  'icon_name_v',
  'upper_left',
  'custom_css',
] as const;

export const STOP_OPTIONS = [
  'multi',
  'blue',
  'red',
  'green',
  'orange',
  'yellow',
  'none',
] as const;

export const DEFAULT_CONFIG = {
  type: 'custom:spinbutton-card',
  name: 'ChangeMe',
  entity: '',
  icon: 'mdi:rotate-right',
  icon_size: 32,
  layout: 'icon_name_h',
  radius: 8,
  ring_width: 2,
  card_width: '150px',
  card_height: '100px',
  stops: 'multi',
  speed: 2.5,
  background: '#1C1F2B',
  icon_color: '#FFFFFF',
  animation: true,
  show_ring: true,
  custom_css: '',
  confirm_actions: false,
  tap_action: { action: 'none' },
  hold_action: { action: 'none' },
  double_tap_action: { action: 'none' },
} as const;
