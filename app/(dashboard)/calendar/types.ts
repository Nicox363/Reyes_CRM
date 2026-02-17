export type Cabin = {
    id: string;
    name: string;
}

export type Appointment = {
    id: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'paid' | 'no_show';
    cabin_id: string;
    staff_id: string;
    client_id: string;
    notes?: string;
    profiles?: {
        name: string;
        color: string;
    };
    clients?: {
        full_name: string;
        phone: string;
        is_conflictive?: boolean;
        notes?: string;
    };
    services?: {
        name: string;
        price: number;
    };
}
