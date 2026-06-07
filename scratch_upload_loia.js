const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const filePath = path.join(__dirname, 'public', 'lindoaldo.jpg');
    const fileBuffer = fs.readFileSync(filePath);

    console.log("Uploading lindoaldo.jpg to avatars bucket...");
    const fileName = `lindoaldo_${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return;
    }

    console.log("File uploaded successfully:", uploadData);

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log("Public URL:", publicUrl);

    console.log("Finding Lóia profile...");
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'lindoaldo@legacy.local');

    if (profileError || !profiles || profiles.length === 0) {
      console.error("Could not find Lóia in profiles table.", profileError);
      return;
    }

    const id = profiles[0].id;
    console.log(`Updating profile ${id} with new photo URL...`);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ foto_perfil: publicUrl })
      .eq('id', id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
    } else {
      console.log("Success! Lóia's profile photo is now an absolute Supabase Storage URL.");
    }

  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

run();
