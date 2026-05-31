# VeriGen — AI Image Provenance & Tamper Detection on Sui

> **Tatum x Walrus Hackathon Submission**

VeriGen is on-chain provenance infrastructure for AI-generated images. Every image is fingerprinted with SHA-256, stored permanently on **Walrus**, and registered on **Sui mainnet** via **Tatum RPC** — creating an immutable chain of custody that anyone can verify with a single click.

**Live demo:** [verigen-nine.vercel.app](https://verigen-nine.vercel.app)

---

## How It Works

```
  User enters a prompt
         |
         v
  +----------------+     +----------------+     +------------------+
  |  1. GENERATE   |     |  2. FINGERPRINT|     |  3. STORE        |
  |  Flux-Schnell  | --> |  SHA-256 hash  | --> |  Walrus blob     |
  |  (Replicate)   |     |  of raw bytes  |     |  (image + meta)  |
  +----------------+     +----------------+     +------------------+
                                                        |
                                                        v
                                                +------------------+
                                                |  4. REGISTER     |
                                                |  Sui mainnet     |
                                                |  via Tatum RPC   |
                                                |  (Move contract) |
                                                +------------------+
                                                        |
                                                        v
                                                +------------------+
                                                |  5. CERTIFICATE  |
                                                |  Exportable PNG  |
                                                |  + explorer links|
                                                +------------------+
```

### Verification Flow

```
  Paste blob ID --> Fetch from Walrus --> Re-hash SHA-256 --> Compare on-chain
                                                |
                                          MATCH = Authentic
                                       MISMATCH = Tampered
```

Upload any image alongside a blob ID to detect pixel-level tampering — VeriGen compares the uploaded file's SHA-256 against the on-chain record and highlights modified regions.

---

## Walrus Integration (Core Storage Layer)

Walrus is not an add-on — it **is** the storage layer:

1. **Every certified image** is stored as a Walrus blob containing raw base64 image data + metadata JSON (prompt, model, timestamp, creator, SHA-256 hash)
2. **Verification** fetches the original blob from Walrus and re-computes the SHA-256 to compare against the on-chain record
3. **The blob ID** is the primary key linking Walrus storage to the Sui registry contract
4. **Tamper detection** works by comparing a user-uploaded image's hash against the Walrus-stored original
5. **On-chain feed** loads real images directly from Walrus via `/api/image/[blobId]` proxy — images persist across all browsers because they live on decentralized storage
6. **Blob explorer links** let users inspect their data on [WalrusScan](https://walruscan.com)

## Tatum Integration (Sui RPC Gateway)

1. **Transaction execution** — All `sui_executeTransactionBlock` calls route through Tatum's Sui mainnet gateway (`sui-mainnet.gateway.tatum.io`) with `x-api-key` authentication
2. **AI Agent with MCP tools** — The built-in verification agent uses Tatum MCP-compatible tools to query the Sui registry, fetch blob metadata, and explain verification results in natural language
3. **On-chain registry queries** — `suix_queryTransactionBlocks` fetches recent certifications from the deployed Move contract to populate the live provenance feed

---

## Features

- **AI Image Generation** — Generate images from text prompts via Flux-Schnell (Black Forest Labs)
- **On-chain Certification** — Every image gets a SHA-256 fingerprint registered on Sui mainnet
- **Tamper Detection** — Upload any image to compare against the on-chain original
- **Certificate Export** — Download a certificate of authenticity as PNG
- **Wallet Connect** — Connect a Sui wallet to sign as the creator identity
- **AI Verification Agent** — Chat-based agent explains verification results using Gemini 2.0 Flash
- **Live Provenance Feed** — Recent certifications loaded directly from the Sui blockchain with images from Walrus
- **Explorer Links** — One-click links to SuiScan and WalrusScan for every certificate

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Image Generation | Replicate (Black Forest Labs Flux-Schnell) |
| Decentralized Storage | Walrus (blob store for images + metadata) |
| Blockchain | Sui mainnet (Move smart contract) |
| RPC Gateway | Tatum Sui mainnet gateway |
| AI Agent | Google Gemini 2.0 Flash via OpenRouter |
| Wallet | @mysten/dapp-kit (Sui wallet connect) |
| Deployment | Vercel |

---

## Architecture

```
verigen-app/
  app/
    api/
      generate/     POST  — Full pipeline: Replicate -> SHA-256 -> Walrus -> Sui
      verify/        GET   — Fetch blob from Walrus, return metadata + image
                    POST  — Compare uploaded hash vs on-chain record
      recent/        GET   — Query Sui mainnet for recent certifications
      image/[blobId] GET   — Proxy images from Walrus (cached 1hr)
      agent/        POST  — AI verification agent (Gemini + MCP tools)
    page.tsx               — Main certify page
    verify/page.tsx        — Verification terminal
  components/
    CertificateCard.tsx    — Exportable certificate with QR code
    VerifyPage.tsx          — Tamper detection UI
    AIChat.tsx             — AI agent chat interface
  contracts/
    sources/registry.move  — Sui Move contract (Table<String, Entry>)
  lib/
    tatum.ts               — Sui transaction building + Tatum RPC execution
    walrus.ts              — Walrus blob store/fetch
    replicate.ts           — Flux-Schnell image generation
    hash.ts                — SHA-256 fingerprinting
```

### Move Contract

The registry contract stores entries in a `Table<String, Entry>` keyed by blob ID:

```move
struct Entry has store, drop {
    blob_id: String,
    image_hash: String,
    prompt: String,
    timestamp: String,
    creator: address,
}
```

**Deployed on Sui mainnet:**
- Package: `0xcc538849ef2b5f2fa7855b4f6b8b0727e9421ebb73e5527435ed9b13ef362706`
- Registry: `0xaf85d3244059ee7dc205905bbe7f1678208410ecbe1340345708fb57d3a98904`

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

| Variable | Required | Where to get it |
|---|---|---|
| `REPLICATE_API_TOKEN` | Yes | [replicate.com](https://replicate.com) |
| `TATUM_API_KEY` | Yes | [dashboard.tatum.io](https://dashboard.tatum.io) |
| `SUI_PRIVATE_KEY` | Yes | `sui keytool export` (bech32 or base64) |
| `SUI_PACKAGE_ID` | Yes | From `sui client publish` output |
| `SUI_REGISTRY_OBJECT_ID` | Yes | Shared object from publish output |
| `OPENROUTER_API_KEY` | Yes | [openrouter.ai/keys](https://openrouter.ai/keys) |

> **Demo mode:** If credentials are missing, the app runs with realistic sample data. API responses include `x-demo-mode: true` header.

### 3. Deploy Move Contract

```bash
cd contracts
sui client publish --gas-budget 100000000
```

Note the shared Registry object ID and package ID from the output.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

```bash
vercel --prod
```

Set all environment variables in Vercel dashboard > Settings > Environment Variables.

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/generate` | POST | Full pipeline: generate image, hash, store on Walrus, register on Sui |
| `/api/verify` | GET | Fetch blob metadata + image from Walrus by blob ID |
| `/api/verify` | POST | Compare uploaded file hash against on-chain record |
| `/api/recent` | GET | Query recent certifications from Sui mainnet |
| `/api/image/[blobId]` | GET | Proxy image binary from Walrus (cached 1hr) |
| `/api/agent` | POST | AI verification agent with MCP-compatible tools |

## Explorer Links

- **SuiScan:** [suiscan.xyz/mainnet/tx/{txDigest}](https://suiscan.xyz/mainnet)
- **WalrusScan:** [walruscan.com/mainnet/blob/{blobId}](https://walruscan.com)

---

## License

MIT
