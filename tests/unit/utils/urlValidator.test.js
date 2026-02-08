/**
 * URL Validator Unit Tests
 * Issue #345: Prevent SSRF attacks on webhook URLs
 * Tests for SSRF protection in webhook URL validation
 */

const { validateWebhookUrl, isWebhookUrlSafe, BLOCKED_HOSTS } = require('../../../utils/urlValidator');

describe('URL Validator - SSRF Protection', () => {
  describe('validateWebhookUrl', () => {
    describe('Valid URLs', () => {
      it('should accept valid HTTPS URLs', () => {
        const result = validateWebhookUrl('https://api.example.com/webhook');
        expect(result).toBe('https://api.example.com/webhook');
      });

      it('should accept valid HTTP URLs in non-production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const result = validateWebhookUrl('http://api.example.com/webhook');
        expect(result).toBe('http://api.example.com/webhook');

        process.env.NODE_ENV = originalEnv;
      });

      it('should accept URLs with paths', () => {
        const result = validateWebhookUrl('https://api.example.com/v1/webhooks/receive');
        expect(result).toBe('https://api.example.com/v1/webhooks/receive');
      });

      it('should accept URLs with query parameters', () => {
        const result = validateWebhookUrl('https://api.example.com/webhook?token=abc');
        expect(result).toBe('https://api.example.com/webhook?token=abc');
      });

      it('should accept URLs with standard ports', () => {
        const result = validateWebhookUrl('https://api.example.com:443/webhook');
        expect(result).toBe('https://api.example.com/webhook'); // Port 443 is normalized
      });

      it('should accept URLs with custom allowed ports', () => {
        const result = validateWebhookUrl('https://api.example.com:8443/webhook');
        expect(result).toBe('https://api.example.com:8443/webhook');
      });
    });

    describe('Invalid URL format', () => {
      it('should reject malformed URLs', () => {
        expect(() => validateWebhookUrl('not-a-url')).toThrow('Invalid URL format');
      });

      it('should reject empty strings', () => {
        expect(() => validateWebhookUrl('')).toThrow('URL is required');
      });

      it('should reject null', () => {
        expect(() => validateWebhookUrl(null)).toThrow('URL is required');
      });

      it('should reject undefined', () => {
        expect(() => validateWebhookUrl(undefined)).toThrow('URL is required');
      });

      it('should reject non-string types', () => {
        expect(() => validateWebhookUrl(12345)).toThrow('URL is required');
      });
    });

    describe('Protocol restrictions', () => {
      it('should reject FTP protocol', () => {
        expect(() => validateWebhookUrl('ftp://ftp.example.com/file')).toThrow('Only HTTP/HTTPS protocols allowed');
      });

      it('should reject file protocol', () => {
        expect(() => validateWebhookUrl('file:///etc/passwd')).toThrow('Only HTTP/HTTPS protocols allowed');
      });

      it('should reject javascript protocol', () => {
        expect(() => validateWebhookUrl('javascript:alert(1)')).toThrow('Only HTTP/HTTPS protocols allowed');
      });

      it('should reject data protocol', () => {
        expect(() => validateWebhookUrl('data:text/html,<h1>test</h1>')).toThrow('Only HTTP/HTTPS protocols allowed');
      });

      it('should reject gopher protocol', () => {
        expect(() => validateWebhookUrl('gopher://example.com/')).toThrow('Only HTTP/HTTPS protocols allowed');
      });
    });

    describe('HTTPS enforcement in production', () => {
      it('should reject HTTP in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        expect(() => validateWebhookUrl('http://api.example.com/webhook')).toThrow('Only HTTPS allowed in production');

        process.env.NODE_ENV = originalEnv;
      });

      it('should accept HTTPS in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const result = validateWebhookUrl('https://api.example.com/webhook');
        expect(result).toBe('https://api.example.com/webhook');

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Localhost blocking', () => {
      it('should block localhost', () => {
        expect(() => validateWebhookUrl('https://localhost/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block LOCALHOST (case insensitive)', () => {
        expect(() => validateWebhookUrl('https://LOCALHOST/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block localhost subdomains', () => {
        expect(() => validateWebhookUrl('https://api.localhost/webhook')).toThrow('Internal URLs not allowed');
      });
    });

    describe('Loopback IP blocking', () => {
      it('should block 127.0.0.1', () => {
        expect(() => validateWebhookUrl('https://127.0.0.1/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block 127.0.0.2', () => {
        expect(() => validateWebhookUrl('https://127.0.0.2/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block 127.255.255.255', () => {
        expect(() => validateWebhookUrl('https://127.255.255.255/webhook')).toThrow('Internal URLs not allowed');
      });
    });

    describe('Private network blocking', () => {
      it('should block 10.x.x.x (Class A)', () => {
        expect(() => validateWebhookUrl('https://10.0.0.1/webhook')).toThrow('Internal URLs not allowed');
        expect(() => validateWebhookUrl('https://10.255.255.255/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block 172.16-31.x.x (Class B)', () => {
        expect(() => validateWebhookUrl('https://172.16.0.1/webhook')).toThrow('Internal URLs not allowed');
        expect(() => validateWebhookUrl('https://172.31.255.255/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should allow 172.15.x.x (not private range)', () => {
        // Note: 172.15.x.x is public IP range
        const result = validateWebhookUrl('https://172.15.0.1/webhook');
        expect(result).toBe('https://172.15.0.1/webhook');
      });

      it('should allow 172.32.x.x (not private range)', () => {
        // Note: 172.32.x.x is public IP range
        const result = validateWebhookUrl('https://172.32.0.1/webhook');
        expect(result).toBe('https://172.32.0.1/webhook');
      });

      it('should block 192.168.x.x (Class C)', () => {
        expect(() => validateWebhookUrl('https://192.168.0.1/webhook')).toThrow('Internal URLs not allowed');
        expect(() => validateWebhookUrl('https://192.168.255.255/webhook')).toThrow('Internal URLs not allowed');
      });
    });

    describe('Link-local address blocking (AWS/Cloud metadata)', () => {
      it('should block 169.254.x.x (link-local)', () => {
        expect(() => validateWebhookUrl('https://169.254.169.254/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block AWS metadata service IP', () => {
        expect(() => validateWebhookUrl('http://169.254.169.254/latest/meta-data/')).toThrow('Internal URLs not allowed');
      });
    });

    describe('Special network blocking', () => {
      it('should block 0.x.x.x (this network)', () => {
        expect(() => validateWebhookUrl('https://0.0.0.0/webhook')).toThrow('Internal URLs not allowed');
      });
    });

    describe('Internal domain blocking', () => {
      it('should block .local domains', () => {
        expect(() => validateWebhookUrl('https://server.local/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block .internal domains', () => {
        expect(() => validateWebhookUrl('https://api.internal/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block GCP metadata service', () => {
        expect(() => validateWebhookUrl('http://metadata.google.internal/computeMetadata/v1/')).toThrow('Internal URLs not allowed');
      });

      it('should block AWS EC2 metadata', () => {
        expect(() => validateWebhookUrl('http://instance-data.ec2.internal/')).toThrow('Internal URLs not allowed');
      });
    });

    describe('IPv6 blocking', () => {
      it('should block IPv6 loopback [::1]', () => {
        expect(() => validateWebhookUrl('https://[::1]/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block IPv6 private fc00:', () => {
        expect(() => validateWebhookUrl('https://[fc00::1]/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block IPv6 link-local fe80:', () => {
        expect(() => validateWebhookUrl('https://[fe80::1]/webhook')).toThrow('Internal URLs not allowed');
      });

      it('should block IPv6 unique local fd00:', () => {
        expect(() => validateWebhookUrl('https://[fd00::1]/webhook')).toThrow('Internal URLs not allowed');
      });
    });

    describe('URL credentials blocking', () => {
      it('should block URLs with username', () => {
        expect(() => validateWebhookUrl('https://user@example.com/webhook')).toThrow('URLs with credentials not allowed');
      });

      it('should block URLs with username and password', () => {
        expect(() => validateWebhookUrl('https://user:pass@example.com/webhook')).toThrow('URLs with credentials not allowed');
      });
    });

    describe('Restricted port blocking', () => {
      it('should block SSH port 22', () => {
        expect(() => validateWebhookUrl('https://example.com:22/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should block Telnet port 23', () => {
        expect(() => validateWebhookUrl('https://example.com:23/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should block SMTP port 25', () => {
        expect(() => validateWebhookUrl('https://example.com:25/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should block POP3 port 110', () => {
        expect(() => validateWebhookUrl('https://example.com:110/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should block IMAP port 143', () => {
        expect(() => validateWebhookUrl('https://example.com:143/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should block LDAP port 389', () => {
        expect(() => validateWebhookUrl('https://example.com:389/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should block LDAPS port 636', () => {
        expect(() => validateWebhookUrl('https://example.com:636/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should block RDP port 3389', () => {
        expect(() => validateWebhookUrl('https://example.com:3389/webhook')).toThrow('URLs with restricted ports not allowed');
      });

      it('should allow standard web ports', () => {
        expect(validateWebhookUrl('https://example.com:80/webhook')).toBe('https://example.com:80/webhook');
        expect(validateWebhookUrl('https://example.com:8080/webhook')).toBe('https://example.com:8080/webhook');
      });
    });
  });

  describe('isWebhookUrlSafe', () => {
    it('should return true for valid URLs', () => {
      expect(isWebhookUrlSafe('https://api.example.com/webhook')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isWebhookUrlSafe('not-a-url')).toBe(false);
    });

    it('should return false for localhost', () => {
      expect(isWebhookUrlSafe('https://localhost/webhook')).toBe(false);
    });

    it('should return false for private IPs', () => {
      expect(isWebhookUrlSafe('https://192.168.1.1/webhook')).toBe(false);
    });
  });

  describe('BLOCKED_HOSTS patterns', () => {
    it('should have patterns exported', () => {
      expect(BLOCKED_HOSTS).toBeDefined();
      expect(Array.isArray(BLOCKED_HOSTS)).toBe(true);
      expect(BLOCKED_HOSTS.length).toBeGreaterThan(0);
    });

    it('all patterns should be RegExp', () => {
      BLOCKED_HOSTS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });
  });
});
