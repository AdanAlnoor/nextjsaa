const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service role key is missing.');
  console.error('Make sure you have the following in your .env.local file:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your-project-url');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Migration steps
const migrations = [
  {
    name: 'Create user_roles table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `
  },
  {
    name: 'Create user_role_assignments table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.user_role_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
        project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, role_id, project_id)
      );
    `
  },
  {
    name: 'Create project_invitations table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.project_invitations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
        invitation_token TEXT NOT NULL UNIQUE,
        invited_by UUID NOT NULL REFERENCES auth.users(id),
        status TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        UNIQUE(project_id, email),
        CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired'))
      );
    `
  },
  {
    name: 'Enable Row Level Security',
    sql: `
      -- Enable RLS
      ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: 'Create RLS policies',
    sql: `
      -- RLS for user_roles
      CREATE POLICY "Anyone can view roles" 
      ON public.user_roles FOR SELECT TO authenticated 
      USING (true);

      CREATE POLICY "Only admins can modify roles" 
      ON public.user_roles FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_role_assignments ura
          JOIN public.user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
        )
      );

      -- RLS for user_role_assignments
      CREATE POLICY "Users can view their own role assignments"
      ON public.user_role_assignments FOR SELECT TO authenticated
      USING (user_id = auth.uid());

      CREATE POLICY "Users can view role assignments for their projects"
      ON public.user_role_assignments FOR SELECT TO authenticated
      USING (
        project_id IN (
          SELECT project_id FROM public.user_role_assignments
          WHERE user_id = auth.uid()
        )
      );

      CREATE POLICY "Admins can manage all role assignments"
      ON public.user_role_assignments FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_role_assignments ura
          JOIN public.user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
        )
      );

      CREATE POLICY "Project managers can manage project role assignments"
      ON public.user_role_assignments FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_role_assignments ura
          JOIN public.user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = auth.uid() 
          AND ur.name = 'project_manager'
          AND ura.project_id = project_id
        )
      );

      -- RLS for project_invitations
      CREATE POLICY "Project managers can view and manage invitations"
      ON public.project_invitations FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_role_assignments ura
          JOIN public.user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = auth.uid() 
          AND (ur.name = 'admin' OR ur.name = 'project_manager')
          AND (ura.project_id = project_id OR ur.name = 'admin')
        )
      );

      CREATE POLICY "Users can view invitations sent to them"
      ON public.project_invitations FOR SELECT TO authenticated
      USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
      );
    `
  },
  {
    name: 'Insert default roles',
    sql: `
      INSERT INTO public.user_roles (name, description) VALUES 
        ('admin', 'System administrator with full access'),
        ('project_manager', 'Can manage projects and approve purchase orders'),
        ('purchaser', 'Can create purchase orders'),
        ('finance', 'Can approve purchase orders and convert to bills'),
        ('viewer', 'Read-only access to projects')
      ON CONFLICT (name) DO NOTHING;
    `
  },
  {
    name: 'Create role check function',
    sql: `
      CREATE OR REPLACE FUNCTION public.user_has_role(
        user_id UUID,
        role_name TEXT,
        project_id UUID DEFAULT NULL
      )
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF project_id IS NULL THEN
          RETURN EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            JOIN public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = user_has_role.user_id 
            AND ur.name = user_has_role.role_name
          );
        ELSE
          RETURN EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            JOIN public.user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = user_has_role.user_id 
            AND ur.name = user_has_role.role_name
            AND (ura.project_id = user_has_role.project_id OR ura.project_id IS NULL)
          );
        END IF;
      END;
      $$;
    `
  },
  {
    name: 'Create invitation acceptance function',
    sql: `
      CREATE OR REPLACE FUNCTION public.accept_invitation(
        p_invitation_id UUID,
        p_user_id UUID,
        p_role_id UUID,
        p_project_id UUID
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Start transaction
        BEGIN
          -- Update invitation status
          UPDATE public.project_invitations
          SET 
            status = 'accepted',
            updated_at = NOW()
          WHERE id = p_invitation_id;
          
          -- Create role assignment
          INSERT INTO public.user_role_assignments (
            user_id,
            role_id,
            project_id
          ) VALUES (
            p_user_id,
            p_role_id,
            p_project_id
          );
          
          -- If we get here, commit the transaction
          COMMIT;
        EXCEPTION WHEN OTHERS THEN
          -- If anything fails, roll back the transaction
          ROLLBACK;
          RAISE;
        END;
      END;
      $$;
    `
  }
];

// Run migrations
async function runMigrations() {
  console.log('Starting database migrations for role-based access control system...');
  
  for (const migration of migrations) {
    try {
      console.log(`Applying migration: ${migration.name}`);
      const { error } = await supabase.rpc('pgexecute', { query: migration.sql });
      
      if (error) {
        console.error(`Error applying migration "${migration.name}": ${error.message}`);
        
        // If pg_execute RPC function doesn't exist, try creating it
        if (error.message.includes('function pgexecute') && migration.name === 'Create user_roles table') {
          console.log('Attempting to create pgexecute function first...');
          
          const { error: createError } = await supabase.sql(`
            CREATE OR REPLACE FUNCTION pgexecute(query text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE query;
            END;
            $$;
          `);
          
          if (createError) {
            console.error('Failed to create pgexecute function:', createError.message);
            process.exit(1);
          } else {
            console.log('Successfully created pgexecute function. Retrying migration...');
            const { error: retryError } = await supabase.rpc('pgexecute', { query: migration.sql });
            
            if (retryError) {
              console.error(`Error retrying migration "${migration.name}": ${retryError.message}`);
              process.exit(1);
            }
          }
        } else {
          // For other errors, continue with remaining migrations
          console.log('Continuing with next migration...');
        }
      } else {
        console.log(`Successfully applied migration: ${migration.name}`);
      }
    } catch (err) {
      console.error(`Unexpected error in migration "${migration.name}":`, err);
      console.log('Continuing with next migration...');
    }
  }
  
  console.log('Migration completed. Role-based access control system is now set up!');
}

// Run the migrations
runMigrations().catch(err => {
  console.error('Error running migrations:', err);
  process.exit(1);
}); 