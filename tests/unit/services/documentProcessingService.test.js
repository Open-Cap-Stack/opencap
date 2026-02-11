/**
 * Document Processing Service Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Comprehensive test coverage for document processing functionality including
 * text extraction, preprocessing, language detection, and entity extraction
 */

const generateObjectId = () => { const hex = '0123456789abcdef'; let id = ''; for(let i=0;i<24;i++) id += hex[Math.floor(Math.random()*16)]; return id; };

// Mock dependencies before requiring the service
jest.mock('../../../services/zerodbService');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn()
  }
}));

const fs = require('fs').promises;
const zerodbService = require('../../../services/zerodbService');

describe('DocumentProcessingService', () => {
  let DocumentProcessingService;
  let mockDocumentId;

  beforeAll(async () => {
    DocumentProcessingService = require('../../../services/documentProcessingService');
    mockDocumentId = generateObjectId();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractText', () => {
    it('should extract text from plain text content', async () => {
      const textContent = 'This is a sample document with some text content.';

      const result = await DocumentProcessingService.extractText(textContent, 'text/plain');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('characterCount');
      expect(result.text).toBe(textContent);
    });

    it('should extract text from PDF content (mocked)', async () => {
      const pdfBuffer = Buffer.from('Mock PDF content');

      const result = await DocumentProcessingService.extractText(pdfBuffer, 'application/pdf');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('mimeType');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should extract text from DOCX content (mocked)', async () => {
      const docxBuffer = Buffer.from('Mock DOCX content');

      const result = await DocumentProcessingService.extractText(docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('mimeType');
    });

    it('should extract text from image content using OCR (mocked)', async () => {
      const imageBuffer = Buffer.from('Mock image content');

      const result = await DocumentProcessingService.extractText(imageBuffer, 'image/png');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('mimeType');
      expect(result.mimeType).toBe('image/png');
    });

    it('should handle empty content', async () => {
      const result = await DocumentProcessingService.extractText('', 'text/plain');

      expect(result.text).toBe('');
      expect(result.wordCount).toBe(0);
    });

    it('should handle null content gracefully', async () => {
      await expect(
        DocumentProcessingService.extractText(null, 'text/plain')
      ).rejects.toThrow('Content cannot be null or undefined');
    });

    it('should throw error for unsupported mime type', async () => {
      await expect(
        DocumentProcessingService.extractText('content', 'application/x-unknown')
      ).rejects.toThrow('Unsupported file type');
    });

    it('should count words correctly', async () => {
      const textContent = 'One two three four five';

      const result = await DocumentProcessingService.extractText(textContent, 'text/plain');

      expect(result.wordCount).toBe(5);
    });

    it('should count characters correctly', async () => {
      const textContent = 'Hello';

      const result = await DocumentProcessingService.extractText(textContent, 'text/plain');

      expect(result.characterCount).toBe(5);
    });

    it('should include extraction timestamp', async () => {
      const result = await DocumentProcessingService.extractText('Some text', 'text/plain');

      expect(result).toHaveProperty('extractedAt');
      expect(new Date(result.extractedAt)).toBeInstanceOf(Date);
    });
  });

  describe('preprocessText', () => {
    it('should normalize whitespace', async () => {
      const text = 'This   has   multiple   spaces';

      const result = await DocumentProcessingService.preprocessText(text);

      expect(result.text).toBe('This has multiple spaces');
    });

    it('should trim leading and trailing whitespace', async () => {
      const text = '   Trimmed text   ';

      const result = await DocumentProcessingService.preprocessText(text);

      expect(result.text).toBe('Trimmed text');
    });

    it('should handle newlines and tabs', async () => {
      const text = 'Line 1\n\n\nLine 2\t\tLine 3';

      const result = await DocumentProcessingService.preprocessText(text);

      expect(result.text).not.toContain('\n\n\n');
      expect(result.text).not.toContain('\t\t');
    });

    it('should optionally convert to lowercase', async () => {
      const text = 'UPPERCASE TEXT';

      const result = await DocumentProcessingService.preprocessText(text, { toLowerCase: true });

      expect(result.text).toBe('uppercase text');
    });

    it('should optionally remove special characters', async () => {
      const text = 'Text with @#$% special chars!';

      const result = await DocumentProcessingService.preprocessText(text, { removeSpecialChars: true });

      expect(result.text).not.toMatch(/[@#$%]/);
    });

    it('should optionally remove numbers', async () => {
      const text = 'Text with 123 numbers 456';

      const result = await DocumentProcessingService.preprocessText(text, { removeNumbers: true });

      expect(result.text).not.toMatch(/\d/);
    });

    it('should handle empty string', async () => {
      const result = await DocumentProcessingService.preprocessText('');

      expect(result.text).toBe('');
    });

    it('should preserve case by default', async () => {
      const text = 'Mixed CASE Text';

      const result = await DocumentProcessingService.preprocessText(text);

      expect(result.text).toBe('Mixed CASE Text');
    });

    it('should remove HTML tags when option is set', async () => {
      const text = '<p>Paragraph with <strong>bold</strong> text</p>';

      const result = await DocumentProcessingService.preprocessText(text, { removeHtml: true });

      expect(result.text).not.toContain('<p>');
      expect(result.text).not.toContain('<strong>');
      expect(result.text).toContain('Paragraph');
      expect(result.text).toContain('bold');
    });

    it('should track preprocessing operations applied', async () => {
      const result = await DocumentProcessingService.preprocessText('text', {
        toLowerCase: true,
        removeSpecialChars: true
      });

      expect(result.operationsApplied).toContain('toLowerCase');
      expect(result.operationsApplied).toContain('removeSpecialChars');
    });
  });

  describe('detectLanguage', () => {
    it('should detect English language', async () => {
      const text = 'This is a sample English text for language detection.';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('confidence');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect Spanish language', async () => {
      const text = 'Este es un texto de ejemplo en espanol para detectar el idioma.';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result.language).toBe('es');
    });

    it('should detect French language', async () => {
      const text = 'Ceci est un exemple de texte en francais pour la detection de langue.';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result.language).toBe('fr');
    });

    it('should detect German language', async () => {
      const text = 'Dies ist ein Beispieltext auf Deutsch zur Spracherkennung.';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result.language).toBe('de');
    });

    it('should return confidence score between 0 and 1', async () => {
      const text = 'Sample text for confidence measurement';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle short text with lower confidence', async () => {
      const text = 'Hi';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result).toHaveProperty('language');
      expect(result.confidence).toBeLessThan(0.9);
    });

    it('should handle empty text', async () => {
      const result = await DocumentProcessingService.detectLanguage('');

      expect(result.language).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should detect multiple possible languages with probabilities', async () => {
      const text = 'A text that could be multiple languages';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result).toHaveProperty('alternatives');
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it('should handle mixed language text', async () => {
      const text = 'Hello world, bonjour le monde, hola mundo';

      const result = await DocumentProcessingService.detectLanguage(text);

      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('isMultilingual');
    });
  });

  describe('extractEntities', () => {
    it('should extract company names', async () => {
      const text = 'Apple Inc. and Microsoft Corporation are technology companies.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result).toHaveProperty('entities');
      expect(result.entities).toHaveProperty('companies');
      expect(result.entities.companies).toContainEqual(expect.objectContaining({
        name: expect.any(String),
        type: 'COMPANY'
      }));
    });

    it('should extract person names', async () => {
      const text = 'John Smith and Jane Doe are the board members.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('people');
      expect(result.entities.people.length).toBeGreaterThan(0);
    });

    it('should extract dates', async () => {
      const text = 'The meeting is scheduled for January 15, 2024 and February 28, 2024.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('dates');
      expect(result.entities.dates.length).toBeGreaterThan(0);
    });

    it('should extract monetary amounts', async () => {
      const text = 'The investment was $10,000,000 with a valuation of $500 million.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('money');
      expect(result.entities.money.length).toBeGreaterThan(0);
    });

    it('should extract percentages', async () => {
      const text = 'The company owns 25% of the shares with a 10.5% annual return.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('percentages');
      expect(result.entities.percentages.length).toBeGreaterThan(0);
    });

    it('should extract locations', async () => {
      const text = 'The headquarters is in San Francisco, California, USA.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('locations');
      expect(result.entities.locations.length).toBeGreaterThan(0);
    });

    it('should extract email addresses', async () => {
      const text = 'Contact us at info@company.com or support@company.org.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('emails');
      expect(result.entities.emails).toContain('info@company.com');
    });

    it('should extract phone numbers', async () => {
      const text = 'Call us at (555) 123-4567 or +1-800-555-0123.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('phoneNumbers');
      expect(result.entities.phoneNumbers.length).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const result = await DocumentProcessingService.extractEntities('');

      expect(result.entities.companies).toHaveLength(0);
      expect(result.entities.people).toHaveLength(0);
      expect(result.entities.dates).toHaveLength(0);
    });

    it('should return entity positions in text', async () => {
      const text = 'Apple Inc. is a company.';

      const result = await DocumentProcessingService.extractEntities(text);

      const company = result.entities.companies[0];
      if (company) {
        expect(company).toHaveProperty('startIndex');
        expect(company).toHaveProperty('endIndex');
      }
    });

    it('should calculate confidence scores for entities', async () => {
      const text = 'John Smith works at Microsoft.';

      const result = await DocumentProcessingService.extractEntities(text);

      result.entities.people.forEach(person => {
        expect(person).toHaveProperty('confidence');
        expect(person.confidence).toBeGreaterThanOrEqual(0);
        expect(person.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should extract legal terms and references', async () => {
      const text = 'Under Section 409A of the Internal Revenue Code and Delaware General Corporation Law.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('legalReferences');
    });

    it('should extract stock tickers', async () => {
      const text = 'Invest in AAPL, GOOGL, and MSFT stocks.';

      const result = await DocumentProcessingService.extractEntities(text);

      expect(result.entities).toHaveProperty('stockTickers');
      expect(result.entities.stockTickers).toContain('AAPL');
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Simulate an error condition
      await expect(
        DocumentProcessingService.extractText(undefined, 'text/plain')
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await DocumentProcessingService.extractText(null, 'text/plain');
      } catch (error) {
        expect(error.message).toContain('null');
      }
    });

    it('should handle corrupted file content', async () => {
      const corruptedBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);

      const result = await DocumentProcessingService.extractText(corruptedBuffer, 'application/pdf');

      // Should return empty or error result, not crash
      expect(result).toHaveProperty('text');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple documents', async () => {
      const documents = [
        { id: '1', content: 'Document 1 content', mimeType: 'text/plain' },
        { id: '2', content: 'Document 2 content', mimeType: 'text/plain' }
      ];

      const result = await DocumentProcessingService.processBatch(documents);

      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('failed');
      expect(result.processed).toBe(2);
    });

    it('should handle partial failures in batch', async () => {
      const documents = [
        { id: '1', content: 'Valid content', mimeType: 'text/plain' },
        { id: '2', content: null, mimeType: 'text/plain' }
      ];

      const result = await DocumentProcessingService.processBatch(documents);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should track progress for batch processing', async () => {
      const documents = [
        { id: '1', content: 'Content 1', mimeType: 'text/plain' },
        { id: '2', content: 'Content 2', mimeType: 'text/plain' },
        { id: '3', content: 'Content 3', mimeType: 'text/plain' }
      ];

      const progressUpdates = [];
      const onProgress = (progress) => progressUpdates.push(progress);

      await DocumentProcessingService.processBatch(documents, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
  });

  describe('Supported File Types', () => {
    it('should return list of supported mime types', () => {
      const supportedTypes = DocumentProcessingService.getSupportedMimeTypes();

      expect(Array.isArray(supportedTypes)).toBe(true);
      expect(supportedTypes).toContain('text/plain');
      expect(supportedTypes).toContain('application/pdf');
      expect(supportedTypes).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(supportedTypes).toContain('image/png');
      expect(supportedTypes).toContain('image/jpeg');
    });

    it('should validate mime type support', () => {
      expect(DocumentProcessingService.isSupportedMimeType('text/plain')).toBe(true);
      expect(DocumentProcessingService.isSupportedMimeType('application/x-unknown')).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should process large text efficiently', async () => {
      const largeText = 'Lorem ipsum dolor sit amet. '.repeat(10000);

      const startTime = Date.now();
      const result = await DocumentProcessingService.extractText(largeText, 'text/plain');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should handle concurrent processing', async () => {
      const texts = Array(10).fill('Sample text for concurrent processing');

      const promises = texts.map(text =>
        DocumentProcessingService.extractText(text, 'text/plain')
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toHaveProperty('text');
      });
    });
  });
});
