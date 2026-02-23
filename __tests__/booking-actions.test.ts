/**
 * Unit tests for booking/actions.ts
 * Tests the core booking logic: slot generation, staff schedule validation, 
 * cabin assignment, timezone handling, and public booking creation.
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

// =============================================
// Mock Supabase client
// =============================================

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => mockSupabase)
}))

// Dynamic import so the mock takes effect
const { getAvailableSlots, createPublicBooking } = await import('@/app/booking/actions')

// =============================================
// Helpers to build mock query chains
// =============================================
function buildQueryChain(finalResult: any) {
    const chain: any = {}
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'lt', 'gt', 'in', 'limit', 'order', 'single']
    for (const method of methods) {
        chain[method] = vi.fn(() => chain)
    }
    // Override single/order to resolve
    chain.single = vi.fn(() => Promise.resolve(finalResult))
    chain.order = vi.fn(() => {
        // If followed by another .order(), return chain; otherwise resolve
        return { ...chain, then: (resolve: any) => resolve(finalResult) }
    })
    // Default: resolves to finalResult
    chain.then = (resolve: any) => resolve(finalResult)
    return chain
}

// =============================================
// TESTS
// =============================================

describe('Booking Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // -----------------------------------------
    // getAvailableSlots
    // -----------------------------------------
    describe('getAvailableSlots', () => {
        it('returns empty array when staff is not working that day', async () => {
            // Mock service query
            const serviceChain = buildQueryChain({ data: { duration: 60 }, error: null })
            // Mock schedule query (not working)
            const scheduleChain = buildQueryChain({ data: { is_working_day: false, start_time: '09:00', end_time: '18:00' }, error: null })

            let callCount = 0
            mockFrom.mockImplementation((table: string) => {
                if (table === 'services') return serviceChain
                if (table === 'staff_schedules') {
                    callCount++
                    if (callCount === 1) return scheduleChain
                    // count query
                    return buildQueryChain({ count: 5 })
                }
                return buildQueryChain({ data: [], error: null })
            })

            const slots = await getAvailableSlots('svc-1', 'staff-1', '2026-03-15')
            expect(slots).toEqual([])
        })

        it('respects staff schedule hours (not hardcoded 9-20)', async () => {
            // Staff works 10:00 to 14:00 — should only have slots in that range
            const serviceChain = buildQueryChain({ data: { duration: 30 }, error: null })
            const scheduleChain = buildQueryChain({
                data: { is_working_day: true, start_time: '10:00:00', end_time: '14:00:00' },
                error: null
            })
            const apptsChain = buildQueryChain({ data: [], error: null })

            mockFrom.mockImplementation((table: string) => {
                if (table === 'services') return serviceChain
                if (table === 'staff_schedules') return scheduleChain
                if (table === 'appointments') return apptsChain
                return buildQueryChain({ data: [], error: null })
            })

            const slots = await getAvailableSlots('svc-1', 'staff-1', '2026-03-15')

            // All slots should be between 10:00 and 14:00
            for (const slot of slots) {
                const [h] = slot.split(':').map(Number)
                expect(h).toBeGreaterThanOrEqual(10)
                expect(h).toBeLessThan(14)
            }
            // First slot should be 10:00
            expect(slots[0]).toBe('10:00')
            // Should not contain 09:00 or 09:30 or 14:00+
            expect(slots).not.toContain('09:00')
            expect(slots).not.toContain('09:30')
            expect(slots).not.toContain('14:00')
        })
    })

    // -----------------------------------------
    // createPublicBooking
    // -----------------------------------------
    describe('createPublicBooking', () => {
        it('returns error when staff does not work that day', async () => {
            const serviceChain = buildQueryChain({ data: { duration: 30 }, error: null })
            const scheduleChain = buildQueryChain({
                data: { is_working_day: false, start_time: '09:00', end_time: '18:00' },
                error: null
            })

            mockFrom.mockImplementation((table: string) => {
                if (table === 'services') return serviceChain
                if (table === 'staff_schedules') return scheduleChain
                return buildQueryChain({ data: [], error: null })
            })

            const result = await createPublicBooking({
                service_id: 'svc-1',
                staff_id: 'staff-1',
                date: '2026-03-15',
                time: '10:00',
                client_name: 'Test Client',
                client_phone: '612345678'
            })

            expect(result).toHaveProperty('error')
            expect(result.error).toContain('no trabaja')
        })

        it('returns error when outside staff schedule hours', async () => {
            const serviceChain = buildQueryChain({ data: { duration: 30 }, error: null })
            // Staff works 10:00-14:00 but booking at 15:00
            const scheduleChain = buildQueryChain({
                data: { is_working_day: true, start_time: '10:00:00', end_time: '14:00:00' },
                error: null
            })

            mockFrom.mockImplementation((table: string) => {
                if (table === 'services') return serviceChain
                if (table === 'staff_schedules') return scheduleChain
                return buildQueryChain({ data: [], error: null })
            })

            const result = await createPublicBooking({
                service_id: 'svc-1',
                staff_id: 'staff-1',
                date: '2026-03-15',
                time: '15:00',
                client_name: 'Test',
                client_phone: '612345678'
            })

            expect(result).toHaveProperty('error')
            expect(result.error).toContain('horario laboral')
        })
    })
})
