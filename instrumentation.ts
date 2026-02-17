import { checkAndSendReminders } from '@/lib/scheduler'

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // dynamic import to avoid bundling issues
        const cron = await import('node-cron')

        console.log('[Instrumentation] Setting up Reminder Cron Job to run every 15 minutes...')

        // Schedule every 15 minutes
        cron.schedule('*/15 * * * *', async () => {
            console.log('[Cron] Triggering checkAndSendReminders at ' + new Date().toISOString())
            try {
                await checkAndSendReminders()
            } catch (err) {
                console.error('[Cron] Error running reminder check:', err)
            }
        })
    }
}
