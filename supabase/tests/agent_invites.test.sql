DO $test$
DECLARE
  v_agency_a uuid := '00000000-0000-0000-0000-0000000000a1';
  v_agency_b uuid := '00000000-0000-0000-0000-0000000000b1';
  v_owner_a uuid := '00000000-0000-0000-0000-00000000aa01';
  v_owner_b uuid := '00000000-0000-0000-0000-00000000bb01';
  v_client_c uuid := '00000000-0000-0000-0000-00000000cc01';
  v_client_f uuid := '00000000-0000-0000-0000-00000000ff01';
  v_agent_e uuid := '00000000-0000-0000-0000-00000000ee01';
  v_client_g uuid := '00000000-0000-0000-0000-00000000aa02';
  v_client_h uuid := '00000000-0000-0000-0000-00000000aa03';
  v_new_1 uuid := '00000000-0000-0000-0000-00000000d001';
  v_new_2 uuid := '00000000-0000-0000-0000-00000000d002';
  v_new_3 uuid := '00000000-0000-0000-0000-00000000d003';
  v_res text[] := ARRAY[]::text[];
  v_status text;
  v_state text;
  v_count int;
  v_role text;
  v_agency uuid;
  v_invite uuid;
  v_email text;
BEGIN
  INSERT INTO public.agencies (id, name) VALUES (v_agency_a, 'Test Agency A'), (v_agency_b, 'Test Agency B');

  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES
    (v_owner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.a@example.test', '{"provider":"google","providers":["google"]}', '{}', now(), now(), now()),
    (v_owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.b@example.test', '{"provider":"google","providers":["google"]}', '{}', now(), now(), now()),
    (v_client_c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client.c@example.test', '{"provider":"google","providers":["google"]}', '{}', now(), now(), now()),
    (v_client_f, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client.f@example.test', '{"provider":"google","providers":["google"]}', '{}', now(), now(), now()),
    (v_agent_e, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agent.e@example.test', '{"provider":"google","providers":["google"]}', '{}', now(), now(), now()),
    (v_client_g, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client.g@example.test', '{"provider":"google","providers":["google"]}', '{}', now(), now(), now()),
    (v_client_h, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'h@example.test', '{"provider":"email","providers":["email"]}', '{}', NULL, now(), now());

  UPDATE public.profiles SET role = 'owner', agency_id = v_agency_a WHERE user_id = v_owner_a;
  UPDATE public.profiles SET role = 'owner', agency_id = v_agency_b WHERE user_id = v_owner_b;
  UPDATE public.profiles SET role = 'agent', agency_id = v_agency_b WHERE user_id = v_agent_e;

  SELECT count(*) INTO v_count FROM public.profiles WHERE user_id IN (v_client_c, v_client_f, v_client_g, v_client_h) AND role = 'client' AND agency_id IS NULL;
  v_res := v_res || (CASE WHEN v_count = 4 THEN 'PASS' ELSE 'FAIL' END || ' 01 new sign-ups still start as clients');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('client.c@example.test');
  EXECUTE 'RESET ROLE';
  SELECT role, agency_id INTO v_role, v_agency FROM public.profiles WHERE user_id = v_client_c;
  v_res := v_res || (CASE WHEN v_status = 'agent_added' AND v_role = 'agent' AND v_agency = v_agency_a THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ',' || coalesce(v_role, 'null') || ')' END || ' 02 existing client becomes an agent of the owner agency');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('  New.Person@Example.TEST ');
  EXECUTE 'RESET ROLE';
  SELECT email, agency_id INTO v_email, v_agency FROM public.agent_invites WHERE email = 'new.person@example.test';
  v_res := v_res || (CASE WHEN v_status = 'invited' AND v_agency = v_agency_a THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 03 unknown email becomes a normalised pending invite');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('new.person@example.test');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_status = 'already_listed' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 04 adding the same pending email again is already_listed');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_b, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('new.person@example.test');
  EXECUTE 'RESET ROLE';
  SELECT agency_id INTO v_agency FROM public.agent_invites WHERE email = 'new.person@example.test';
  v_res := v_res || (CASE WHEN v_status = 'unavailable' AND v_agency = v_agency_a THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 05 another agency cannot take a pending invite');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('owner.a@example.test');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_status = 'unavailable' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 06 the owner own email is unavailable');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('agent.e@example.test');
  EXECUTE 'RESET ROLE';
  SELECT role, agency_id INTO v_role, v_agency FROM public.profiles WHERE user_id = v_agent_e;
  v_res := v_res || (CASE WHEN v_status = 'unavailable' AND v_agency = v_agency_b THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 07 an agent of another agency is unavailable and unchanged');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('client.c@example.test');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_status = 'already_listed' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 08 an agent of the same agency is already_listed');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('CLIENT.G@Example.TEST');
  EXECUTE 'RESET ROLE';
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_client_g;
  v_res := v_res || (CASE WHEN v_status = 'agent_added' AND v_role = 'agent' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 09 matching ignores letter case');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent('h@example.test');
  EXECUTE 'RESET ROLE';
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_client_h;
  v_res := v_res || (CASE WHEN v_status = 'invited' AND v_role = 'client' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 10 an account with an unconfirmed email is not matched directly');

  UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_client_h;
  SELECT role, agency_id INTO v_role, v_agency FROM public.profiles WHERE user_id = v_client_h;
  SELECT count(*) INTO v_count FROM public.agent_invites WHERE email = 'h@example.test';
  v_res := v_res || (CASE WHEN v_role = 'agent' AND v_agency = v_agency_a AND v_count = 0 THEN 'PASS' ELSE 'FAIL(' || coalesce(v_role, 'null') || ',' || v_count || ')' END || ' 11 confirming the email later applies the pending invite');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client_f, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.add_agent('someone@example.test');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 12 a client cannot add agents');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client_c, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.add_agent('someone@example.test');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 13 an agent cannot add agents');

  BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.add_agent('someone@example.test');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 14 an anonymous caller is rejected');

  FOREACH v_email IN ARRAY ARRAY['', '   ', 'plain', 'a@b', 'a b@c.de', repeat('x', 250) || '@example.test']
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      PERFORM public.add_agent(v_email);
      v_state := 'no error';
    EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
    END;
    EXECUTE 'RESET ROLE';
    v_res := v_res || (CASE WHEN v_state = '22023' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 15 invalid email rejected [' || left(v_email, 12) || ']');
  END LOOP;

  SELECT id INTO v_invite FROM public.agent_invites WHERE email = 'new.person@example.test';

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_b, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.cancel_agent_invite(v_invite);
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO v_count FROM public.agent_invites WHERE id = v_invite;
  v_res := v_res || (CASE WHEN v_state = 'P0002' AND v_count = 1 THEN 'PASS' ELSE 'FAIL(' || v_state || ',' || v_count || ')' END || ' 16 another owner cannot cancel this invite');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client_f, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.cancel_agent_invite(v_invite);
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 17 a client cannot cancel invites');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.cancel_agent_invite(v_invite);
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO v_count FROM public.agent_invites WHERE id = v_invite;
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END || ' 18 the owner cancels their own pending invite');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.cancel_agent_invite(v_invite);
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = 'P0002' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 19 cancelling twice reports not found');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.add_agent('signup.one@example.test');
  PERFORM public.add_agent('signup.two@example.test');
  PERFORM public.add_agent('signup.three@example.test');
  EXECUTE 'RESET ROLE';

  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (v_new_1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'Signup.One@Example.TEST', '{"provider":"google","providers":["google"]}', '{}', NULL, now(), now());
  SELECT role, agency_id INTO v_role, v_agency FROM public.profiles WHERE user_id = v_new_1;
  SELECT count(*) INTO v_count FROM public.agent_invites WHERE email = 'signup.one@example.test';
  v_res := v_res || (CASE WHEN v_role = 'agent' AND v_agency = v_agency_a AND v_count = 0 THEN 'PASS' ELSE 'FAIL(' || coalesce(v_role, 'null') || ',' || v_count || ')' END || ' 20 first Google sign-in consumes the invite (any letter case)');

  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (v_new_3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'signup.three@example.test', '{"provider":"apple","providers":["apple"]}', '{}', NULL, now(), now());
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_new_3;
  v_res := v_res || (CASE WHEN v_role = 'agent' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_role, 'null') || ')' END || ' 21 first Apple sign-in consumes the invite');

  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (v_new_2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'signup.two@example.test', '{"provider":"email","providers":["email"]}', '{"email_verified":true}', NULL, now(), now());
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_new_2;
  SELECT count(*) INTO v_count FROM public.agent_invites WHERE email = 'signup.two@example.test';
  v_res := v_res || (CASE WHEN v_role = 'client' AND v_count = 1 THEN 'PASS' ELSE 'FAIL(' || coalesce(v_role, 'null') || ',' || v_count || ')' END || ' 22 an email-provider sign-up cannot claim an invite through user metadata');

  UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_new_2;
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_new_2;
  v_res := v_res || (CASE WHEN v_role = 'agent' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_role, 'null') || ')' END || ' 23 the same sign-up becomes an agent once its email is confirmed');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.add_agent('rls.a@example.test');
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_b, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.add_agent('rls.b@example.test');
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*), min(email) INTO v_count, v_email FROM public.agent_invites WHERE email LIKE 'rls.%';
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 1 AND v_email = 'rls.a@example.test' THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 24 an owner reads only their own agency invites');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client_f, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.agent_invites;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 25 a client reads no invites');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client_c, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.agent_invites;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 26 an agent reads no invites');

  BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM count(*) FROM public.agent_invites;
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 27 an anonymous caller cannot read invites');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    INSERT INTO public.agent_invites (agency_id, email) VALUES (v_agency_a, 'direct@example.test');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 28 an owner cannot write invites directly');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_client_f, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    UPDATE public.profiles SET role = 'agent', agency_id = v_agency_a WHERE user_id = v_client_f;
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 29 a client still cannot promote themselves');

  RAISE EXCEPTION E'AGENT_INVITES_RESULTS\n%', array_to_string(v_res, E'\n');
END
$test$;
