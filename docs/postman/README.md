# Postman Demo Flow

## Files
- `docs/postman/OpsFlow-Backend-Demo.postman_collection.json`
- `docs/postman/OpsFlow-Local.postman_environment.json`

## Import
1. Import both files in Postman.
2. Select environment `OpsFlow Local Demo`.

## Prerequisite (important)
`Create Branch` and approval endpoints require `ADMIN` or `MANAGER` role.

By default, `register` creates a `USER` role. To grant admin quickly:
1. Run `Register` once and copy `userEmail` from environment.
2. Set `SEED_ADMIN_EMAIL=<that_email>` in `.env`.
3. Run `npm run db:seed` again.
4. Login again in Postman.

## Recommended order
1. `01 Auth Setup / Health`
2. `01 Auth Setup / Register`
3. `01 Auth Setup / Login`
4. `01 Auth Setup / Get CSRF`
5. `02 Branches / Create Branch (ADMIN)`
6. `03 Cash Movements / Create Income (PENDING)`
7. `03 Cash Movements / Approve Movement (MANAGER/ADMIN)`
8. `03 Cash Movements / Deliver Movement (MANAGER/ADMIN)`
9. `04 Cashflow Stats / Stats By Branch`

## Notes
- The collection auto-saves `accessToken`, `csrfToken`, `branchId`, and `movementId` in environment variables.
- Cookie-based refresh/logout flows still use Postman cookie jar.
