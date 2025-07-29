import type { Request, Response, NextFunction } from 'express';
import { webcrypto } from 'crypto';

async function verifySignature(publicKeyB64: string, message: string, signatureB64: string): Promise<boolean> {
    try {
        const publicKey = await webcrypto.subtle.importKey(
            'spki',
            Buffer.from(publicKeyB64, 'base64'),
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            true,
            ['verify']
        );

        const signature = Buffer.from(signatureB64, 'base64');
        const data = new TextEncoder().encode(message);

        return await webcrypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: 'SHA-256'
            },
            publicKey,
            signature,
            data
        );
    } catch (error) {
        console.error("Signature verification failed:", error);
        return false;
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const userId = req.headers['x-user-id'];
    const timestamp = req.headers['x-timestamp'];
    const signature = req.headers['x-signature'];

    if (typeof userId !== 'string' || typeof timestamp !== 'string' || typeof signature !== 'string') {
        return res.status(401).json({ error: 'Unauthorized: Missing authentication headers' });
    }

    // 1. Check if timestamp is recent (within 120 seconds)
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - requestTime) > 120 * 1000) {
        return res.status(401).json({ error: 'Unauthorized: Stale request' });
    }

    // 2. Verify the signature
    const isValid = await verifySignature(userId, timestamp, signature);

    if (!isValid) {
        return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }
    
    // If all checks pass, attach userId to request and proceed
    req.userId = userId;
    next();
}
