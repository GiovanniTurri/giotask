

## AI-Powered Task Manager with Calendar & Smart Scheduling

### Overview
A single-user task management app with calendar views and LLM-powered intelligent scheduling. Built with React frontend and Lovable Cloud (Supabase) backend.

### Phase 1: Core Task Management
- **Task CRUD**: Create, edit, delete tasks with title, description, time estimate (in minutes), and client tags
- **Client Tags**: Manageable tag system with create/edit/delete, color-coded badges
- **Task List View**: Filterable by client tag, sortable by date/priority/estimate, with status tracking (todo/in-progress/done)
- **Database**: Supabase tables for `tasks`, `client_tags`, and `llm_config`

### Phase 2: Calendar Integration
- **Calendar View**: Month/week/day views using a React calendar library
- **Task Visualization**: Tasks displayed as blocks sized proportionally to their time estimates, color-coded by client tag
- **Drag & Drop**: Reschedule tasks by dragging them on the calendar
- **Navigation**: Easy switching between day/week/month views

### Phase 3: LLM-Powered Smart Scheduling
- **LLM Settings Page**: Configure two LLM endpoints (cloud API + local endpoint), with API key fields and a toggle to select active provider
- **Intelligent Prioritization**: Edge function that sends task data to the selected LLM and returns suggested ordering based on urgency, dependencies, and context
- **Fragmented Scheduling**: LLM can split large tasks into smaller time blocks across multiple days
- **"Reschedule All" Button**: One-click AI-powered calendar reorganization with preview before applying

### Phase 4: UI & Polish
- Clean, minimal single-user dashboard with sidebar navigation (Tasks, Calendar, Settings)
- Toast notifications for actions
- Responsive layout

### Architecture Notes
- No auth needed (single superuser)
- Lovable Cloud for database + edge functions
- Edge function proxies LLM calls (supports OpenAI-compatible API format, works with both cloud and local LLMs like Ollama)
- Lovable AI available as a fallback LLM option via the built-in gateway

