# Database schema

All tables live in the `public` schema with RLS enabled. Privileges are
granted to `authenticated` (and `anon` only where a policy allows it).

## Enums

- `app_role` — `'admin' | 'moderator' | 'user'`

## Tables

### `farmer_profiles` — one row per farm a user manages
| Column            | Type                      | Notes                                |
| ----------------- | ------------------------- | ------------------------------------ |
| id                | uuid PK                   | `gen_random_uuid()`                  |
| user_id           | uuid → auth.users         | owner                                |
| full_name         | text                      |                                      |
| farm_location     | text                      |                                      |
| farm_size         | text                      | free-form ("2.5 acre")               |
| soil_type         | text                      |                                      |
| preferred_language| text                      | i18n code                            |
| avatar_url        | text                      | Storage URL                          |
| farmer_details    | jsonb                     | extended profile (age, crops, ...)   |
| is_active         | bool                      |                                      |
| created_at        | timestamptz default now() |                                      |
| updated_at        | timestamptz               | bumped by `set_updated_at` trigger   |

### `user_roles` — privilege table (never put roles on profiles)
| Column   | Type                | Notes                                |
| -------- | ------------------- | ------------------------------------ |
| id       | uuid PK             |                                      |
| user_id  | uuid → auth.users   |                                      |
| role     | app_role            | unique with user_id                  |
| created_at | timestamptz       |                                      |

Use `public.has_role(uid, 'admin')` in policies — it is `SECURITY DEFINER`
to avoid recursive RLS.

### `user_xp` — gamification ledger
| Column            | Type           |
| ----------------- | -------------- |
| user_id           | uuid PK        |
| xp                | int            |
| level             | int            |
| streak_days       | int            |
| last_active_date  | date           |

Writes go through `bump_streak()` and `award_badge(_badge_id)` RPCs only.

### `achievements` — earned badges
`id`, `user_id`, `badge_id`, `badge_name`, `xp`, `awarded_at`.
Catalog of valid badges lives in `_badge_catalog(_badge_id)` function.

### `user_settings` — per-user app state
`user_id` PK, `active_profile_id`, `theme`, `language`, `notification_pref`.

### `farm_zones` — Field Mapper polygons
`id`, `user_id`, `profile_id` → farmer_profiles, `crop`, `color`,
`hectares`, `acres`, `latlngs` (jsonb array of `{lat, lng}`),
`created_at`, `updated_at`.

### `community_posts`
`id`, `user_id`, `author_name`, `author_avatar`, `body`, `image_url`,
`tags` (text[]), `likes_count`, `comments_count`, `created_at`,
`updated_at`, `pinned`.

### `community_likes`
`id`, `post_id` → community_posts, `user_id`, `created_at`.
Unique on `(post_id, user_id)`. Trigger updates `community_posts.likes_count`.

### `community_comments`
`id`, `post_id`, `user_id`, `author_name`, `body`, `created_at`,
`updated_at`. Trigger updates `community_posts.comments_count`.

### `research_papers` — admin-curated PDFs
`id`, `title`, `abstract`, `authors`, `tags`, `category`, `year`,
`pdf_url`, `views`, `downloads`, `created_at`, `created_by`.

### `team_members` — about/team page
`id`, `name`, `role`, `bio`, `photo_url`, `email`, `linkedin`, `twitter`,
`order_index`, `is_active`, `created_at`, `updated_at`.

## Functions (RPC)

| Function                            | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `has_role(uid, role)`               | Policy helper, SECURITY DEFINER          |
| `admin_exists()`                    | Bootstrap check                          |
| `bump_streak()`                     | Idempotent daily streak bump             |
| `award_badge(_badge_id)`            | Grant a badge + XP, idempotent           |
| `bump_post_likes()` (trigger fn)    | Maintains `likes_count`                  |
| `sync_post_likes_count()` (trigger) | Same; older variant                      |
| `sync_comments_count()` (trigger)   | Maintains `comments_count`               |
| `bump_paper_counter(id, field)`     | Increments `views` or `downloads`        |
| `set_updated_at()` (trigger)        | Generic `updated_at` bumper              |

## Storage buckets

| Bucket             | Public | Used by                              |
| ------------------ | ------ | ------------------------------------ |
| `team-photos`      | yes    | Team page                            |
| `avatars`          | yes    | Farmer profile avatars               |
| `community-photos` | yes    | Community post images                |
| `research-papers`  | no     | Signed-URL PDF downloads             |
