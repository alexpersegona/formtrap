#!/bin/bash

# Test Rate Limiting on All Auth Endpoints
# This script tests that all rate-limited endpoints return proper 429 errors

echo "================================"
echo "Testing Rate Limiting Middleware"
echo "================================"
echo ""

# Clear Redis first
echo "Clearing Redis counters..."
redis-cli FLUSHDB > /dev/null
echo "✓ Redis cleared"
echo ""

# Test 1: Login Endpoint (5 attempts / 15 min)
echo "TEST 1: Login Endpoint (Limit: 5 attempts)"
echo "-------------------------------------------"
for i in {1..6}; do
    echo -n "Attempt $i: "
    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5173/api/auth/sign-in/email \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"wrongpassword"}')

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" = "429" ]; then
        echo "✓ Rate limited (429)"
        echo "   Message: $(echo $body | jq -r '.error' 2>/dev/null || echo $body)"
    elif [ "$status" = "401" ]; then
        echo "  Auth failed (401) - within limit"
    else
        echo "✗ Unexpected status: $status"
    fi
done
echo ""

# Clear for next test
redis-cli FLUSHDB > /dev/null

# Test 2: Register Endpoint (3 attempts / 1 hour)
echo "TEST 2: Register Endpoint (Limit: 3 attempts)"
echo "----------------------------------------------"
for i in {1..4}; do
    echo -n "Attempt $i: "
    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5173/api/auth/sign-up/email \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"test$i@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}")

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" = "429" ]; then
        echo "✓ Rate limited (429)"
        echo "   Message: $(echo $body | jq -r '.error' 2>/dev/null || echo $body)"
    else
        echo "  Status $status - within limit"
    fi
done
echo ""

# Clear for next test
redis-cli FLUSHDB > /dev/null

# Test 3: Forgot Password Endpoint (3 attempts / 1 hour per IP+Email)
echo "TEST 3: Forgot Password Endpoint (Limit: 3 attempts per IP+Email)"
echo "------------------------------------------------------------------"
for i in {1..4}; do
    echo -n "Attempt $i: "
    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5173/api/auth/forget-password \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","redirectTo":"/reset-password"}')

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" = "429" ]; then
        echo "✓ Rate limited (429)"
        echo "   Message: $(echo $body | jq -r '.error' 2>/dev/null || echo $body)"
    else
        echo "  Status $status - within limit"
    fi
done
echo ""

# Clear for next test
redis-cli FLUSHDB > /dev/null

# Test 4: Reset Password Endpoint (5 attempts / 30 min)
echo "TEST 4: Reset Password Endpoint (Limit: 5 attempts)"
echo "----------------------------------------------------"
for i in {1..6}; do
    echo -n "Attempt $i: "
    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5173/api/auth/reset-password \
        -H "Content-Type: application/json" \
        -d '{"newPassword":"newpassword123","token":"invalid-token"}')

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" = "429" ]; then
        echo "✓ Rate limited (429)"
        echo "   Message: $(echo $body | jq -r '.error' 2>/dev/null || echo $body)"
    else
        echo "  Status $status - within limit"
    fi
done
echo ""

# Summary
echo "================================"
echo "Summary"
echo "================================"
echo "All endpoints tested. Check above for any failures (marked with ✗)"
echo ""
echo "Rate Limit Configuration:"
echo "  - Login: 5 attempts / 15 minutes"
echo "  - Register: 3 attempts / hour"
echo "  - Forgot Password: 3 attempts / hour (per IP+Email)"
echo "  - Reset Password: 5 attempts / 30 minutes"
echo ""

# Check Redis keys
echo "Current Redis Keys:"
redis-cli KEYS "ratelimit:*"
echo ""
