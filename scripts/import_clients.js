const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) { console.error("❌ Key missing"); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function importClients() {
    const rawPath = path.resolve(__dirname, 'raw_clients.txt');
    if (!fs.existsSync(rawPath)) {
        console.error("❌ File not found:", rawPath);
        return;
    }

    const text = fs.readFileSync(rawPath, 'utf8');
    // Regex strategy:
    // Look for patterns that resemble: Name + Phone (+ Email optional)
    // Matches lines like: "Nombre Apellido +34 666 66 66 66"
    // Limitations: Messy text usually has newlines breaking rows.

    // We'll normalize newlines and try to split by ' +34' or phone patterns to identify records.

    const lines = text.split('\n');
    let clients = [];

    // Simple parser loop
    // We assume a record *ends* or *contains* a phone number.
    // We'll walk through, grabbing names before the phone, and emails after?

    // Better strategy: The text seems to be roughly 1 record per paragraph or line group.
    // "Aaron Tendero +34 623 04 40 01 1"

    // Let's try to extract ALL matches of:
    // (Name Part) (+34 .... or similar) (Email Part optional)

    // Regex for Phone: (\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})
    // But specific to this file: \+34 \d{3} \d{2} \d{2} \d{2}  OR  \+34 \d{9}

    const phoneRegex = /(\+\d{2,4}[\s\d-]{9,15})/g;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;

    // We will iterate match by match.
    // 1. Find a phone number.
    // 2. The text BEFORE it (up to previous match) is the Name (roughly).
    // 3. The text AFTER it (up to newline or space) might be Email.

    let match;
    let lastIndex = 0;

    // Pre-clean text to single line? No, names might be multiline?
    // Let's clean up "hace X días" garbage first.
    const cleanText = text.replace(/hace \d+[\r\n\s]*días/g, " ")
        .replace(/\d{2}\/\d{2}\/\d{4}/g, " ") // Dates
        .replace(/(\r\n|\n|\r)/g, " "); // Flatten

    // Now execute regex loop on flat text
    while ((match = phoneRegex.exec(cleanText)) !== null) {
        const phone = match[0].trim();
        const index = match.index;

        // Name is roughly the text before the phone, but we need to stop at the previous record's end (email or whatever)
        // Let's grab 50 chars before? Or looks for keywords?
        // In the format "Abril Obregon +34...", the name is immediately before.
        // We need to cut off at the *previous* match's end.

        let startOfName = lastIndex;
        // Trim garbage from startOfName
        let rawNameSection = cleanText.substring(startOfName, index);

        // Clean rawName: remove digits (like "1 " from previous record's visit count)
        // This is heuristic.
        let name = rawNameSection
            .replace(/\d+/g, "") // Remove numbers (visit counts)
            .replace(/Buscar\.\.\./g, "")
            .replace(/Clientes de Treatwell.*/g, "")
            .replace(/https:\/\/.*/g, "")
            .trim();

        // If name is empty, skip
        if (name.length < 2) continue;

        // Look for email in the *next* chunk (before next phone)
        // We'll search in a window after the phone.
        let email = null;
        const stringAfter = cleanText.substring(index + phone.length, index + phone.length + 100);
        const emailMatch = stringAfter.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        if (emailMatch) {
            email = emailMatch[0];
        }

        clients.push({
            full_name: name,
            phone: phone,
            email: email
        });

        // Move lastIndex past this record
        // If we found email, move past it. Else past phone.
        if (emailMatch) {
            lastIndex = index + phone.length + emailMatch.index + emailMatch[0].length;
        } else {
            lastIndex = index + phone.length;
        }
    }

    console.log(`Found ${clients.length} potential clients.`);

    // Insert into DB
    let inserted = 0;
    for (const c of clients) {
        // Basic dedup check by phone
        const { data } = await supabase.from('clients').select('id').eq('phone', c.phone).single();
        if (!data) {
            const { error } = await supabase.from('clients').insert(c);
            if (!error) inserted++;
            else console.error("Error inserting:", c.full_name, error.message);
        }
    }

    console.log(`✅ Successfully inserted ${inserted} new clients.`);
}

importClients();
