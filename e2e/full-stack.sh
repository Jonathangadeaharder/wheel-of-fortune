#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3001"
PASS=0
FAIL=0
TESTS=()

pass() { PASS=$((PASS + 1)); TESTS+=("  ✓ $1"); }
fail() { FAIL=$((FAIL + 1)); TESTS+=("  ✗ $1"); echo "  FAIL: $1 — $2"; }

get_json() { curl -sf "$BASE$1"; }
post_json() { curl -sf -X POST -H 'Content-Type: application/json' -d "$2" "$BASE$1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "  E2E Test Suite — Wheel of Fortune"
echo "═══════════════════════════════════════════════"
echo ""

# ─── API Tests ────────────────────────────────────────────────────
echo "── API Data Integrity ──"

DATA=$(get_json /api/data)
PRIZE_COUNT=$(echo "$DATA" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('prizes',[])))")

if [ "$PRIZE_COUNT" -gt 0 ]; then
  pass "GET /api/data returns prizes ($PRIZE_COUNT prizes)"
else
  fail "GET /api/data returns prizes" "prize count is $PRIZE_COUNT"
fi

HAS_WHEEL=$(echo "$DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print('wheelUnlocked' in d)")
if [ "$HAS_WHEEL" = "True" ]; then
  pass "GET /api/data includes wheelUnlocked"
else
  fail "GET /api/data includes wheelUnlocked" "missing"
fi

HAS_SPINS=$(echo "$DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print('spinRequests' in d)")
if [ "$HAS_SPINS" = "True" ]; then
  pass "GET /api/data includes spinRequests"
else
  fail "GET /api/data includes spinRequests" "missing"
fi

