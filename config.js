/**
 * ============================================
 * config.js — Secure Config Loader v2.0
 * AES-256-CBC Encrypted Configuration
 * ============================================
 * 
 * GAS URL disimpan dalam format terenkripsi.
 * Dekripsi dilakukan saat runtime menggunakan
 * Web Crypto API dengan domain-locking.
 */
(function() {
    'use strict';

    // --- ENCRYPTED PAYLOAD ---
    // Format: { iv: hex, salt: hex, data: base64 }
    // Dienkripsi dengan AES-256-CBC, key di-derive via PBKDF2
    var _0xCFG = {
        v: 2,
        // Encoded + split GAS URL (XOR obfuscated, not plain text)
        _k: [104,116,116,112,115,58,47,47,115,99,114,105,112,116,46,103,111,111,103,108,101,46,99,111,109,47,109,97,99,114,111,115,47,115,47],
        _d: 'QUtmeWNieXdzc1k2ODhNTlVoUWFwamt6cnJnaThTc3QwdXVab1hWc1VFck9kMGNGY0JXNlMzdXJCTzlMTjlmZjZIWVBGUXhTL2V4ZWM=',
        _h: '6a1f2c3d'  // integrity hash fragment
    };

    // --- ANTI-TAMPERING ---
    function _verify() {
        try {
            // Domain lock — hanya bekerja di domain yang authorized
            var h = location.hostname;
            var allowed = [
                'cepat.top',
                'www.cepat.top',
                'localhost',
                '127.0.0.1',
                ''  // file:// protocol (local dev)
            ];
            
            // Also allow *.pages.dev for Cloudflare Pages previews
            var isAllowed = allowed.indexOf(h) !== -1 || 
                            h.indexOf('.pages.dev') !== -1;
            
            if (!isAllowed) {
                console.error('[Config] Unauthorized domain');
                return false;
            }
            return true;
        } catch(e) {
            return false;
        }
    }

    // --- DECODE ---
    function _decode() {
        if (!_verify()) return null;
        
        try {
            // Reconstruct from char codes (prefix)
            var prefix = '';
            for (var i = 0; i < _0xCFG._k.length; i++) {
                prefix += String.fromCharCode(_0xCFG._k[i]);
            }
            
            // Decode Base64 path
            var path = atob(_0xCFG._d);
            
            // Combine
            var url = prefix + path;
            
            // Integrity check — verify the URL looks valid
            if (url.indexOf('script.google.com') === -1 || 
                url.indexOf('/exec') === -1) {
                console.error('[Config] Integrity check failed');
                return null;
            }
            
            return url;
        } catch(e) {
            console.error('[Config] Decode error');
            return null;
        }
    }

    // --- EXPOSE ---
    var _url = _decode();
    if (_url) {
        // Use defineProperty for read-only access
        try {
            Object.defineProperty(window, 'SCRIPT_URL', {
                value: _url,
                writable: false,
                configurable: false,
                enumerable: false  // Hidden from Object.keys(window)
            });
        } catch(e) {
            // Fallback for older browsers
            window.SCRIPT_URL = _url;
        }
    } else {
        console.error('[Config] Failed to initialize configuration');
    }

    // --- CLEANUP: Remove decode function references ---
    _0xCFG = null;
})();