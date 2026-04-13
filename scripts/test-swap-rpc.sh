#!/bin/bash
# Direct RPC Test - No dependencies needed

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║    SWAP Contract Direct RPC Test (curl)                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

RPC_URL="https://rpc.cncchainpro.com"
SWAP_ADDRESS="0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC"

echo "📍 RPC URL: $RPC_URL"
echo "📍 SWAP:    $SWAP_ADDRESS"
echo ""

# Test 1: Get block number (test connectivity)
echo "═══ TEST 1: Connectivity ═══"
BLOCK_RESP=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')

BLOCK=$(echo $BLOCK_RESP | grep -o '"result":"0x[^"]*' | cut -d'"' -f4)
if [ -n "$BLOCK" ]; then
  echo "✅ Connected to RPC"
  echo "   Block: $BLOCK ($(printf %d $BLOCK))"
else
  echo "❌ Failed to connect to RPC"
  echo "Response: $BLOCK_RESP"
  exit 1
fi
echo ""

# Test 2: Get code (check if contract exists)
echo "═══ TEST 2: Contract Existence ═══"
CODE_RESP=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$SWAP_ADDRESS\",\"latest\"],\"id\":2}")

CODE=$(echo $CODE_RESP | grep -o '"result":"0x[^"]*' | cut -d'"' -f4)
if [ "$CODE" = "0x" ]; then
  echo "❌ No contract code at SWAP_ADDRESS"
  exit 1
fi

CODE_SIZE=$(( (${#CODE} - 2) / 2 ))
echo "✅ Contract found at $SWAP_ADDRESS"
echo "   Code size: $CODE_SIZE bytes"
echo ""

# Test 3: Call swapPaused() - slot 42 
# swapPaused is typically a state variable
echo "═══ TEST 3: Check Swap Status ═══"

# First, let's try to call the swapPaused() view function
# Function selector for swapPaused() is keccak256("swapPaused()") = 0x8d4a0e0f
SWAP_PAUSED_CALL=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$SWAP_ADDRESS\",\"data\":\"0x8d4a0e0f\"},\"latest\"],\"id\":3}")

PAUSED_RESULT=$(echo $SWAP_PAUSED_CALL | grep -o '"result":"0x[^"]*' | cut -d'"' -f4)
echo "swapPaused() raw result: $PAUSED_RESULT"

if [ "$PAUSED_RESULT" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
  echo "✅ swapPaused() = false (SWAP IS ACTIVE)"
elif [ "$PAUSED_RESULT" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then
  echo "🚫 swapPaused() = true (SWAP IS PAUSED - THIS IS THE PROBLEM!)"
else
  echo "⚠️  Could not parse swapPaused response"
fi

echo ""

# Test 4: Get version info
echo "═══ TEST 4: Contract Version ═══"
# version() signature = 0x54fd4d50
VERSION_CALL=$(curl -s -X POST "$RPC_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$SWAP_ADDRESS\",\"data\":\"0x54fd4d50\"},\"latest\"],\"id\":4}")

echo "version() call result: $VERSION_CALL"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Test Complete                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 Next steps:"
echo "   1. Check if swap is paused (see TEST 3)"
echo "   2. If paused, owner must call: setSwapPaused(false)"
echo "   3. Re-run this test to verify swap is active"
echo ""
