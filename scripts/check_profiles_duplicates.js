const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

    if (error) {
        console.error(error);
    } else {
        console.log('Profiles:', JSON.stringify(data, null, 2));
    }
}

listProfiles();
