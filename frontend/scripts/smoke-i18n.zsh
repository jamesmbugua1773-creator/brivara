#!/usr/bin/env zsh
setopt pipefail

base=${BASE_URL:-http://localhost:3000}
curl_bin=/usr/bin/curl
grep_bin=/usr/bin/grep

paths=(
  ""
  login
  register
  forgot-password
  reset-password/testtoken
  dashboard
  profile
  packages
  funding
  wallet
  withdraw
  rebates
  referrals
  roi
  points
  awards
  support
  admin
)

fail=0
print "SMOKE_START base=$base"

for loc in fr pt; do
  for p in $paths; do
    path="/$loc${p:+/$p}"
    url="$base$path"

    code=$($curl_bin -sS --max-time 6 -o /tmp/brivara_smoke.html -w "%{http_code}" "$url" || print 000)

    if [[ "$code" != "200" && "$code" != "307" && "$code" != "308" ]]; then
      print "BAD $code $path"
      fail=1
      continue
    fi

    if [[ ! -x "$grep_bin" ]]; then
      print "MISSING_BIN grep"
      fail=1
      continue
    fi

    if $grep_bin -qiE "MISSING_MESSAGE|Could not resolve|ERR_INVALID_ARG_TYPE|ENOENT" /tmp/brivara_smoke.html; then
      print "ERROR_MARKER $path"
      fail=1
      continue
    fi
  done
done

if [[ $fail -eq 0 ]]; then
  print ALL_OK
else
  print SMOKE_FAIL
fi

print SMOKE_END
exit $fail
