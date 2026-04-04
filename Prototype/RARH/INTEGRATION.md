# HumanProof — Integration Guide

Guide pratique pour intégrer World ID et AgentKit dans ce projet.
Résume les erreurs rencontrées pour éviter de les reproduire.

---

## Stack

- Next.js 15 (App Router)
- `@worldcoin/idkit` v4.0.11 — vérification World ID côté client
- `@worldcoin/idkit-server` v1.1.0 — signature du `RpContext` côté serveur
- `@worldcoin/agentkit` v0.1.6 — vérification des agents IA côté serveur

---

## 1. World ID — Vérification d'un humain (worker)

### Flow complet

```
Client                          Serveur
  │                                │
  │── POST /api/rp-signature ──────▶│  génère RpContext signé
  │◀── { rp_id, nonce, sig, ... } ──│
  │                                │
  │  [IDKitRequestWidget s'ouvre]  │
  │  [User scanne QR avec World App]│
  │                                │
  │── POST /api/workers/register ──▶│  vérifie proof via API v4
  │◀── { success: true } ───────────│
```

### Côté client — IDKitRequestWidget

```tsx
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';

// 1. Récupérer le RpContext depuis le serveur au clic du bouton
const openWidget = async () => {
  const res = await fetch('/api/rp-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'your-action-name' }),
  });
  const rpSig = await res.json();
  setRpContext({
    rp_id: rpSig.rp_id,
    nonce: rpSig.nonce,
    created_at: rpSig.created_at,
    expires_at: rpSig.expires_at,
    signature: rpSig.sig,
  });
  setOpen(true);
};

// 2. handleVerify est appelé AVANT onSuccess — c'est ici qu'on appelle le backend
const handleVerify = async (result) => {
  const res = await fetch('/api/workers/register', {
    method: 'POST',
    body: JSON.stringify({ proof: result, action: 'your-action-name' }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error); // IDKit affiche "Verification declined"
};

// 3. Le widget — preset et allow_legacy_proofs sont requis
<IDKitRequestWidget
  app_id={process.env.NEXT_PUBLIC_APP_ID as `app_${string}`}
  action="your-action-name"
  rp_context={rpContext}
  preset={orbLegacy({ signal: '' })}
  allow_legacy_proofs={true}
  open={open}
  onOpenChange={setOpen}
  handleVerify={handleVerify}
  onSuccess={onSuccess}
/>
```

### Côté serveur — Générer le RpContext (`/api/rp-signature`)

```ts
import { signRequest } from '@worldcoin/idkit-server';

// signRequest prend un OBJET (pas deux arguments séparés)
const sig = signRequest({ signingKeyHex: process.env.RP_SIGNING_KEY!, action });

return NextResponse.json({
  rp_id: process.env.RP_ID,
  sig: sig.sig,
  nonce: sig.nonce,
  created_at: sig.createdAt,   // nombre, pas BigInt
  expires_at: sig.expiresAt,
});
```

### Côté serveur — Vérifier le proof (`/api/workers/register`)

```ts
// ⚠️ Endpoint CORRECT : developer.world.org (pas developer.worldcoin.org)
// ⚠️ API version : v4 (pas v2)
// ⚠️ Path param : RP_ID (pas APP_ID)
// ⚠️ Body : le proof tel quel, sans remanier les champs

const verifyRes = await fetch(
  `https://developer.world.org/api/v4/verify/${process.env.RP_ID}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proof), // forward as-is, IDKit v4 gère le format
  }
);

const data = await verifyRes.json();
// data.success, data.nullifier (pour anti-replay), data.action
```

### Variables d'environnement requises

```env
NEXT_PUBLIC_APP_ID='app_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'  # Legacy App ID du Developer Portal
RP_ID='rp_xxxxxxxxxxxxxxxx'                                # RP ID du Developer Portal
RP_SIGNING_KEY='0xabc123...'                              # Clé privée générée dans le Developer Portal
```

### Pièges fréquents

| Erreur | Cause | Fix |
|---|---|---|
| `validation_error: verification_level required` | Ancien endpoint v2 | Passer à `developer.world.org/api/v4/verify/{RP_ID}` |
| `invalid_action: Action not found` | Endpoint v2 ne connaît pas les actions World ID 4.0 | Même fix — endpoint v4 |
| `Cannot read properties of undefined: __wbindgen_add_to_stack_pointer` | WASM IDKit non initialisé dans webpack | Voir section WASM ci-dessous |
| `Message too old` | `maxAge` passé en secondes au lieu de ms | Utiliser `maxAge: 300_000` |
| `IDKit.request().pollUntilCompletion()` tourne indéfiniment | API headless sans QR affiché | Utiliser `IDKitRequestWidget` à la place |

### Fix WASM dans next.config.ts

IDKit utilise un fichier `.wasm` chargé via `new URL("...", import.meta.url)`.
Webpack doit être configuré pour l'émettre correctement :

```ts
// next.config.ts
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.fallback = { ...config.resolve.fallback, 'fs/promises': false, fs: false };
  }
  // ⚠️ NE PAS activer asyncWebAssembly: true — ça empêche le fichier d'être émis
  config.module.rules.unshift({
    test: /idkit_wasm_bg\.wasm$/,
    type: 'asset/resource',
    generator: { filename: 'static/media/[name].[contenthash:8][ext]' },
  });
  config.output.publicPath = '/_next/';
  return config;
},
```

### Developer Portal — Configuration

1. Aller sur [developer.world.org](https://developer.world.org)
2. Créer une app → choisir **World ID 4.0**
3. Dans **World ID → Actions** : créer l'action avec l'identifiant exact utilisé dans le code
4. Dans **World ID 4.0** : noter le **Legacy App ID**, le **RP ID**, et générer une **Signing Key**
5. Ne pas cocher "Mini App" si on utilise IDKit standalone

---

## 2. AgentKit — Vérification d'un agent IA

AgentKit prouve qu'un agent IA est piloté par un vrai humain vérifié World ID.

### Enregistrement de l'agent (une fois)

```bash
# Génère un wallet pour l'agent
node -e "const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts'); const pk = generatePrivateKey(); console.log('KEY:', pk); console.log('ADDR:', privateKeyToAccount(pk).address);"

