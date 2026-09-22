-- Extend wallet ledger entry types used by deposit, transfer, withdrawal and admin adjustments.
alter table public.ledger_entries
  drop constraint if exists ledger_entries_entry_type_check;

alter table public.ledger_entries
  add constraint ledger_entries_entry_type_check
  check (entry_type in (
    'deposit','withdrawal','trade','fee','reward','adjustment',
    'deposit_credit','internal_transfer','withdrawal_hold','withdrawal_release','withdrawal_sent',
    'admin_balance_adjustment'
  ));
