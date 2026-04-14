
CREATE TABLE public.backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL,
  database_name text NOT NULL,
  app_name text NOT NULL DEFAULT 'unknown',
  file_name text,
  file_size bigint,
  storage_location text DEFAULT 'google_drive',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.restore_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_log_id uuid REFERENCES public.backup_logs(id),
  backup_file_name text NOT NULL,
  backup_type text NOT NULL,
  database_name text NOT NULL,
  app_name text NOT NULL DEFAULT 'unknown',
  initiated_by uuid,
  initiated_by_name text,
  status text NOT NULL DEFAULT 'pending',
  pre_restore_backup_taken boolean DEFAULT false,
  error_message text,
  logs text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage backup_logs"
  ON public.backup_logs FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can manage restore_logs"
  ON public.restore_logs FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
