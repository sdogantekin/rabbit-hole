import { createServiceRoleClient, createUserScopedClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req: Request) => {
  try {
    const supabase = createUserScopedClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Clean up Storage first — deleting the auth user below cascades every DB row via
    // existing FK constraints (profiles -> user_interests/swipes/saved_articles/
    // quiz_sessions/quiz_questions/shared_quizzes/quiz_plays are all `on delete cascade`),
    // but Storage objects aren't tied to that cascade, so an orphaned avatar file would
    // otherwise be left behind forever.
    const { data: avatarFiles } = await serviceClient.storage.from('avatars').list(user.id);
    if (avatarFiles && avatarFiles.length > 0) {
      await serviceClient.storage.from('avatars').remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
    }

    // Admin API requires the service-role client — never derive the user id from anything
    // but this request's own authenticated session above.
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