ALL_HAVE_QTY=$(echo "$DATA" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ok = all('quantity' in p and isinstance(p['quantity'], (int, float)) for p in d['prizes'])
print(ok)
")
if [ "$ALL_HAVE_QTY" = "True" ]; then
  pass "All prizes have numeric quantity field"
else
  fail "All prizes have numeric quantity field" "some prizes missing quantity"
fi

ALL_QTY_GE0=$(echo "$DATA" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ok = all(p.get('quantity', 0) >= 0 for p in d['prizes'])
print(ok)
")
if [ "$ALL_QTY_GE0" = "True" ]; then
  pass "All prizes have quantity >= 0"
else
  fail "All prizes have quantity >= 0" "negative quantity found"
fi

LOSE_QTY=$(echo "$DATA" | python3 -c "
import sys, json
d = json.load(sys.stdin)
lose = [p for p in d['prizes'] if p.get('isLosePrize')]
print(lose[0]['quantity'] if lose else 'NO_LOSE')
")
if [ "$LOSE_QTY" = "0" ]; then
  pass "Lose prize has quantity=0 (normalized)"
else
  fail "Lose prize has quantity=0" "got $LOSE_QTY"
fi

ALL_HAVE_ACTIVE=$(echo "$DATA" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ok = all('active' in p for p in d['prizes'])
print(ok)
")
if [ "$ALL_HAVE_ACTIVE" = "True" ]; then
  pass "All prizes have active field"
else
  fail "All prizes have active field" "missing"
fi

ALL_HAVE_NAME=$(echo "$DATA" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ok = all(p.get('name','') != '' for p in d['prizes'])
print(ok)
")
if [ "$ALL_HAVE_NAME" = "True" ]; then
  pass "All prizes have non-empty name"
else
  fail "All prizes have non-empty name" "empty name found"
fi

# ─── Lock/Unlock ─────────────────────────────────────────────────
echo ""
echo "── Wheel Lock/Unlock ──"

post_json /api/lock-wheel '{}' > /dev/null
LOCK_DATA=$(get_json /api/data)
LOCKED=$(echo "$LOCK_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['wheelUnlocked'])")
if [ "$LOCKED" = "False" ]; then
  pass "POST /api/lock-wheel locks the wheel"
else
  fail "POST /api/lock-wheel locks the wheel" "still unlocked"
fi

post_json /api/unlock-wheel '{}' > /dev/null
UNLOCK_DATA=$(get_json /api/data)
UNLOCKED=$(echo "$UNLOCK_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['wheelUnlocked'])")
if [ "$UNLOCKED" = "True" ]; then
  pass "POST /api/unlock-wheel unlocks the wheel"
else
  fail "POST /api/unlock-wheel unlocks the wheel" "still locked"
fi

post_json /api/lock-wheel '{}' > /dev/null

# ─── Wheel Status ────────────────────────────────────────────────
echo ""
echo "── Wheel Status API ──"

STATUS=$(get_json /api/wheel-status)
HAS_UNLOCKED=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('unlocked' in d)")
HAS_TS=$(echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('timestamp' in d)")
if [ "$HAS_UNLOCKED" = "True" ]; then
  pass "GET /api/wheel-status has unlocked field"
else
  fail "GET /api/wheel-status has unlocked field" "missing"
fi
if [ "$HAS_TS" = "True" ]; then
  pass "GET /api/wheel-status has timestamp field"
else
  fail "GET /api/wheel-status has timestamp field" "missing"
fi

# ─── Prize CRUD ──────────────────────────────────────────────────
echo ""
echo "── Prize CRUD ──"

ORIG_DATA=$(get_json /api/data)
ORIG_COUNT=$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['prizes']))")

post_json /api/prizes '[{"id":999,"name":"E2E Test","quantity":5,"probability":10,"image_url":"","active":true,"wheelCount":1}]' > /dev/null
AFTER_ADD=$(get_json /api/data)
ADD_COUNT=$(echo "$AFTER_ADD" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['prizes']))")
ADD_NAME=$(echo "$AFTER_ADD" | python3 -c "import sys,json; print(json.load(sys.stdin)['prizes'][0]['name'])")
if [ "$ADD_COUNT" = "1" ] && [ "$ADD_NAME" = "E2E Test" ]; then
  pass "POST /api/prizes replaces prizes"
else
  fail "POST /api/prizes replaces prizes" "count=$ADD_COUNT name=$ADD_NAME"
fi

# Restore
post_json /api/prizes "$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['prizes']))")" > /dev/null
RESTORE=$(get_json /api/data)
RESTORE_COUNT=$(echo "$RESTORE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['prizes']))")
if [ "$RESTORE_COUNT" = "$ORIG_COUNT" ]; then
  pass "Prize restore after test"
else
  fail "Prize restore after test" "expected $ORIG_COUNT got $RESTORE_COUNT"
fi

# ─── Normalization on write ──────────────────────────────────────
echo ""
echo "── Data Normalization ──"

post_json /api/prizes '[{"id":777,"name":"No Qty","probability":10,"image_url":"","active":true,"wheelCount":1}]' > /dev/null
NORM=$(get_json /api/data)
NORM_QTY=$(echo "$NORM" | python3 -c "import sys,json; print(json.load(sys.stdin)['prizes'][0]['quantity'])")
if [ "$NORM_QTY" = "0" ]; then
  pass "Prize missing quantity gets normalized to 0"
else
  fail "Prize missing quantity gets normalized to 0" "got $NORM_QTY"
fi

post_json /api/prizes '[{"id":666,"name":"OnlyIdName"}]' > /dev/null
NORM2=$(get_json /api/data)
NORM2_ACTIVE=$(echo "$NORM2" | python3 -c "import sys,json; print(json.load(sys.stdin)['prizes'][0]['active'])")
NORM2_WC=$(echo "$NORM2" | python3 -c "import sys,json; print(json.load(sys.stdin)['prizes'][0]['wheelCount'])")
if [ "$NORM2_ACTIVE" = "True" ] && [ "$NORM2_WC" = "1" ]; then
  pass "Minimal prize gets all defaults"
else
  fail "Minimal prize gets all defaults" "active=$NORM2_ACTIVE wheelCount=$NORM2_WC"
fi

# Restore
post_json /api/prizes "$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['prizes']))")" > /dev/null

# ─── Spin Requests ───────────────────────────────────────────────
echo ""
echo "── Spin Requests ──"

SPINS=$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('spinRequests',[])))")
pass "GET /api/data returns spinRequests array ($SPINS requests)"

post_json /api/spin-requests '[{"id":1,"prize":{"id":1,"name":"Test"},"timestamp":"2025-01-01T00:00:00Z","status":"processed"}]' > /dev/null
AFTER_SPIN=$(get_json /api/data)
SPIN_COUNT=$(echo "$AFTER_SPIN" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['spinRequests']))")
if [ "$SPIN_COUNT" = "1" ]; then
  pass "POST /api/spin-requests updates spin requests"
else
  fail "POST /api/spin-requests updates spin requests" "count=$SPIN_COUNT"
fi

# Restore
post_json /api/prizes "$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['prizes']))")" > /dev/null
post_json /api/spin-requests "$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('spinRequests',[])))")" > /dev/null

# ─── HTML Content Tests ──────────────────────────────────────────
echo ""
echo "── HTML Content (Wheel Page) ──"

WHEEL_HTML=$(curl -sf "$BASE/")

if echo "$WHEEL_HTML" | grep -q 'id="root"'; then
  pass "Wheel page has React root element"
else
  fail "Wheel page has React root element" "not found"
fi

if echo "$WHEEL_HTML" | grep -q 'script'; then
  pass "Wheel page loads JavaScript bundle"
else
  fail "Wheel page loads JavaScript bundle" "not found"
fi

# ─── HTML Content Tests ──────────────────────────────────────────
echo ""
echo "── HTML Content (Admin Page) ──"

