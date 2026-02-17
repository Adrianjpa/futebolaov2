alter table messages 
add column is_read boolean default false;

-- Policy to allow admins to update read status
create policy "Admins can update read status"
on messages for update
to authenticated
using (
  auth.uid() in (
    select id from profiles where funcao = 'admin' or funcao = 'moderator'
  )
);
