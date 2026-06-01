import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wkykcbahqglgeljyndli.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWtjYmFocWdsZ2VsanluZGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDgxNTIsImV4cCI6MjA3NjcyNDE1Mn0.QA_TUgqyVas9Xe8JJhn6SdeAPeQt0m-Lk2ybjQ7EtoE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
