-- Update AI thread anchor paths from UUID format to short code format
-- This is needed because URLs changed from /tasks/{uuid} to /tasks/{shortCode}

-- Update task anchors
UPDATE ai_threads
SET anchor_path = '/tasks/' || esc.short_code::text
FROM entity_short_codes esc
WHERE ai_threads.anchor_path LIKE '/tasks/%'
  AND esc.entity_type = 'task'
  AND esc.entity_id = SUBSTRING(ai_threads.anchor_path FROM '/tasks/(.+)')::uuid
  AND ai_threads.user_id = esc.user_id;

-- Update project anchors
UPDATE ai_threads
SET anchor_path = '/projects/' || esc.short_code::text
FROM entity_short_codes esc
WHERE ai_threads.anchor_path LIKE '/projects/%'
  AND esc.entity_type = 'project'
  AND esc.entity_id = SUBSTRING(ai_threads.anchor_path FROM '/projects/(.+)')::uuid
  AND ai_threads.user_id = esc.user_id;

-- Update goal anchors
UPDATE ai_threads
SET anchor_path = '/goals/' || esc.short_code::text
FROM entity_short_codes esc
WHERE ai_threads.anchor_path LIKE '/goals/%'
  AND esc.entity_type = 'goal'
  AND esc.entity_id = SUBSTRING(ai_threads.anchor_path FROM '/goals/(.+)')::uuid
  AND ai_threads.user_id = esc.user_id;

-- Update journal anchors
UPDATE ai_threads
SET anchor_path = '/journal/' || esc.short_code::text
FROM entity_short_codes esc
WHERE ai_threads.anchor_path LIKE '/journal/%'
  AND esc.entity_type = 'journal'
  AND esc.entity_id = SUBSTRING(ai_threads.anchor_path FROM '/journal/(.+)')::uuid
  AND ai_threads.user_id = esc.user_id;
