#!/usr/bin/env bash
# Payments, deposits, refunds and KM, over real HTTP.
#
#   tools/test-ledger.sh http://127.0.0.1:8210 admin@example.com password
#
# The guarantees under test are the ones an auditor would ask about: that a
# wrong figure is never overwritten, that deposits never count as revenue,
# and that the extra-KM charge follows from the two odometer readings.

set -u
BASE="${1:?usage: test-ledger.sh <base-url> <email> <password>}"
EMAIL="${2:?}"
PASSWORD="${3:?}"
JAR="$(mktemp)"
PASS=0; FAIL=0
REG="LG$(date +%d%H%M%S)"
PHONE="8$(date +%d%H%M%S)"

ok()   { PASS=$((PASS+1)); echo "  ok    $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1${2:+ — $2}"; }
check(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected $3, got $2"; fi; }
has()  { if body | grep -q "$2"; then ok "$1"; else bad "$1" "$(body | head -c 160)"; fi; }
body() { cat /tmp/lg_body; }

post() {
  printf '%s' "$2" > /tmp/lg_payload
  curl -s -o /tmp/lg_body -w '%{http_code}' -b "$JAR" -X POST \
    -H 'Content-Type: application/json' -H "X-CSRF-Token: $TOKEN" \
    --data-binary @/tmp/lg_payload "$BASE/api/$1"
}
get() { curl -s -o /tmp/lg_body -w '%{http_code}' -b "$JAR" "$BASE/api/$1"; }

TOKEN=$(curl -s -c "$JAR" "$BASE/index.php" | grep -o 'name="csrf_token" value="[^"]*"' | sed 's/.*value="//;s/"//')
curl -s -b "$JAR" -c "$JAR" -o /dev/null -X POST \
  -d "csrf_token=$TOKEN&email=$EMAIL&password=$PASSWORD" "$BASE/index.php"
TOKEN=$(curl -s -b "$JAR" -c "$JAR" "$BASE/dashboard.php" | grep -o 'name="csrf-token" content="[^"]*"' | sed 's/.*content="//;s/"//')

# A vehicle at ₹2,500/day, 200 km/day, ₹8 per extra km, ₹5,000 deposit.
post "vehicles.php?action=save" "{\"name\":\"Ledger Car\",\"brand\":\"Maruti\",\"reg_number\":\"$REG\",
  \"body_type\":\"Hatchback\",\"fuel\":\"Petrol\",\"transmission\":\"Manual\",\"seats\":5,
  \"model_year\":2024,\"colour\":\"#123456\",\"status\":\"Available\",\"current_km\":50000,
  \"rate_daily\":\"2500\",\"km_limit_per_day\":200,\"extra_km_rate\":\"8\",
  \"security_deposit\":\"5000\"}" >/dev/null
VID=$(body | sed -n 's/.*"id":\([0-9]*\).*/\1/p')

# Three days: ₹7,500, 600 km included.
post "bookings.php?action=save" "{\"customer_name\":\"Ledger Test\",\"phone\":\"$PHONE\",
  \"licence_number\":\"TN0120230099999\",\"vehicle_id\":$VID,
  \"start_at\":\"2026-09-01 10:00\",\"return_at\":\"2026-09-04 10:00\",
  \"base_rental\":\"7500\",\"km_limit_per_day\":200,\"extra_km_rate\":\"8\"}" >/dev/null
BID=$(body | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
[ -n "$BID" ] && ok "booking ready (#$BID)" || bad "booking ready"

echo
echo "-- payments --"
check "advance of 3000 recorded" \
  "$(post "payments.php?action=add" "{\"booking_id\":$BID,\"kind\":\"advance\",\"amount\":\"3000\",
     \"paid_on\":\"2026-08-25\",\"method\":\"UPI\",\"reference\":\"UPI123\"}")" "200"
has "balance is 4500" '"balance":4500'
has "status is Partially Paid" '"payment_status":"Partially Paid"'

check "a zero payment is refused" \
  "$(post "payments.php?action=add" "{\"booking_id\":$BID,\"kind\":\"balance\",\"amount\":\"0\",
     \"paid_on\":\"2026-08-25\",\"method\":\"Cash\"}")" "422"

echo
echo "-- a payment entered wrongly is corrected, not edited --"
post "payments.php?action=add" "{\"booking_id\":$BID,\"kind\":\"balance\",\"amount\":\"1000\",
  \"paid_on\":\"2026-09-04\",\"method\":\"Cash\"}" >/dev/null
PMT=$(body | sed -n 's/.*"payment_id":\([0-9]*\).*/\1/p')
check "correction of +500 accepted" \
  "$(post "payments.php?action=correct" "{\"corrects_id\":$PMT,\"amount\":\"500\",
     \"reason\":\"Counted 1500, recorded 1000\",\"paid_on\":\"2026-09-04\",\"method\":\"Cash\"}")" "200"
has "paid is now 4500" '"paid":4500'
check "a correction needs a reason" \
  "$(post "payments.php?action=correct" "{\"corrects_id\":$PMT,\"amount\":\"100\",
     \"paid_on\":\"2026-09-04\",\"method\":\"Cash\"}")" "422"

get "bookings.php?action=get&id=$BID" >/dev/null
has "the original 1000 is still on the record" '"amount":1000'
has "the correction sits beside it" '"amount":500'

echo
echo "-- voiding --"
post "payments.php?action=add" "{\"booking_id\":$BID,\"kind\":\"additional\",\"amount\":\"200\",
  \"paid_on\":\"2026-09-04\",\"method\":\"Cash\"}" >/dev/null
VOID=$(body | sed -n 's/.*"payment_id":\([0-9]*\).*/\1/p')
check "voiding needs a reason" "$(post "payments.php?action=void" "{\"id\":$VOID}")" "422"
check "voiding with a reason accepted" \
  "$(post "payments.php?action=void" "{\"id\":$VOID,\"reason\":\"Entered against the wrong booking\"}")" "200"
has "the voided amount no longer counts" '"paid":4500'
check "voiding twice refused" \
  "$(post "payments.php?action=void" "{\"id\":$VOID,\"reason\":\"again\"}")" "409"

echo
echo "-- deposits are not revenue --"
check "deposit of 5000 recorded" \
  "$(post "payments.php?action=deposit" "{\"booking_id\":$BID,\"amount\":\"5000\",
     \"received_on\":\"2026-09-01\",\"method\":\"Cash\"}")" "200"
has "deposit shown as held" '"deposit_held":5000'
has "but paid is unchanged at 4500" '"paid":4500'
has "and the total owed is unchanged" '"total":7500'

echo
echo "-- km --"
check "return before pickup is refused" \
  "$(post "km.php?action=return" "{\"booking_id\":$BID,\"odometer_km\":51000,
     \"recorded_at\":\"2026-09-04 10:00\",\"fuel_level\":\"Full\"}")" "409"
check "pickup at 50,000 recorded" \
  "$(post "km.php?action=pickup" "{\"booking_id\":$BID,\"odometer_km\":50000,
     \"recorded_at\":\"2026-09-01 10:00\",\"fuel_level\":\"Full\"}")" "200"
check "a second pickup is refused" \
  "$(post "km.php?action=pickup" "{\"booking_id\":$BID,\"odometer_km\":50000,
     \"recorded_at\":\"2026-09-01 10:00\",\"fuel_level\":\"Full\"}")" "409"
check "an odometer running backwards is refused" \
  "$(post "km.php?action=return" "{\"booking_id\":$BID,\"odometer_km\":49000,
     \"recorded_at\":\"2026-09-04 10:00\",\"fuel_level\":\"Full\"}")" "422"

# 50,000 -> 50,850 is 850 km against 600 allowed: 250 extra at ₹8 = ₹2,000.
check "return at 50,850 recorded" \
  "$(post "km.php?action=return" "{\"booking_id\":$BID,\"odometer_km\":50850,
     \"recorded_at\":\"2026-09-04 10:00\",\"fuel_level\":\"1/2\"}")" "200"
has "850 km driven"        '"total_km":850'
has "600 km allowed"       '"allowed_km":600'
has "250 km over"          '"extra_km":250'
has "charged 2000 extra"   '"extra_km_charge":"2000.00"'

get "bookings.php?action=get&id=$BID" >/dev/null
has "the total is now 9500" '"total":9500'

echo
echo "-- a misread meter is corrected, not overwritten --"
RET_ID=$(get "bookings.php?action=get&id=$BID" >/dev/null; body | tr ',' '\n' | grep -A0 '"leg":"return"' >/dev/null; echo "")
KMID=$(curl -s -b "$JAR" "$BASE/api/bookings.php?action=get&id=$BID" \
  | tr '{' '\n' | grep '"leg":"return"' | sed -n 's/.*"id":"\{0,1\}\([0-9]*\).*/\1/p' | head -1)
check "correcting needs a reason" \
  "$(post "km.php?action=correct" "{\"id\":$KMID,\"odometer_km\":50800}")" "422"
check "correction to 50,800 accepted" \
  "$(post "km.php?action=correct" "{\"id\":$KMID,\"odometer_km\":50800,\"reason\":\"Misread the meter\"}")" "200"
has "the difference is reported"   '"difference":-50'
has "now 800 km driven"            '"total_km":800'
has "200 km over"                  '"extra_km":200'
has "extra charge falls to 1600"   '"extra_km_charge":"1600.00"'

echo
echo "-- refunding the deposit --"
check "deducting more than is held is refused" \
  "$(post "payments.php?action=refund" "{\"booking_id\":$BID,\"deduction\":\"6000\",
     \"deduction_reason\":\"Damage\",\"refunded_on\":\"2026-09-04\",\"method\":\"UPI\"}")" "422"
check "deducting without a reason is refused" \
  "$(post "payments.php?action=refund" "{\"booking_id\":$BID,\"deduction\":\"750\",
     \"refunded_on\":\"2026-09-04\",\"method\":\"UPI\"}")" "422"
check "refund with a reason accepted" \
  "$(post "payments.php?action=refund" "{\"booking_id\":$BID,\"deduction\":\"750\",
     \"deduction_reason\":\"Scratch on rear bumper\",\"refunded_on\":\"2026-09-04\",\"method\":\"UPI\"}")" "200"
has "refunded 4250"        '"refund_amount":4250'
has "nothing still held"   '"deposit_held":0'
has "revenue still excludes the deposit" '"total":9100'

echo
echo "-- completing --"
check "completion now allowed" "$(post "bookings.php?action=complete" "{\"id\":$BID}")" "200"
has "outstanding balance is flagged" 'Outstanding balance'

rm -f "$JAR"
echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
