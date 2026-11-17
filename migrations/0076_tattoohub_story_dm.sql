-- Story replies can land in the recipient's direct messages.
alter table tattoohub_messages add column if not exists story_id text not null default '';
