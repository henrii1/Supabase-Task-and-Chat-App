# Step 1: Database Schema & Supabase Configuration

## Overview
This step sets up the database schema, security policies, and testing infrastructure for our Task & Chat app.

## Implementation Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key
4. Wait for complete provisioning (usually 1-2 minutes)

### 2. Configure Environment
1. Create `.env` file in project root:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
2. Restart your development server if it's running

### 3. Database Schema Implementation
Execute these steps in order in your Supabase SQL Editor:

#### A. Create Tables
```sql
-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  oauth_provider TEXT,
  oauth_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Team members junction table
CREATE TABLE public.team_members (
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo','in_progress','done')),
  assignee_id UUID REFERENCES public.users(id),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### B. Enable Row Level Security
```sql
-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
```

#### C. Implement Security Policies
```sql
-- TASKS ------------------------------------------------------------------
-- 1. Insert: Creator or assignee can create
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = created_by OR auth.uid() = assignee_id);

-- 2. Select: Creator or assignee can view
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT
  USING (auth.uid() = created_by OR auth.uid() = assignee_id);

-- 3. Update/Delete: Creator or assignee can modify
CREATE POLICY tasks_mutate ON public.tasks
  FOR UPDATE, DELETE
  USING (auth.uid() = created_by OR auth.uid() = assignee_id)
  WITH CHECK (auth.uid() = created_by OR auth.uid() = assignee_id);

-- TEAMS ------------------------------------------------------------------
-- 1. Insert: Any authenticated user can create
CREATE POLICY teams_insert ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Select: Creator or team member can view
CREATE POLICY teams_select ON public.teams
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

-- 3. Update: Team admins can modify
CREATE POLICY teams_update ON public.teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id 
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- 4. Delete: Team admins can remove
CREATE POLICY teams_delete ON public.teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id 
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- TEAM MEMBERS -----------------------------------------------------------
-- Simple policy: users can only see/modify their own memberships
CREATE POLICY team_members_access ON public.team_members
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MESSAGES --------------------------------------------------------------
-- 1. Insert: User can create their own messages
CREATE POLICY messages_insert ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Select: Team members can view messages
CREATE POLICY messages_select ON public.messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = messages.team_id AND tm.user_id = auth.uid()
    )
  );

-- 3. Update/Delete: Only message creator can modify
CREATE POLICY messages_mutate ON public.messages
  FOR UPDATE, DELETE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### D. Create Performance Indexes
```sql
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_messages_team_id ON public.messages(team_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
```

### 4. Verify Setup
1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:5173`
3. Click "Run Basic Tests" - should show:
   - ✅ Database connection successful
   - ✅ Auth system working
   - ✅ Realtime connection established
4. Click "Run Integration Tests" - should show:
   - ✅ User operations successful
   - ✅ Team operations successful
   - ✅ Task operations successful
   - ✅ Message operations successful
   - ✅ Realtime operations successful

### 5. Troubleshooting Common Issues

#### Test User Creation Fails
- Error: "User already registered"
- Solution: Normal during re-runs, test will auto-switch to sign-in

#### RLS Policy Violations
- Error: "new row violates row-level security policy"
- Solutions:
  1. Ensure all SQL commands ran successfully
  2. Check `auth.uid()` is not null (sign in required)
  3. Verify user exists in `public.users` table
  4. For teams: Create team first, then add membership
  5. For tasks/messages: Ensure user is team member first

#### Realtime Issues
- Error: "Connection closing"
- Solutions:
  1. Enable realtime in Supabase dashboard
  2. Increase connection timeout in tests
  3. Check browser console for detailed errors

## Files Created
- `src/lib/database-schema.sql` - Complete schema above
- `src/lib/types.ts` - TypeScript definitions
- `src/lib/database-test.ts` - Basic connectivity tests
- `src/lib/database-integration-test.ts` - Full integration tests
- `src/components/DatabaseTest.tsx` - Test UI
- `src/supabase.ts` - Client configuration

## Next Steps
Once all tests pass:
1. Commit changes
2. Push to main branch
3. Create new develop branch
4. Proceed to Step 2: Project Structure & Core Types 