# Voice Deploy And Retest

## 1) Strict cPanel deploy routine

From project root:

```bash
bash scripts/cpanel-deploy-strict.sh
```

What it enforces:
- `composer dump-autoload -o`
- `php artisan optimize:clear`
- `php artisan migrate --force`
- `php artisan config:cache`
- `php artisan route:cache`
- `php artisan view:cache`
- `php artisan event:cache`
- voice route sanity check

## 2) Voice reliability retest (manual + automated verification)

### Manual scenario calls to execute after deploy
- outbound answered
- outbound busy
- outbound no answer
- outbound rejected
- inbound routing to available agent

### Automated validation from recent call logs

After running the scenarios above:

```bash
php artisan voice:smoke-check --hours=2 --require=answered,busy,noanswer,rejected,inbound
```

Pass criteria:
- command exits `0`
- all required scenarios show `OK`

If it fails:
- rerun missing scenarios shown by the command
- confirm logs in `storage/logs/laravel.log`
- rerun the smoke check

## Optional helper script

```bash
bash scripts/voice-post-deploy-check.sh
```