ADMIN_HTML=$(curl -sf "$BASE/admin")

if echo "$ADMIN_HTML" | grep -q 'id="root"'; then
  pass "Admin page has React root element"
else
  fail "Admin page has React root element" "not found"
fi

if echo "$ADMIN_HTML" | grep -q 'script'; then
  pass "Admin page loads JavaScript bundle"
else
  fail "Admin page loads JavaScript bundle" "not found"
fi

# ─── JS Bundle Content ───────────────────────────────────────────
echo ""
echo "── JS Bundle Content ──"

JS_FILE=$(echo "$ADMIN_HTML" | grep -o 'src="/assets/index-[A-Za-z0-9_-]*\.js"' | head -1 | sed 's/src="//;s/"//')
if [ -n "$JS_FILE" ]; then
  JS_URL="${BASE}${JS_FILE}"
  curl -sf "$JS_URL" > /tmp/wheel-js-bundle.js
  JS_SIZE=$(wc -c < /tmp/wheel-js-bundle.js)

  if [ "$JS_SIZE" -gt 1000 ]; then
    pass "JS bundle loaded ($JS_SIZE bytes)"
  else
    fail "JS bundle loaded" "only $JS_SIZE bytes"
  fi

  if grep -q 'Gestión de Inventario' /tmp/wheel-js-bundle.js; then
    pass "JS bundle contains 'Gestión de Inventario' text"
  else
    fail "JS bundle contains 'Gestión de Inventario' text" "not found"
  fi

  if grep -q 'prize-item\|prize-list' /tmp/wheel-js-bundle.js; then
    pass "JS bundle contains prize rendering classes"
  else
    fail "JS bundle contains prize rendering classes" "not found"
  fi

  if grep -q 'No hay productos en el inventario' /tmp/wheel-js-bundle.js; then
    pass "JS bundle contains empty state message"
  else
    fail "JS bundle contains empty state message" "not found"
  fi

  if grep -q 'filter' /tmp/wheel-js-bundle.js; then
    pass "JS bundle contains filtering logic"
  else
    fail "JS bundle contains filtering logic" "not found"
  fi

  if grep -q 'sort' /tmp/wheel-js-bundle.js; then
    pass "JS bundle contains sorting logic"
  else
    fail "JS bundle contains sorting logic" "not found"
  fi

  if grep -q '/api/data' /tmp/wheel-js-bundle.js; then
    pass "JS bundle fetches /api/data"
  else
    fail "JS bundle fetches /api/data" "not found"
  fi

  if grep -q 'quantity' /tmp/wheel-js-bundle.js; then
    pass "JS bundle references quantity field"
  else
    fail "JS bundle references quantity field" "not found"
  fi
else
  fail "Extract JS bundle URL" "could not find script src"
fi

# ─── Full Data Flow Test ─────────────────────────────────────────
echo ""
echo "── Full Data Flow (Set prizes → Verify API → Verify HTML) ──"

FLOW_PRIZES='[{"id":50,"name":"FlowTest","quantity":42,"probability":99,"image_url":"🧪","active":true,"wheelCount":2}]'
post_json /api/prizes "$FLOW_PRIZES" > /dev/null

FLOW_DATA=$(get_json /api/data)
FLOW_NAME=$(echo "$FLOW_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['prizes'][0]['name'])")
FLOW_QTY=$(echo "$FLOW_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['prizes'][0]['quantity'])")

if [ "$FLOW_NAME" = "FlowTest" ] && [ "$FLOW_QTY" = "42" ]; then
  pass "Set custom prizes via API → verified in GET"
else
  fail "Set custom prizes via API → verified in GET" "name=$FLOW_NAME qty=$FLOW_QTY"
fi

FLOW_WHEEL=$(curl -sf "$BASE/")
if echo "$FLOW_WHEEL" | grep -q 'script'; then
  pass "Wheel page serves HTML after prize update"
else
  fail "Wheel page serves HTML after prize update" "no script tag"
fi

FLOW_ADMIN=$(curl -sf "$BASE/admin")
if echo "$FLOW_ADMIN" | grep -q 'script'; then
  pass "Admin page serves HTML after prize update"
else
  fail "Admin page serves HTML after prize update" "no script tag"
fi

# Restore
post_json /api/prizes "$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['prizes']))")" > /dev/null
post_json /api/spin-requests "$(echo "$ORIG_DATA" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('spinRequests',[])))")" > /dev/null
post_json /api/lock-wheel '{}' > /dev/null

# ─── Summary ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  Results"
echo "═══════════════════════════════════════════════"
for t in "${TESTS[@]}"; do echo "$t"; done
echo ""
TOTAL=$((PASS + FAIL))
echo "  $TOTAL tests, $PASS passed, $FAIL failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
