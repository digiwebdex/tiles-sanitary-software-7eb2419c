import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const newEmail = "bditengineer@gmail.com";
  const newPassword = "KeyaIq11151000@#";

  // List all users to find the one with this email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    return new Response(JSON.stringify({ error: "List users failed: " + listError.message }), { status: 500 });
  }

  const existingUser = users.find(u => u.email === newEmail);

  if (existingUser) {
    // User with this email already exists - update password and ensure super_admin role
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: newPassword,
      email_confirm: true,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: "Update password failed: " + updateError.message }), { status: 500 });
    }

    // Ensure profile exists
    await supabase.from("profiles").upsert({
      id: existingUser.id,
      name: "Super Admin",
      email: newEmail,
    });

    // Ensure super_admin role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", existingUser.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!existingRole) {
      await supabase.from("user_roles").insert({
        user_id: existingUser.id,
        role: "super_admin",
      });
    }

    // Remove old super_admin roles for other users
    const { data: otherRoles } = await supabase
      .from("user_roles")
      .select("id, user_id")
      .eq("role", "super_admin")
      .neq("user_id", existingUser.id);

    if (otherRoles && otherRoles.length > 0) {
      for (const r of otherRoles) {
        await supabase.from("user_roles").delete().eq("id", r.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Super admin updated - existing user with this email found and configured",
      userId: existingUser.id 
    }));
  }

  return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
});
