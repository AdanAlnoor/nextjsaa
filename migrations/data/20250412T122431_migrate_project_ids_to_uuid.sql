-- Migrated from: migrate_project_ids_to_uuid.sql (root directory)
-- Created: 2025-04-12T12:24:31.705Z

-- Migration script to convert project IDs from text format to UUID
-- This script performs a safe migration with temporary columns and careful updates

-- Step 1: Add a new UUID column to the projects table
ALTER TABLE public.projects ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();

-- Step 2: Add temporary UUID columns to all tables that reference project_id
ALTER TABLE public.purchase_orders ADD COLUMN temp_project_uuid UUID;
ALTER TABLE public.cost_control_items ADD COLUMN temp_project_uuid UUID;
-- Add similar columns to any other tables that reference project_id

-- Step 3: Create a mapping table to store the relationship between text IDs and UUIDs
CREATE TABLE public.project_id_mapping (
    text_id TEXT PRIMARY KEY,
    uuid_id UUID NOT NULL UNIQUE
);

-- Step 4: Populate the mapping table with current project IDs and their new UUIDs
INSERT INTO public.project_id_mapping (text_id, uuid_id)
SELECT id, uuid_id FROM public.projects;

-- Step 5: Update the temporary UUID columns in referencing tables
UPDATE public.purchase_orders po
SET temp_project_uuid = pm.uuid_id
FROM public.project_id_mapping pm
WHERE po.project_id = pm.text_id;

UPDATE public.cost_control_items cci
SET temp_project_uuid = pm.uuid_id
FROM public.project_id_mapping pm
WHERE cci.project_id = pm.text_id;

-- Step 6: Create backup of the projects table before making changes
CREATE TABLE public.projects_backup AS SELECT * FROM public.projects;

-- Step 7: Modify the projects table to use UUID as primary key
-- First, drop constraints that reference the projects table
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_project_id_fkey;
ALTER TABLE public.cost_control_items DROP CONSTRAINT IF EXISTS cost_control_items_project_id_fkey;
-- Drop any other foreign key constraints referencing projects.id

-- Step 8: Rename columns and update primary key
-- This is the critical step - we'll do this in a transaction
BEGIN;

-- Create a new projects table with UUID primary key
CREATE TABLE public.projects_new (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    project_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    -- Include all other columns from the projects table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client TEXT,
    -- Add any other columns from your projects table
    text_id TEXT UNIQUE -- Keep the old ID for reference
);

-- Copy data to the new table
INSERT INTO public.projects_new (id, name, project_number, status, created_at, updated_at, client, text_id)
SELECT uuid_id, name, project_number, status, created_at, updated_at, client, id
FROM public.projects;

-- Swap tables
ALTER TABLE public.projects RENAME TO projects_old;
ALTER TABLE public.projects_new RENAME TO projects;

-- Update referencing tables to use the new UUID
ALTER TABLE public.purchase_orders 
    ALTER COLUMN project_id TYPE UUID USING temp_project_uuid,
    DROP COLUMN temp_project_uuid;

ALTER TABLE public.cost_control_items 
    ALTER COLUMN project_id TYPE UUID USING temp_project_uuid,
    DROP COLUMN temp_project_uuid;

-- Re-establish foreign key constraints
ALTER TABLE public.purchase_orders 
    ADD CONSTRAINT purchase_orders_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.cost_control_items 
    ADD CONSTRAINT cost_control_items_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

COMMIT;

-- Step 9: Create a view for backward compatibility (optional)
CREATE OR REPLACE VIEW public.projects_with_text_id AS
SELECT p.id, p.text_id, p.name, p.project_number, p.status, p.created_at, p.updated_at, p.client
FROM public.projects p;

-- Step 10: Update indexes
CREATE INDEX IF NOT EXISTS purchase_orders_project_id_idx ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS cost_control_items_project_id_idx ON public.cost_control_items(project_id);

-- Step 11: Clean up (only after verifying everything works)
-- DROP TABLE public.projects_old;
-- DROP TABLE public.project_id_mapping;

-- Note: Keep the text_id column in the projects table for backward compatibility
-- You can remove it later when all code has been updated 