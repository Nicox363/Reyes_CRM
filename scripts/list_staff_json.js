const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fs = require('fs');

async function listStaff() {
    const { data, error } = await supabase.from('profiles').select('id, name, role');
    if (error) {
        console.error(JSON.stringify({ error }));
        return;
    }
    fs.writeFileSync('staff_list.json', JSON.stringify(data, null, 2));
}

listStaff();
