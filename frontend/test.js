import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://vbrzrzcrtxzqglmtlihp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicnpyemNydHh6cWdsbXRsaWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzczMDQsImV4cCI6MjA5MTA1MzMwNH0.EwHPWWIh5R7m5EUVjs352mAdC02sV1Nd3lzlWF7OnNw'
)

const testSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
        email: 'lol372929@gmail.com',
        password: 'srinu@4719'
    })

    console.log('USER:', data)
    console.log('ERROR:', error)
}

testSignup()