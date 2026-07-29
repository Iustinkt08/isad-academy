import * as migration_20260726_001907_initial from './20260726_001907_initial';
import * as migration_20260727_235321_event_popup from './20260727_235321_event_popup';
import * as migration_20260729_000347_newsletters from './20260729_000347_newsletters';

export const migrations = [
  {
    up: migration_20260726_001907_initial.up,
    down: migration_20260726_001907_initial.down,
    name: '20260726_001907_initial',
  },
  {
    up: migration_20260727_235321_event_popup.up,
    down: migration_20260727_235321_event_popup.down,
    name: '20260727_235321_event_popup',
  },
  {
    up: migration_20260729_000347_newsletters.up,
    down: migration_20260729_000347_newsletters.down,
    name: '20260729_000347_newsletters'
  },
];
