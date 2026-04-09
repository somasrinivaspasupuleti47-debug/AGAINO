const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://vbrzrzcrtxzqglmtlihp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicnpyemNydHh6cWdsbXRsaWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzczMDQsImV4cCI6MjA5MTA1MzMwNH0.EwHPWWIh5R7m5EUVjs352mAdC02sV1Nd3lzlWF7OnNw"
);

async function check() {
   const { data, error } = await supabase.from('users').select('*').eq('email', 'somasrinivaspasupuleti47@gmail.com');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
check();
