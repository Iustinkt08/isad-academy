import * as migration_20260726_001907_initial from './20260726_001907_initial';

export const migrations = [
  {
    up: migration_20260726_001907_initial.up,
    down: migration_20260726_001907_initial.down,
    name: '20260726_001907_initial'
  },
];
