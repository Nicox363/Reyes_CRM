const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

// ⚠️ ATENCIÓN: Usa la SERVICE_ROLE_KEY para poder crear usuarios sin confirmar email
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ¡Añádela a tu .env.local!

if (!supabaseServiceKey) {
    console.error("❌ ERROR: Necesitas la SUPABASE_SERVICE_ROLE_KEY en tu .env.local para crear usuarios.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const team = [
    // LAS JEFAS (Admins)
    { email: 'reyes@delos.com', password: 'password123', name: 'Reyes Zoco', role: 'admin', color: '#FFADAD' },
    { email: 'pilar@delos.com', password: 'password123', name: 'Pilar', role: 'admin', color: '#FFD6A5' },

    // EL EQUIPO (Staff)
    { email: 'elvira@delos.com', password: 'password123', name: 'Elvira', role: 'staff', color: '#FDFFB6' },
    { email: 'yorka@delos.com', password: 'password123', name: 'Yorka', role: 'staff', color: '#CAFFBF' },
    { email: 'jmotezuma@delos.com', password: 'password123', name: 'J Motezuma', role: 'staff', color: '#9BF6FF' },
    { email: 'alejandra@delos.com', password: 'password123', name: 'Alejandra', role: 'staff', color: '#A0C4FF' },
    { email: 'yessica@delos.com', password: 'password123', name: 'Yessica', role: 'staff', color: '#BDB2FF' }
];

async function createTeam() {
    console.log("🚀 Creando equipo...");

    for (const member of team) {
        // 1. Crear Usuario en Auth (Login)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: member.email,
            password: member.password,
            email_confirm: true // Auto-confirmar para que entren directo
        });

        if (authError) {
            console.log(`⚠️ Usuario ${member.name} ya existe o error:`, authError.message);
            // Even if user exists, we might want to ensure their profile is correct.
            // But for now, we continue or we could fetch the user ID.
            // If user exists, we can't get the ID easily without signing in or admin list.
            // Let's assume for this script if they exist we skip RE-creation but maybe we should try to update profile?
            // Without ID we can't update profile easily unless we query 'profiles' by some other unique field if it exists, or listUsers.
            // For simplicity matching user request, we just continue.
        }

        // Capture ID if creation was successful
        let userId = authData?.user?.id;

        if (!userId && authError?.message?.includes("already registered")) {
            // Optional: Try to find user to update profile? 
            // For now, let's just log.
            console.log(`Skipping profile update for existing user: ${member.name}`);
            continue;
        }

        if (userId) {
            // 2. Actualizar su Perfil (Roles y Colores)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId, // Vinculación clave
                    name: member.name,
                    role: member.role,
                    color: member.color
                });

            if (profileError) {
                console.error(`❌ Error perfil ${member.name}:`, profileError.message);
            } else {
                console.log(`✅ Creada: ${member.name} (${member.role})`);
            }
        }
    }
}

createTeam();
