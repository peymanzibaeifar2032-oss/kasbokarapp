/** Tattoo payment hold: lock starts after customer accepts, not when the artist proposes. */

export const TATTOO_HOLD_OPEN_STATUSES = ["awaiting_payment", "rejected"] as const;

const HOLD_IN = TATTOO_HOLD_OPEN_STATUSES.map((value) => `'${value}'`).join(",");

export function expireTattooHoldSql(opts: { customerScoped: boolean }) {
  const customer = opts.customerScoped ? " and customer_id = $1" : "";
  return {
    cancelBookings: `update bookings set status='cancelled'
      where id in (
        select booking_id from tattoo_requests
        where status='approved'
          and payment_status in (${HOLD_IN})
          and payment_hold_until is not null
          and payment_hold_until <= now()
          and booking_id is not null
          ${customer}
      ) and status='requested'`,
    expireRequests: `update tattoo_requests
      set payment_status='expired', booking_id=null, updated_at=now()
      where status='approved'
        and payment_status in (${HOLD_IN})
        and payment_hold_until is not null
        and payment_hold_until <= now()
        ${customer}`,
  };
}

export const TATTOO_OVERDUE_REVIEW_SQL = `select id, customer_id, business_id, booking_id, customer_name, payment_review_deadline
  from tattoo_requests
  where status='approved'
    and payment_status='receipt_submitted'
    and payment_review_deadline is not null
    and payment_review_deadline <= now()`;

export const TATTOO_SLOT_OVERLAP_SQL = `select id from bookings
  where status in ('requested','confirmed')
    and slot_end is not null and slot_start < $3 and slot_end > $2
    and (
      business_id = $1
      or business_id in (
        select b2.id from businesses b2
        join businesses b1 on b1.owner_id = b2.owner_id
        where b1.id = $1
      )
    )
  limit 1`;

export const TATTOO_PENDING_PROPOSAL_OVERLAP_SQL = `select id from tattoo_requests
  where business_id=$1 and id <> $4 and status='approved'
    and payment_status in ('proposal_pending','awaiting_payment','receipt_submitted','rejected')
    and proposed_slot_start is not null and proposed_slot_end is not null
    and proposed_slot_start < $3 and proposed_slot_end > $2
  limit 1`;