# Enregistre le wallet dans AgentBook sur World Chain
npx @worldcoin/agentkit-cli register 0xTON_ADRESSE_AGENT

# Scanner le QR avec World App → transaction on-chain sur World Chain
```

```env
DEMO_AGENT_PRIVATE_KEY='0xabc123...'  # Clé privée du wallet agent
```

### Côté agent — Construire le header agentkit

```ts
import { formatSIWEMessage } from '@worldcoin/agentkit';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(process.env.DEMO_AGENT_PRIVATE_KEY as `0x${string}`);

const info = {
  domain: 'localhost',
  uri: 'http://localhost:3000/api/tasks/create',
  statement: 'Post a task on HumanProof.',
  version: '1' as const,
  nonce: Math.random().toString(36).slice(2, 18),
  issuedAt: new Date().toISOString(),
  chainId: 'eip155:480',
  type: 'eip191' as const,
};

const message = formatSIWEMessage(info, account.address);
const signature = await account.signMessage({ message });

const header = btoa(JSON.stringify({ ...info, address: account.address, signature }));

fetch('http://localhost:3000/api/tasks/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'agentkit': header },
  body: JSON.stringify({ title: '...', description: '...', budget: '10 USDC', deadline: Date.now() + 86400000 }),
});
```

### Côté serveur — Vérifier le header agentkit

```ts
import {
  parseAgentkitHeader,
  validateAgentkitMessage,
  verifyAgentkitSignature,
  createAgentBookVerifier,
} from '@worldcoin/agentkit';

// ⚠️ Spécifier le RPC explicitement — le RPC par défaut peut être instable
const agentBook = createAgentBookVerifier({
  rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
});

// 1. Parser
const payload = parseAgentkitHeader(req.headers.get('agentkit')!);

// 2. Valider le message (fraîcheur, domaine, URI)
// ⚠️ maxAge est en MILLISECONDES
const validation = await validateAgentkitMessage(payload, req.url, { maxAge: 300_000 });
if (!validation.valid) throw new Error(validation.error);

// 3. Vérifier la signature EVM
const sigResult = await verifyAgentkitSignature(payload);
if (!sigResult.valid) throw new Error('Invalid signature');

// 4. Vérifier que l'agent est enregistré dans AgentBook (lié à un World ID)
const humanId = await agentBook.lookupHuman(payload.address, payload.chainId);
if (!humanId) throw new Error('Agent not registered — run: npx @worldcoin/agentkit-cli register <address>');

// humanId est le nullifier anonyme du World ID lié → utilisable pour rate-limiting
```

### Pièges fréquents AgentKit

| Erreur | Cause | Fix |
|---|---|---|
| `lookupHuman` retourne `null` pour un agent enregistré | RPC par défaut instable | Passer `rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public'` à `createAgentBookVerifier` |
| `Message too old: 2s exceeds 0.3s limit` | `maxAge` interprété en ms, valeur passée en secondes | `maxAge: 300_000` (5 min en ms) |
| 401 avant d'atteindre le lookup AgentBook | Validation du message échoue | Logger `validateAgentkitMessage` pour voir l'erreur exacte |

---

## 3. Checklist démo hackathon

- [ ] `.env.local` rempli avec `NEXT_PUBLIC_APP_ID`, `RP_ID`, `RP_SIGNING_KEY`, `DEMO_AGENT_PRIVATE_KEY`
- [ ] Action `humanproof-register-worker` créée dans le Developer Portal
- [ ] Wallet agent enregistré via `npx @worldcoin/agentkit-cli register <address>`
- [ ] Node 20+ (`nvm use 20`) — Tailwind v4 requiert Node >= 20
- [ ] Tunnel Cloudflare actif pour tester World ID depuis mobile : `cloudflared tunnel --url http://localhost:3000`
