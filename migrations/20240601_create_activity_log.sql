-- Create activity_log table for tracking user actions
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    project_name TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own activity logs
CREATE POLICY activity_log_select_policy ON public.activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert activity logs for any user
CREATE POLICY activity_log_insert_policy ON public.activity_log
    FOR INSERT WITH CHECK (true);

-- Users can't update or delete activity logs
CREATE POLICY activity_log_update_policy ON public.activity_log
    FOR UPDATE USING (false);

CREATE POLICY activity_log_delete_policy ON public.activity_log
    FOR DELETE USING (false);

-- Create function to automatically track activity on projects
CREATE OR REPLACE FUNCTION public.handle_project_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.activity_log (user_id, action, project_id, project_name)
        VALUES (NEW.user_id, 'Project created', NEW.id, NEW.name);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log significant changes
        IF OLD.name != NEW.name OR OLD.status != NEW.status OR OLD.estimated_cost != NEW.estimated_cost THEN
            INSERT INTO public.activity_log (user_id, action, project_id, project_name, details)
            VALUES (
                NEW.user_id, 
                'Project updated', 
                NEW.id, 
                NEW.name,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'old_cost', OLD.estimated_cost,
                    'new_cost', NEW.estimated_cost
                )
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.activity_log (user_id, action, project_name)
        VALUES (OLD.user_id, 'Project deleted', OLD.name);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for project activity tracking
DROP TRIGGER IF EXISTS project_insert_activity ON public.projects;
CREATE TRIGGER project_insert_activity
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_project_activity();

DROP TRIGGER IF EXISTS project_update_activity ON public.projects;
CREATE TRIGGER project_update_activity
AFTER UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_project_activity();

DROP TRIGGER IF EXISTS project_delete_activity ON public.projects;
CREATE TRIGGER project_delete_activity
AFTER DELETE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_project_activity(); 