alter table "public"."messages" add column "delivered" boolean not null default false;

create policy "Enable update for users based on receiver_id"
on "public"."messages"
as permissive
for update
to public
using ((auth.uid() = receiver_id))
with check ((auth.uid() = receiver_id));

-- Admin can update any message (already covered by Full Access policy, but ensuring specifics)
-- Existing admin policy usually covers ALL operations.
