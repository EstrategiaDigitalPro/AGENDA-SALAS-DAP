# Security Specification — Agenda de Salas

## 1. Data Invariants
1. **Single-Admin Write Authority**: Only the verified administrator (`corcomunicaciones@gmail.com` with `email_verified == true`, or an explicit UID entry in `/admins/{uid}`) may create, update, or delete meetings in `/meetings/{meetingId}`.
2. **Valid Room Constraint**: Every meeting must belong strictly to one of the three rooms (`sala-piso-8-dap`, `sala-a-opt`, `sala-b-opt`).
3. **Time Grid Integrity**: Every meeting must be scheduled in 30-minute increments between `07:00` (`420` minutes) and `19:00` (`1140` minutes), with `endMinutes > startMinutes`.
4. **No PII Exposure**: Publicly readable `/meetings` documents must never store emails, phone numbers, or other personal contact PII.
5. **Immutable Audit Fields & Server Timestamps**: `createdBy` and `createdAt` cannot be changed after creation; `createdAt` and `updatedAt` must equal `request.time`.
6. **Admin Collection Lockdown**: Clients cannot write to `/admins/{adminId}` to escalate privileges.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Create**: Anonymous/unauthenticated user attempts to create a meeting in `/meetings/m1`.
2. **Non-Admin Authenticated Create**: Signed-in user with `other@example.com` (`email_verified: true`) attempts to create a meeting.
3. **Unverified Admin Email Spoof**: Signed-in user claiming `corcomunicaciones@gmail.com` with `email_verified: false` attempts to create a meeting.
4. **Ghost Field / Shadow Update**: Admin attempts to create or update a meeting with an extra undeclared field (`isApproved: true`).
5. **Invalid Room ID**: Admin attempts to create a meeting with `roomId: "sala-c-vip"`.
6. **Out-of-Hours Time Slot**: Admin attempts to create a meeting with `startMinutes: 360` (6:00 AM) or `endMinutes: 1200` (8:00 PM).
7. **Non-30-Minute Increment**: Admin attempts to create a meeting with `startMinutes: 435` (07:15 AM).
8. **Inverted Time Range**: Admin attempts to create a meeting where `endMinutes <= startMinutes`.
9. **Identity Spoofing on Create**: Admin creates a meeting setting `createdBy` to someone else's UID.
10. **Immutable Field Tampering on Update**: Admin attempts to modify `createdBy` or `createdAt` during an update.
11. **Client-Forged Timestamp**: Admin supplies a manual past/future timestamp instead of `request.time` for `createdAt` or `updatedAt`.
12. **Privilege Escalation on `/admins`**: Non-admin user attempts to write `/admins/{theirUid}` with `{ role: "admin" }`, or list `/admins`.
