create table if not exists public.community_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  content text not null,
  created_at timestamptz default now() not null
);

grant select on public.community_comments to anon, authenticated;
grant insert, delete on public.community_comments to authenticated;
grant all on public.community_comments to service_role;

alter table public.community_comments enable row level security;

create policy "public read comments" on public.community_comments
  for select using (true);
create policy "auth insert comment" on public.community_comments
  for insert with check (auth.uid() = user_id);
create policy "auth delete own comment" on public.community_comments
  for delete using (auth.uid() = user_id);

create or replace function public.sync_comments_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.community_posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.community_posts set comments_count = greatest(0, comments_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;$$;

drop trigger if exists trg_comments_count on public.community_comments;
create trigger trg_comments_count
  after insert or delete on public.community_comments
  for each row execute function public.sync_comments_count();

create index if not exists idx_community_comments_post on public.community_comments(post_id, created_at);