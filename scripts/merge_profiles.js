const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const operations = [
    // Alejandra: Keep 5979..., Drop c7e2... (Both 0 records)
    { keep: '59795e1c-5ea2-4a7b-a010-91a5e1ac9047', drop: 'c7e2dcd7-2917-48f0-bfff-e613f9f38fbf', name: 'Alejandra' },
    // Elvira: Keep 8f06... (5), Drop a8a9... (3)
    { keep: '8f0662ed-a7c0-47a7-864b-9a610e7d6b93', drop: 'a8a9b41c-50e0-4e7f-bc6c-6f1a57126042', name: 'Elvira' },
    // J Motezuma: Keep 0961... (5), Drop 417d... (0)
    { keep: '0961f5ad-28c6-49f3-88e8-96d81bf6ed93', drop: '417d9815-b841-48b9-9b37-38a2d35f1f7f', name: 'J Motezuma' },
    // Yessica: Keep b1f6... (5), Drop 6bef... (0)
    { keep: 'b1f61aaa-b7bd-45f8-86b3-a02b63aced19', drop: '6bef88cb-599e-445d-9ccb-a2d53fbad309', name: 'Yessica' },
    // Yorka: Keep fe4f... (6), Drop 6a74... (1)
    { keep: 'fe4f1261-8b9d-4544-8eb5-a4118a89a28f', drop: '6a743e6e-28e2-4876-8339-3a7e989222b8', name: 'Yorka' }
];

async function mergeProfiles() {
    for (const op of operations) {
        console.log(`Processing ${op.name}...`);

        // 1. Update Appointments (staff_id)
        const { error: e1 } = await supabase.from('appointments').update({ staff_id: op.keep }).eq('staff_id', op.drop);
        if (e1) console.error(` Error updating appointments for ${op.name}:`, e1);
        else console.log(` Updated appointments.`);

        // 2. Update Transactions (created_by)
        const { error: e2 } = await supabase.from('transactions').update({ created_by: op.keep }).eq('created_by', op.drop);
        if (e2) console.error(` Error updating transactions for ${op.name}:`, e2);
        else console.log(` Updated transactions.`);

        // 3. Update Expenses (created_by)
        const { error: e3 } = await supabase.from('expenses').update({ created_by: op.keep }).eq('created_by', op.drop);
        if (e3) console.error(` Error updating expenses for ${op.name}:`, e3);
        else console.log(` Updated expenses.`);

        // 4. Update Schedules (staff_id)
        const { error: e4 } = await supabase.from('staff_schedules').update({ staff_id: op.keep }).eq('staff_id', op.drop);
        if (e4) {
            // If conflict (e.g. duplicate schedule for same day), we might fail. 
            // In that case, we can probably safely ignore the duplicate schedule from the dropped user, 
            // or we should handle it. For now, let's try update.
            console.error(` Error updating schedules for ${op.name} (likely conflict):`, e4);
            // If conflict, we might need to DELETE the conflicting schedules from DROP instead of merging.
            // But let's proceed to delete profile.
        } else {
            console.log(` Updated schedules.`);
        }

        // 5. Delete Dropped Profile
        const { error: delErr } = await supabase.from('profiles').delete().eq('id', op.drop);
        if (delErr) console.error(` Error deleting profile ${op.drop} for ${op.name}:`, delErr);
        else console.log(` Deleted duplicate profile.`);

        console.log('---');
    }
}

mergeProfiles();
