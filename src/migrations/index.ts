import * as migration_20260726_001907_initial from './20260726_001907_initial';
import * as migration_20260730_010559_event_popup_and_newsletters from './20260730_010559_event_popup_and_newsletters';

export const migrations = [
  {
    up: migration_20260726_001907_initial.up,
    down: migration_20260726_001907_initial.down,
    name: '20260726_001907_initial',
  },
  {
    up: migration_20260730_010559_event_popup_and_newsletters.up,
    down: migration_20260730_010559_event_popup_and_newsletters.down,
    name: '20260730_010559_event_popup_and_newsletters'
  },
];
