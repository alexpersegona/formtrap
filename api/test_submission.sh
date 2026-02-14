#!/bin/bash

# Test script for form submissions
# Usage: ./test_submission.sh

API_URL="http://localhost:8080"
FORM_ID="2_u-Yrd3PnysGFnv-p4BQ"  # Contact Form

echo "========================================"
echo "FormTrap Submission Tests"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Valid JSON submission (should save + email)
echo -e "${YELLOW}Test 1: Valid JSON submission${NC}"
echo "Expected: Save to DB, send email notification"
echo ""
RESPONSE=$(curl -s -X POST "$API_URL/forms/$FORM_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "message": "This is a test submission from the test script.",
    "phone": "555-1234"
  }')
echo "Response: $RESPONSE"
echo ""

# Extract submission_id if present
SUBMISSION_ID=$(echo $RESPONSE | grep -o '"submission_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$SUBMISSION_ID" ]; then
  echo -e "${GREEN}✓ Submission ID: $SUBMISSION_ID${NC}"
else
  echo -e "${RED}✗ No submission ID returned${NC}"
fi
echo ""

# Test 2: SPAM submission (honeypot filled - should NOT save)
echo "========================================"
echo -e "${YELLOW}Test 2: SPAM submission (honeypot filled)${NC}"
echo "Expected: Return success but NOT save to DB, NOT send email"
echo ""
SPAM_RESPONSE=$(curl -s -X POST "$API_URL/forms/$FORM_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spam Bot",
    "email": "spammer@evil.com",
    "message": "Buy cheap stuff!",
    "website": "http://spam.com"
  }')
echo "Response: $SPAM_RESPONSE"
echo ""

# Check if it returned success (it should, to not tip off spammers)
if echo "$SPAM_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Returned success (spam not tipped off)${NC}"
else
  echo -e "${RED}✗ Unexpected response${NC}"
fi

# Check if submission_id is missing (spam shouldn't be saved)
if echo "$SPAM_RESPONSE" | grep -q '"submission_id"'; then
  echo -e "${RED}✗ Submission ID returned - spam may have been saved!${NC}"
else
  echo -e "${GREEN}✓ No submission ID (spam not saved)${NC}"
fi
echo ""

# Test 3: Multipart form with file upload
echo "========================================"
echo -e "${YELLOW}Test 3: Multipart form with file upload${NC}"
echo "Expected: Upload file to R2, save to DB with file URLs"
echo ""

# Create a test file
echo "This is a test file for FormTrap upload testing." > /tmp/test_upload.txt

FILE_RESPONSE=$(curl -s -X POST "$API_URL/forms/$FORM_ID" \
  -F "name=File Test User" \
  -F "email=filetest@example.com" \
  -F "message=Testing file upload functionality" \
  -F "file=@/tmp/test_upload.txt")
echo "Response: $FILE_RESPONSE"
echo ""

FILE_SUBMISSION_ID=$(echo $FILE_RESPONSE | grep -o '"submission_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$FILE_SUBMISSION_ID" ]; then
  echo -e "${GREEN}✓ File submission ID: $FILE_SUBMISSION_ID${NC}"
else
  echo -e "${RED}✗ No submission ID returned${NC}"
fi

# Cleanup
rm -f /tmp/test_upload.txt

echo ""
echo "========================================"
echo "Verification Steps"
echo "========================================"
echo ""
echo "1. Check database for submissions:"
echo "   psql \"\$DATABASE_URL\" -c \"SELECT id, email, \\\"isSpam\\\", files FROM submission ORDER BY \\\"createdAt\\\" DESC LIMIT 5;\""
echo ""
echo "2. Check R2 bucket for uploaded files:"
echo "   Files should be at: submissions/$FORM_ID/<submission_id>/"
echo ""
echo "3. Check email inbox for notification (if MAILGUN_API_KEY is valid)"
echo ""
echo "4. Check Go API logs for processing details"
echo ""
