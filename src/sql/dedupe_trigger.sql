-- Trigger to prevent duplicate structures by name within the same project

-- Function to detect and handle duplicate structures
CREATE OR REPLACE FUNCTION prevent_duplicate_structures()
RETURNS TRIGGER AS $$
DECLARE
  existing_id TEXT;
BEGIN
  -- Check if a structure with the same name already exists in this project
  SELECT id INTO existing_id 
  FROM estimate_structures 
  WHERE project_id = NEW.project_id 
    AND name = NEW.name
    AND id != NEW.id
  LIMIT 1;
  
  -- If a duplicate exists
  IF existing_id IS NOT NULL THEN
    -- For updates, merge this structure with the existing one
    IF TG_OP = 'UPDATE' THEN
      -- Update elements to use the existing structure
      UPDATE estimate_elements
      SET structure_id = existing_id
      WHERE structure_id = NEW.id;
      
      -- Delete this structure (it will be replaced by the existing one)
      DELETE FROM estimate_structures WHERE id = NEW.id;
      
      -- Return NULL to prevent the original update
      RETURN NULL;
    END IF;
    
    -- For inserts, just use the existing structure ID
    IF TG_OP = 'INSERT' THEN
      -- Return NULL to prevent the insert (we're using the existing one)
      RETURN NULL;
    END IF;
  END IF;
  
  -- No duplicate found, proceed normally
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for structures
DROP TRIGGER IF EXISTS prevent_duplicate_structures_trigger ON estimate_structures;
CREATE TRIGGER prevent_duplicate_structures_trigger
BEFORE INSERT OR UPDATE ON estimate_structures
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_structures();

-- Function to detect and handle duplicate elements
CREATE OR REPLACE FUNCTION prevent_duplicate_elements()
RETURNS TRIGGER AS $$
DECLARE
  existing_id TEXT;
BEGIN
  -- Check if an element with the same name already exists in this structure
  SELECT id INTO existing_id 
  FROM estimate_elements 
  WHERE project_id = NEW.project_id 
    AND structure_id = NEW.structure_id
    AND name = NEW.name
    AND id != NEW.id
  LIMIT 1;
  
  -- If a duplicate exists
  IF existing_id IS NOT NULL THEN
    -- For updates, use the existing element
    IF TG_OP = 'UPDATE' THEN
      -- Delete this element (it's a duplicate)
      DELETE FROM estimate_elements WHERE id = NEW.id;
      
      -- Return NULL to prevent the original update
      RETURN NULL;
    END IF;
    
    -- For inserts, just use the existing element
    IF TG_OP = 'INSERT' THEN
      -- Return NULL to prevent the insert
      RETURN NULL;
    END IF;
  END IF;
  
  -- No duplicate found, proceed normally
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for elements
DROP TRIGGER IF EXISTS prevent_duplicate_elements_trigger ON estimate_elements;
CREATE TRIGGER prevent_duplicate_elements_trigger
BEFORE INSERT OR UPDATE ON estimate_elements
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_elements(); 