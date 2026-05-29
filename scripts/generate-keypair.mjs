/**
 * Generate a Sui Ed25519 keypair for VeriGen.
 * Run: node scripts/generate-keypair.mjs
 *
 * Outputs:
 *  - Sui address (fund this on mainnet/testnet)
 *  - Base64 private key (set as SUI_PRIVATE_KEY in .env.local / Vercel)
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = new Ed25519Keypair();
const address = keypair.getPublicKey().toSuiAddress();
const secretKey = Buffer.from(keypair.getSecretKey()).toString('base64');

console.log('=== VeriGen Sui Keypair ===\n');
console.log('Address (fund this):', address);
console.log('');
console.log('SUI_PRIVATE_KEY (base64):');
console.log(secretKey);
console.log('');
console.log('Next steps:');
console.log('1. Fund the address above with SUI tokens');
console.log('   - Testnet faucet: https://faucet.sui.io/ (paste your address)');
console.log('   - Mainnet: transfer SUI from an exchange');
console.log('2. Install Sui CLI to deploy the Move contract');
console.log('3. Set SUI_PRIVATE_KEY in Vercel env vars');
