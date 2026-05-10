import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://tggttbswenzkwpluxpaq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZ3R0YnN3ZW56a3dwbHV4cGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTQ3MzcsImV4cCI6MjA5Mzk3MDczN30.P6-0MkGlAeaUdjvxS2-sONeg7Q8SEhvanej42__9ziQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
