import * as migration_20260726_001907_initial from './20260726_001907_initial';
import * as migration_20260730_010559_event_popup_and_newsletters from './20260730_010559_event_popup_and_newsletters';
import * as migration_20260807_092859_event_popups from './20260807_092859_event_popups';
import * as migration_20260807_111527_event_emails from './20260807_111527_event_emails';
import * as migration_20260807_112103_move_join_url_to_email from './20260807_112103_move_join_url_to_email';
import * as migration_20260807_120039_drop_unused_collections from './20260807_120039_drop_unused_collections';
import * as migration_20260807_121320_drop_partners from './20260807_121320_drop_partners';
import * as migration_20260807_125555_legal_pages_blocks from './20260807_125555_legal_pages_blocks';
import * as migration_20260807_142339_retire_legacy_event_popup from './20260807_142339_retire_legacy_event_popup';
import * as migration_20260808_115522_drop_unused_owner_fields from './20260808_115522_drop_unused_owner_fields';
import * as migration_20260812_140836_courses_trainers_corporate_partners from './20260812_140836_courses_trainers_corporate_partners';
import * as migration_20260812_160828_courses_trainers_many from './20260812_160828_courses_trainers_many';
import * as migration_20260812_171143_courses_description_html from './20260812_171143_courses_description_html';
import * as migration_20260813_200541_courses_certification_card from './20260813_200541_courses_certification_card';
import * as migration_20260815_090122_course_categories from './20260815_090122_course_categories';

export const migrations = [
  {
    up: migration_20260726_001907_initial.up,
    down: migration_20260726_001907_initial.down,
    name: '20260726_001907_initial',
  },
  {
    up: migration_20260730_010559_event_popup_and_newsletters.up,
    down: migration_20260730_010559_event_popup_and_newsletters.down,
    name: '20260730_010559_event_popup_and_newsletters',
  },
  {
    up: migration_20260807_092859_event_popups.up,
    down: migration_20260807_092859_event_popups.down,
    name: '20260807_092859_event_popups',
  },
  {
    up: migration_20260807_111527_event_emails.up,
    down: migration_20260807_111527_event_emails.down,
    name: '20260807_111527_event_emails',
  },
  {
    up: migration_20260807_112103_move_join_url_to_email.up,
    down: migration_20260807_112103_move_join_url_to_email.down,
    name: '20260807_112103_move_join_url_to_email',
  },
  {
    up: migration_20260807_120039_drop_unused_collections.up,
    down: migration_20260807_120039_drop_unused_collections.down,
    name: '20260807_120039_drop_unused_collections',
  },
  {
    up: migration_20260807_121320_drop_partners.up,
    down: migration_20260807_121320_drop_partners.down,
    name: '20260807_121320_drop_partners',
  },
  {
    up: migration_20260807_125555_legal_pages_blocks.up,
    down: migration_20260807_125555_legal_pages_blocks.down,
    name: '20260807_125555_legal_pages_blocks',
  },
  {
    up: migration_20260807_142339_retire_legacy_event_popup.up,
    down: migration_20260807_142339_retire_legacy_event_popup.down,
    name: '20260807_142339_retire_legacy_event_popup',
  },
  {
    up: migration_20260808_115522_drop_unused_owner_fields.up,
    down: migration_20260808_115522_drop_unused_owner_fields.down,
    name: '20260808_115522_drop_unused_owner_fields',
  },
  {
    up: migration_20260812_140836_courses_trainers_corporate_partners.up,
    down: migration_20260812_140836_courses_trainers_corporate_partners.down,
    name: '20260812_140836_courses_trainers_corporate_partners',
  },
  {
    up: migration_20260812_160828_courses_trainers_many.up,
    down: migration_20260812_160828_courses_trainers_many.down,
    name: '20260812_160828_courses_trainers_many',
  },
  {
    up: migration_20260812_171143_courses_description_html.up,
    down: migration_20260812_171143_courses_description_html.down,
    name: '20260812_171143_courses_description_html',
  },
  {
    up: migration_20260813_200541_courses_certification_card.up,
    down: migration_20260813_200541_courses_certification_card.down,
    name: '20260813_200541_courses_certification_card',
  },
  {
    up: migration_20260815_090122_course_categories.up,
    down: migration_20260815_090122_course_categories.down,
    name: '20260815_090122_course_categories'
  },
];
