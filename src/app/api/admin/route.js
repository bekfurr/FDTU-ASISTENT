import fs from 'fs'
import path from 'path'

export async function POST(req) {
  try {
    const { geminiApiKey } = await req.json()
    
    // For local demo purposes, we will write it to process.env.
    // In production with Supabase, this should be stored securely in the database.
    process.env.GEMINI_API_KEY = geminiApiKey;

    // Optional: Write to .env.local to persist across restarts in local dev
    try {
      const envPath = path.join(process.cwd(), '.env.local')
      let envContent = ''
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8')
      }
      
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${geminiApiKey}`)
      } else {
        envContent += `\nGEMINI_API_KEY=${geminiApiKey}\n`
      }
      fs.writeFileSync(envPath, envContent.trim() + '\n')
    } catch (e) {
      console.log('Could not write to .env.local', e)
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
