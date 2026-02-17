-- Helper function to seed an entire week of schedules for one staff member
create or replace function seed_weekly_schedule(
  p_staff_email text,
  p_staff_name text,
  p_staff_color text,
  p_monday_start time, p_monday_end time,
  p_tuesday_start time, p_tuesday_end time,
  p_wednesday_start time, p_wednesday_end time,
  p_thursday_start time, p_thursday_end time,
  p_friday_start time, p_friday_end time,
  p_saturday_start time default null, p_saturday_end time default null,
  p_sunday_start time default null, p_sunday_end time default null
) returns void as $$
declare
  v_user_id uuid;
  v_monday date := '2026-02-09'; -- Hardcoded for this demo week
begin
  -- 1. Get or Create User (Mocking auth.users entry - simplified for demo/dev env)
  -- In a real Supabase Auth setup, we can't easily insert into auth.users directly via SQL without admin rights.
  -- BUT for dev/local, we can often do this or rely on existing users.
  -- Strategy: Check if profile exists by name. If not, try to insert into auth.users if possible, or fail gracefully.
  
  -- Attempt to find existing user by email
  select id into v_user_id from auth.users where email = p_staff_email;
  
  if v_user_id is null then
    -- Create new user (Simulated)
    v_user_id := uuid_generate_v4();
    
    insert into auth.users (id, email, encrypted_password, email_confirmed_at)
    values (v_user_id, p_staff_email, 'password123', now());
    
    -- Create Profile
    insert into profiles (id, name, full_name, role, color)
    values (v_user_id, p_staff_name, p_staff_name, 'staff', p_staff_color);
  else
    -- Update existing profile to match requested data
    update profiles 
    set name = p_staff_name, full_name = p_staff_name, color = p_staff_color 
    where id = v_user_id;
  end if;

  -- 2. Clean existing schedules for this week for this user
  delete from staff_schedules 
  where staff_id = v_user_id 
  and date between v_monday and (v_monday + interval '6 days');

  -- 3. Insert Schedules
  -- Monday
  if p_monday_start is not null then
    insert into staff_schedules (staff_id, date, start_time, end_time, is_working_day)
    values (v_user_id, v_monday, p_monday_start, p_monday_end, true);
  end if;

  -- Tuesday
  if p_tuesday_start is not null then
    insert into staff_schedules (staff_id, date, start_time, end_time, is_working_day)
    values (v_user_id, v_monday + interval '1 day', p_tuesday_start, p_tuesday_end, true);
  end if;

  -- Wednesday
  if p_wednesday_start is not null then
    insert into staff_schedules (staff_id, date, start_time, end_time, is_working_day)
    values (v_user_id, v_monday + interval '2 days', p_wednesday_start, p_wednesday_end, true);
  end if;

  -- Thursday
  if p_thursday_start is not null then
    insert into staff_schedules (staff_id, date, start_time, end_time, is_working_day)
    values (v_user_id, v_monday + interval '3 days', p_thursday_start, p_thursday_end, true);
  end if;

  -- Friday
  if p_friday_start is not null then
    insert into staff_schedules (staff_id, date, start_time, end_time, is_working_day)
    values (v_user_id, v_monday + interval '4 days', p_friday_start, p_friday_end, true);
  end if;

  -- Saturday
  if p_saturday_start is not null then
    insert into staff_schedules (staff_id, date, start_time, end_time, is_working_day)
    values (v_user_id, v_monday + interval '5 days', p_saturday_start, p_saturday_end, true);
  end if;

  -- Sunday
  if p_sunday_start is not null then
    insert into staff_schedules (staff_id, date, start_time, end_time, is_working_day)
    values (v_user_id, v_monday + interval '6 days', p_sunday_start, p_sunday_end, true);
  end if;

end;
$$ language plpgsql;

-- Execute Seeds for the 5 staff members
-- Elvira: Mon-Fri 10-20
select seed_weekly_schedule(
  'elvira@example.com', 'Elvira', '#fbbf24', -- Amber
  '10:00', '20:00', '10:00', '20:00', '10:00', '20:00', '10:00', '20:00', '10:00', '20:00'
);

-- Yorka: Mon 10-20, Tue 09-20, Wed-Fri 10-20
select seed_weekly_schedule(
  'yorka@example.com', 'Yorka', '#f87171', -- Red
  '10:00', '20:00', '09:00', '20:00', '10:00', '20:00', '10:00', '20:00', '10:00', '20:00'
);

-- J Motezuma: Mon-Fri 16-20  (Assuming "16:00 - 20:00" for all days visible in snippet)
select seed_weekly_schedule(
  'motezuma@example.com', 'J Motezuma', '#a78bfa', -- Purple
  '16:00', '20:00', '16:00', '20:00', '16:00', '20:00', '16:00', '20:00', '16:00', '20:00'
);

-- ALEJANDRA: Mon 10-20, Tue 12:00-12:30 (Break?), Wed 13-20, Thu-Fri 10-20
select seed_weekly_schedule(
  'alejandra@example.com', 'ALEJANDRA', '#2dd4bf', -- Teal
  '10:00', '20:00', '12:00', '12:30', '13:00', '20:00', '10:00', '20:00', '10:00', '20:00'
);

-- Yessica: Mon-Fri 10-20
select seed_weekly_schedule(
  'yessica@example.com', 'Yessica', '#60a5fa', -- Blue
  '10:00', '20:00', '10:00', '20:00', '10:00', '20:00', '10:00', '20:00', '10:00', '20:00'
);

-- Cleanup function (optional, kept for clarity)
drop function seed_weekly_schedule;
