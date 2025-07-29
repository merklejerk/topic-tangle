const KEY_STORAGE_PREFIX = 'topic-tangle-key-';

/**
 * Generates a new ECDSA P-256 key pair for signing.
 */
async function generateKeys(): Promise<CryptoKeyPair> {
	return await window.crypto.subtle.generateKey(
		{
			name: 'ECDSA',
			namedCurve: 'P-256'
		},
		true, // key is extractable
		['sign', 'verify']
	);
}

/**
 * Stores a CryptoKeyPair in localStorage by exporting keys to JWK format.
 */
async function storeKeyPair(keyName: string, keyPair: CryptoKeyPair): Promise<void> {
	const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
	localStorage.setItem(`${KEY_STORAGE_PREFIX}${keyName}:public`, JSON.stringify(publicKeyJwk));
	
	const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
	localStorage.setItem(`${KEY_STORAGE_PREFIX}${keyName}:private`, JSON.stringify(privateKeyJwk));
}

/**
 * Retrieves and imports a stored public key from localStorage.
 */
export async function getPublicKey(keyName: string): Promise<CryptoKey | null> {
	const publicKeyJwkString = localStorage.getItem(`${KEY_STORAGE_PREFIX}${keyName}:public`);
	if (!publicKeyJwkString) return null;

	const publicKeyJwk = JSON.parse(publicKeyJwkString);
	return await window.crypto.subtle.importKey(
		'jwk',
		publicKeyJwk,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['verify']
	);
}

/**
 * Retrieves and imports a stored private key from localStorage.
 */
async function getPrivateKey(keyName: string): Promise<CryptoKey | null> {
	const privateKeyJwkString = localStorage.getItem(`${KEY_STORAGE_PREFIX}${keyName}:private`);
	if (!privateKeyJwkString) return null;

	const privateKeyJwk = JSON.parse(privateKeyJwkString);
	return await window.crypto.subtle.importKey(
		'jwk',
		privateKeyJwk,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign']
	);
}

/**
 * Signs a message with the stored private key using native Web Crypto.
 * The signature is returned as a Base64 string.
 */
export async function sign(keyName: string, message: string): Promise<string> {
	const privateKey = await getPrivateKey(keyName);
	if (!privateKey) {
		throw new Error(`Private key '${keyName}' not found.`);
	}

	const encoder = new TextEncoder();
	const data = encoder.encode(message);

	const signature = await window.crypto.subtle.sign(
		{
			name: 'ECDSA',
			hash: 'SHA-256'
		},
		privateKey,
		data
	);

	// Convert ArrayBuffer to Base64 string
	return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Gets the user's ID, which is the Base64-encoded SPKI public key.
 * Generates a new key pair if one doesn't exist.
 */
export async function getUserId(keyName: string): Promise<string> {
	let publicKey = await getPublicKey(keyName);
	if (!publicKey) {
		const keyPair = await generateKeys();
		await storeKeyPair(keyName, keyPair);
		publicKey = keyPair.publicKey;
	}
	const spki = await window.crypto.subtle.exportKey('spki', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(spki)));
}
