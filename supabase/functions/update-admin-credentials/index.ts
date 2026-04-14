import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const newEmail = "bditengineer@gmail.com";
  const newPassword = "KeyaIq11151000@#";

  // Find the super admin user by checking user_roles
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_admin");

  if (!roleData || roleData.length === 0) {
    return new Response(JSON.stringify({ error: "No super admin found" }), { status: 404 });
  }

  const userId = roleData[0].user_id;

  // Update auth user email and password
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    email: newEmail,
    password: newPassword,
    email_confirm: true,
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 500 });
  }

  // Update profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", userId);

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, message: "Super admin credentials updated" }));
});
