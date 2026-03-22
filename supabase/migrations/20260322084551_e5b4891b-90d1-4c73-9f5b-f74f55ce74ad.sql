
-- Create client_tags table
CREATE TABLE public.client_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
  time_estimate INTEGER NOT NULL DEFAULT 30,
  scheduled_date DATE,
  scheduled_start_time TIME,
  priority INTEGER DEFAULT 0,
  client_tag_id UUID REFERENCES public.client_tags(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create llm_config table (single row for settings)
CREATE TABLE public.llm_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  active_provider TEXT NOT NULL DEFAULT 'cloud' CHECK (active_provider IN ('cloud', 'local', 'lovable')),
  cloud_api_key TEXT DEFAULT '',
  cloud_api_endpoint TEXT DEFAULT 'https://api.openai.com/v1/chat/completions',
  cloud_model TEXT DEFAULT 'gpt-4',
  local_api_endpoint TEXT DEFAULT 'http://localhost:11434/v1/chat/completions',
  local_model TEXT DEFAULT 'llama3',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS needed (single superuser, no auth)
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_config ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anonymous users (single-user app, no auth)
CREATE POLICY "Allow all on client_tags" ON public.client_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on llm_config" ON public.llm_config FOR ALL USING (true) WITH CHECK (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_llm_config_updated_at BEFORE UPDATE ON public.llm_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default LLM config row
INSERT INTO public.llm_config (active_provider) VALUES ('lovable');

-- Create indexes
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX idx_tasks_client_tag_id ON public.tasks(client_tag_id);
