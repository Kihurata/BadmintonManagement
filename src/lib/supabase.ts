import { createClient } from '@/utils/supabase/client'

// Export a singleton instance strictly for client-side usage
// This correctly reads the NextJS Auth cookies set by Server Actions
export const supabase = createClient()
