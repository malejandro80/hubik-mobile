DO $test$
DECLARE
  v_agency_a uuid := '00000000-0000-0000-0000-0000000000a1';
  v_agency_b uuid := '00000000-0000-0000-0000-0000000000b1';
  v_owner_a uuid := '00000000-0000-0000-0000-00000000aa01';
  v_owner_b uuid := '00000000-0000-0000-0000-00000000bb01';
  v_agent_e uuid := '00000000-0000-0000-0000-00000000ee01';
  v_ana uuid := '00000000-0000-0000-0000-00000000c001';
  v_anabel uuid := '00000000-0000-0000-0000-00000000c002';
  v_luis uuid := '00000000-0000-0000-0000-00000000c003';
  v_maria uuid := '00000000-0000-0000-0000-00000000c004';
  v_unconfirmed uuid := '00000000-0000-0000-0000-00000000c005';
  v_noname uuid := '00000000-0000-0000-0000-00000000c006';
  v_percent uuid := '00000000-0000-0000-0000-00000000c007';
  v_res text[] := ARRAY[]::text[];
  v_status text;
  v_state text;
  v_msg text;
  v_count int;
  v_role text;
  v_agency uuid;
  v_masked text;
  v_names text;
  v_i int;
  v_n int := 0;
BEGIN
  INSERT INTO public.agencies (id, name) VALUES (v_agency_a, 'Test Agency A'), (v_agency_b, 'Test Agency B');

  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES
    (v_owner_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.a@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"Owner Uno"}', now(), now(), now()),
    (v_owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.b@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"Owner Dos"}', now(), now(), now()),
    (v_agent_e, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agent.e@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"Elena Agente"}', now(), now(), now()),
    (v_ana, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana.garcia@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"Ana García"}', now(), now(), now()),
    (v_anabel, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anabel@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"Anabel Ruiz"}', now(), now(), now()),
    (v_luis, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'luis.perez@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"Luis Pérez"}', now(), now(), now()),
    (v_maria, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"María Ana Soto"}', now(), now(), now()),
    (v_unconfirmed, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana.sin@example.test', '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Sinconfirmar"}', NULL, now(), now()),
    (v_noname, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nobody@example.test', '{"provider":"google","providers":["google"]}', '{}', now(), now(), now()),
    (v_percent, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pct@example.test', '{"provider":"google","providers":["google"]}', '{"full_name":"Percent%Name"}', now(), now(), now());

  FOR v_i IN 1..7 LOOP
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (('00000000-0000-0000-0000-00000000d0' || lpad(v_i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'zeta' || v_i || '@example.test', '{"provider":"google","providers":["google"]}', json_build_object('full_name', 'Zeta ' || v_i)::jsonb, now(), now(), now());
  END LOOP;

  UPDATE public.profiles SET role = 'owner', agency_id = v_agency_a WHERE user_id = v_owner_a;
  UPDATE public.profiles SET role = 'owner', agency_id = v_agency_b WHERE user_id = v_owner_b;
  UPDATE public.profiles SET role = 'agent', agency_id = v_agency_b WHERE user_id = v_agent_e;

  SELECT count(*) INTO v_count FROM public.profiles WHERE role = 'client' AND user_id IN (v_ana, v_anabel, v_luis, v_maria, v_unconfirmed, v_noname, v_percent);
  v_res := v_res || (CASE WHEN v_count = 7 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 01 fixtures: seven clients exist');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*), string_agg(display_name, ',' ORDER BY display_name) INTO v_count, v_names FROM public.search_agent_candidates('ana');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 3 AND v_names = 'Ana García,Anabel Ruiz,María Ana Soto' THEN 'PASS' ELSE 'FAIL(' || v_count || ',' || coalesce(v_names, 'null') || ')' END || ' 02 "ana" matches name prefix and word prefix, not the unconfirmed user');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT masked_email INTO v_masked FROM public.search_agent_candidates('ana gar');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_masked = 'a***@example.test' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_masked, 'null') || ')' END || ' 03 the email is masked and case and spaces are ignored');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('  ANA GAR ') WHERE masked_email LIKE '%garcia%' OR masked_email LIKE '%ana.%';
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 04 no returned column carries the full email');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('nobody');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 05 the email prefix matches a user with no display name');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('soto');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 06 a later word of the name matches');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('an');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 07 fewer than 3 characters returns nothing');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM * FROM public.search_agent_candidates(repeat('a', 101));
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '22023' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 08 a query over 100 characters is rejected');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('%%%');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 09 percent signs are literal, never a wildcard');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('___');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 10 underscores are literal, never a wildcard');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('percent%');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 11 a literal percent inside the text still matches that name');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('elena');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 12 an agent never appears');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('owner');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 13 owners, including the caller, never appear');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('zeta');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 5 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 14 results are capped at five');

  v_state := 'no error';
  FOR v_i IN 1..25 LOOP
    v_n := v_i;
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_b, 'role', 'authenticated')::text, true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      PERFORM * FROM public.search_agent_candidates('luis');
    EXCEPTION WHEN OTHERS THEN
      v_state := SQLSTATE;
      v_msg := SQLERRM;
      EXECUTE 'RESET ROLE';
      EXIT;
    END;
    EXECUTE 'RESET ROLE';
  END LOOP;
  v_res := v_res || (CASE WHEN v_state = 'P0001' AND v_msg = 'rate_limited' AND v_n = 21 THEN 'PASS' ELSE 'FAIL(' || v_state || ',' || coalesce(v_msg, 'null') || ',' || v_n || ')' END || ' 15 the 21st search in a minute is rate limited');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('luis');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 16 another owner is not affected by that limit');

  UPDATE public.client_search_log SET searched_at = now() - interval '2 minutes' WHERE owner_id = v_owner_b;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_b, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_count FROM public.search_agent_candidates('luis');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 1 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 17 the limit clears once the searches are older than a minute');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM * FROM public.search_agent_candidates('luis');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 18 a client cannot search');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_agent_e, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM * FROM public.search_agent_candidates('luis');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 19 an agent cannot search');

  BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM * FROM public.search_agent_candidates('luis');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 20 an anonymous caller cannot search');

  BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM * FROM public.search_agent_candidates('luis');
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '28000' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 21 a token without a user cannot search');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM count(*) FROM public.client_search_log;
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 22 an owner cannot read the search log');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    INSERT INTO public.client_search_log (owner_id) VALUES (v_owner_a);
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 23 an owner cannot write the search log');

  SELECT count(*) INTO v_count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_search_log';
  v_res := v_res || (CASE WHEN v_count = 2 THEN 'PASS' ELSE 'FAIL(' || v_count || ')' END || ' 24 the search log stores no query text');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id(v_ana);
  EXECUTE 'RESET ROLE';
  SELECT role, agency_id INTO v_role, v_agency FROM public.profiles WHERE user_id = v_ana;
  v_res := v_res || (CASE WHEN v_status = 'agent_added' AND v_role = 'agent' AND v_agency = v_agency_a THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ',' || coalesce(v_role, 'null') || ')' END || ' 25 add by id promotes a client to an agent of the owner agency');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id(v_ana);
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_status = 'already_listed' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 26 adding the same person again is already_listed');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_b, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id(v_ana);
  EXECUTE 'RESET ROLE';
  SELECT agency_id INTO v_agency FROM public.profiles WHERE user_id = v_ana;
  v_res := v_res || (CASE WHEN v_status = 'unavailable' AND v_agency = v_agency_a THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 27 another agency cannot take an agent, and nothing changes');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id(v_unconfirmed);
  EXECUTE 'RESET ROLE';
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_unconfirmed;
  v_res := v_res || (CASE WHEN v_status = 'unavailable' AND v_role = 'client' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ',' || coalesce(v_role, 'null') || ')' END || ' 28 a client without a confirmed email is unavailable');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id(v_owner_b);
  EXECUTE 'RESET ROLE';
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_owner_b;
  v_res := v_res || (CASE WHEN v_status = 'unavailable' AND v_role = 'owner' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ',' || coalesce(v_role, 'null') || ')' END || ' 29 another owner cannot be turned into an agent');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id(v_agent_e);
  EXECUTE 'RESET ROLE';
  SELECT agency_id INTO v_agency FROM public.profiles WHERE user_id = v_agent_e;
  v_res := v_res || (CASE WHEN v_status = 'unavailable' AND v_agency = v_agency_b THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 30 an agent of another agency cannot be taken');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id('00000000-0000-0000-0000-00000000dead');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_status = 'unavailable' THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ')' END || ' 31 an unknown id is unavailable');

  INSERT INTO public.agent_invites (agency_id, email) VALUES (v_agency_a, 'luis.perez@example.test');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_status := public.add_agent_by_id(v_luis);
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO v_count FROM public.agent_invites WHERE email = 'luis.perez@example.test';
  v_res := v_res || (CASE WHEN v_status = 'agent_added' AND v_count = 0 THEN 'PASS' ELSE 'FAIL(' || coalesce(v_status, 'null') || ',' || v_count || ')' END || ' 32 a pending invite for that email is cleaned up');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_a, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*), string_agg(display_name, ',' ORDER BY display_name) INTO v_count, v_names FROM public.search_agent_candidates('ana');
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_count = 2 AND v_names = 'Anabel Ruiz,María Ana Soto' THEN 'PASS' ELSE 'FAIL(' || v_count || ',' || coalesce(v_names, 'null') || ')' END || ' 33 a promoted client no longer appears in search');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_maria, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.add_agent_by_id(v_anabel);
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_anabel;
  v_res := v_res || (CASE WHEN v_state = '42501' AND v_role = 'client' THEN 'PASS' ELSE 'FAIL(' || v_state || ',' || coalesce(v_role, 'null') || ')' END || ' 34 a client cannot add anyone by id');

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ana, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.add_agent_by_id(v_anabel);
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_anabel;
  v_res := v_res || (CASE WHEN v_state = '42501' AND v_role = 'client' THEN 'PASS' ELSE 'FAIL(' || v_state || ',' || coalesce(v_role, 'null') || ')' END || ' 35 an agent cannot add anyone by id');

  BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM public.add_agent_by_id(v_anabel);
    v_state := 'no error';
  EXCEPTION WHEN OTHERS THEN v_state := SQLSTATE;
  END;
  EXECUTE 'RESET ROLE';
  v_res := v_res || (CASE WHEN v_state = '42501' THEN 'PASS' ELSE 'FAIL(' || v_state || ')' END || ' 36 an anonymous caller cannot add anyone by id');

  RAISE EXCEPTION E'CLIENT_SEARCH_RESULTS\n%', array_to_string(v_res, E'\n');
END
$test$;
