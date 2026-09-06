-- Profile screen additions: privacy/consent opt-ins (requirements.md §6.5/§6.7 — opt-in
-- leaderboard and analytics/privacy controls are v1 scope, not a mockup-only toggle) and
-- an avatar image bucket.

alter table public.profiles
  add column analytics_opt_in boolean not null default true,
  add column leaderboard_opt_in boolean not null default false;
-- Leaderboard defaults OFF (GDPR: no default-public comparison, CLAUDE.md guardrail).
-- Analytics defaults ON to match design.md's mockup default, covering only the
-- crash-reporting-adjacent product analytics already implied as baseline in requirements.md
-- §7 ("clear consent for any analytics beyond basic crash reporting" — this toggle IS that
-- consent surface); revisit the default if a specific analytics provider's own terms need
-- opt-in-by-default instead once one is chosen (see requirements.md §10 open question).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
-- Public read (avatar images aren't sensitive and need to render without a signed URL);
-- writes are restricted below to each user's own folder.

create policy "avatar images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- Path convention enforced by the client: avatars/{user_id}/<filename>.
