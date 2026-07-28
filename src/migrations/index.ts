import * as migration_20260726_001907_initial from './20260726_001907_initial';
import * as migration_20260727_235321_event_popup from './20260727_235321_event_popup';

export const migrations = [
  {
    up: migration_20260726_001907_initial.up,
    down: migration_20260726_001907_initial.down,
    name: '20260726_001907_initial',
  },
  {
    up: migration_20260727_235321_event_popup.up,
    down: migration_20260727_235321_event_popup.down,
    name: '20260727_235321_event_popup'
  },
];
